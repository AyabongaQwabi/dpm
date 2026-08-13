import { describe, expect, it } from 'vitest'
import { createZip, crc32, dedupeNames } from '../zip'

const encoder = new TextEncoder()

function u32(bytes: Uint8Array, offset: number): number {
  return new DataView(bytes.buffer, bytes.byteOffset).getUint32(offset, true)
}

describe('crc32', () => {
  it('matches the known CRC-32 of "123456789"', () => {
    expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926)
  })

  it('is 0 for empty input', () => {
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe('dedupeNames', () => {
  it('leaves distinct names alone', () => {
    expect(dedupeNames(['a.pdf', 'b.pdf'])).toEqual(['a.pdf', 'b.pdf'])
  })

  it('disambiguates duplicates before the extension', () => {
    expect(dedupeNames(['quote.pdf', 'quote.pdf', 'quote.pdf'])).toEqual([
      'quote.pdf',
      'quote (1).pdf',
      'quote (2).pdf',
    ])
  })

  it('handles names with no extension', () => {
    expect(dedupeNames(['README', 'README'])).toEqual(['README', 'README (1)'])
  })
})

describe('createZip', () => {
  it('writes a valid local header and end-of-central-directory signature', () => {
    const zip = createZip([{ name: 'a.txt', data: encoder.encode('hello') }])

    expect(u32(zip, 0)).toBe(0x04034b50) // local file header
    expect(u32(zip, zip.length - 22)).toBe(0x06054b50) // EOCD
  })

  it('stores the payload uncompressed and intact', () => {
    const payload = encoder.encode('hello world')
    const zip = createZip([{ name: 'a.txt', data: payload }])

    // 30-byte local header + 5-byte name, then the raw bytes.
    const start = 30 + 'a.txt'.length
    expect(Array.from(zip.slice(start, start + payload.length))).toEqual(Array.from(payload))
  })

  it('records the entry count in the end-of-central-directory record', () => {
    const zip = createZip([
      { name: 'a.txt', data: encoder.encode('a') },
      { name: 'b.txt', data: encoder.encode('b') },
      { name: 'c.txt', data: encoder.encode('c') },
    ])

    const eocd = zip.length - 22
    const view = new DataView(zip.buffer, zip.byteOffset)
    expect(view.getUint16(eocd + 8, true)).toBe(3)
    expect(view.getUint16(eocd + 10, true)).toBe(3)
  })

  it('deduplicates entry names so an archive extracts predictably', () => {
    const zip = createZip([
      { name: 'quote.pdf', data: encoder.encode('one') },
      { name: 'quote.pdf', data: encoder.encode('two') },
    ])

    expect(new TextDecoder().decode(zip)).toContain('quote (1).pdf')
  })

  it('produces a well-formed empty archive', () => {
    const zip = createZip([])
    expect(zip.length).toBe(22)
    expect(u32(zip, 0)).toBe(0x06054b50)
  })
})
