import Script from 'next/script'

interface JsonLdProps {
  data: Record<string, unknown> | Record<string, unknown>[]
}

function hashJsonLd(value: string): string {
  let hash = 0
  for (let i = 0; i < value.length; i += 1) {
    hash = Math.imul(31, hash) + value.charCodeAt(i)
    hash |= 0
  }
  return Math.abs(hash).toString(36)
}

export function JsonLd({ data }: JsonLdProps) {
  const json = JSON.stringify(data)

  return (
    <Script
      id={`json-ld-${hashJsonLd(json)}`}
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  )
}
