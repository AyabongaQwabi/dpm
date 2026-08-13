/**
 * Minimal ZIP writer (STORE method — no compression).
 *
 * The provider needs "download every file on this booking as one zip". No zip
 * library is installed, and pulling one in for a single archive of
 * already-compressed uploads (images, PDFs) would add a dependency for very
 * little: STORE-mode entries are byte-for-byte copies wrapped in headers, and
 * every OS and browser opens them natively.
 *
 * Pure — takes bytes in, gives bytes out. No I/O, no framework imports.
 *
 * Deliberate limits: no ZIP64, so this is fine up to 4 GB total and 65,535
 * entries, both far above the per-booking upload quota.
 */

export interface ZipEntry {
  name: string
  data: Uint8Array
}

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let i = 0; i < 256; i++) {
    let c = i
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[i] = c >>> 0
  }
  return table
})()

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8)
  }
  return (crc ^ 0xffffffff) >>> 0
}

/**
 * Ensure every entry has a distinct name — a booking can easily carry two
 * files called "quote.pdf" from different requirements, and a zip with
 * duplicate names extracts unpredictably.
 */
export function dedupeNames(names: string[]): string[] {
  const seen = new Map<string, number>()

  return names.map((raw) => {
    const name = raw || 'file'
    const count = seen.get(name) ?? 0
    seen.set(name, count + 1)

    if (count === 0) return name

    const dot = name.lastIndexOf('.')
    return dot > 0
      ? `${name.slice(0, dot)} (${count})${name.slice(dot)}`
      : `${name} (${count})`
  })
}

export function createZip(entries: ZipEntry[]): Uint8Array {
  const encoder = new TextEncoder()
  const names = dedupeNames(entries.map((e) => e.name))

  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0
  let centralSize = 0

  entries.forEach((entry, index) => {
    const nameBytes = encoder.encode(names[index])
    const crc = crc32(entry.data)
    const size = entry.data.length

    // Local file header (30 bytes + name).
    const local = new Uint8Array(30 + nameBytes.length)
    const lv = new DataView(local.buffer)
    lv.setUint32(0, 0x04034b50, true) // signature
    lv.setUint16(4, 20, true) // version needed
    lv.setUint16(6, 0x0800, true) // UTF-8 filename flag
    lv.setUint16(8, 0, true) // STORE
    lv.setUint16(10, 0, true) // mod time
    lv.setUint16(12, 0, true) // mod date
    lv.setUint32(14, crc, true)
    lv.setUint32(18, size, true) // compressed size
    lv.setUint32(22, size, true) // uncompressed size
    lv.setUint16(26, nameBytes.length, true)
    lv.setUint16(28, 0, true) // extra length
    local.set(nameBytes, 30)

    localParts.push(local, entry.data)

    // Central directory header (46 bytes + name).
    const central = new Uint8Array(46 + nameBytes.length)
    const cv = new DataView(central.buffer)
    cv.setUint32(0, 0x02014b50, true)
    cv.setUint16(4, 20, true) // version made by
    cv.setUint16(6, 20, true) // version needed
    cv.setUint16(8, 0x0800, true)
    cv.setUint16(10, 0, true)
    cv.setUint16(12, 0, true)
    cv.setUint16(14, 0, true)
    cv.setUint32(16, crc, true)
    cv.setUint32(20, size, true)
    cv.setUint32(24, size, true)
    cv.setUint16(28, nameBytes.length, true)
    cv.setUint16(30, 0, true) // extra
    cv.setUint16(32, 0, true) // comment
    cv.setUint16(34, 0, true) // disk number
    cv.setUint16(36, 0, true) // internal attrs
    cv.setUint32(38, 0, true) // external attrs
    cv.setUint32(42, offset, true) // local header offset
    central.set(nameBytes, 46)

    centralParts.push(central)

    offset += local.length + size
    centralSize += central.length
  })

  // End of central directory (22 bytes).
  const end = new Uint8Array(22)
  const ev = new DataView(end.buffer)
  ev.setUint32(0, 0x06054b50, true)
  ev.setUint16(4, 0, true)
  ev.setUint16(6, 0, true)
  ev.setUint16(8, entries.length, true)
  ev.setUint16(10, entries.length, true)
  ev.setUint32(12, centralSize, true)
  ev.setUint32(16, offset, true)
  ev.setUint16(20, 0, true)

  const all = [...localParts, ...centralParts, end]
  const total = all.reduce((sum, part) => sum + part.length, 0)
  const output = new Uint8Array(total)

  let cursor = 0
  for (const part of all) {
    output.set(part, cursor)
    cursor += part.length
  }

  return output
}
