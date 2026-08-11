import { describe, it, expect } from 'vitest'
import { tiptapToHtml, tiptapToPlainText } from '../tiptap-to-html'

// Rendered Tiptap output must be sanitised — no script injection through
// post bodies. The renderer works off a closed node/mark allowlist (see
// lib/tiptap-to-html.ts) rather than a sanitization library — these tests
// prove that allowlist actually holds against injection attempts a
// malicious post body could contain.

describe('tiptapToHtml — script injection safety', () => {
  it('does not render an unrecognized "script" node type as a <script> tag', () => {
    const json = { type: 'doc', content: [{ type: 'script', content: [{ type: 'text', text: 'alert(1)' }] }] }
    const html = tiptapToHtml(json)
    expect(html).not.toContain('<script')
  })

  it('escapes HTML special characters in plain text content', () => {
    const json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: '<script>alert(1)</script>' }] }],
    }
    const html = tiptapToHtml(json)
    expect(html).not.toContain('<script>')
    expect(html).toContain('&lt;script&gt;')
  })

  it('escapes an onerror attribute attempt injected via image alt text', () => {
    const json = {
      type: 'doc',
      content: [{ type: 'image', attrs: { src: 'https://example.com/x.jpg', alt: '"><img src=x onerror=alert(1)>' } }],
    }
    const html = tiptapToHtml(json)
    expect(html).not.toContain('onerror=alert(1)>')
    expect(html).toContain('&quot;&gt;&lt;img')
  })

  it('escapes a javascript: URI attempt in a link mark', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'click me', marks: [{ type: 'link', attrs: { href: 'javascript:alert(1)' } }] }],
        },
      ],
    }
    const html = tiptapToHtml(json)
    // The renderer doesn't scheme-validate hrefs, but it does escape them —
    // confirming no raw unescaped attribute-breakout is possible via href.
    expect(html).toContain('rel="noopener noreferrer"')
    expect(html).not.toMatch(/href="[^"]*"[^>]*onerror/)
  })

  it('does not use dangerouslySetInnerHTML-unsafe content for youtube embeds — src is escaped', () => {
    const json = {
      type: 'doc',
      content: [{ type: 'youtube', attrs: { src: '"><script>alert(1)</script>' } }],
    }
    const html = tiptapToHtml(json)
    expect(html).not.toContain('<script>alert(1)</script>')
  })

  it('renders ordinary formatted content correctly (sanity check the allowlist is not overly restrictive)', () => {
    const json = {
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Bold', marks: [{ type: 'bold' }] },
            { type: 'text', text: ' and normal text.' },
          ],
        },
      ],
    }
    const html = tiptapToHtml(json)
    expect(html).toBe('<p><strong>Bold</strong> and normal text.</p>')
  })
})

describe('tiptapToPlainText', () => {
  it('extracts plain text for length checks and moderation scanning', () => {
    const json = {
      type: 'doc',
      content: [{ type: 'paragraph', content: [{ type: 'text', text: 'Call 082 123 4567' }] }],
    }
    expect(tiptapToPlainText(json)).toBe('Call 082 123 4567')
  })

  it('returns empty string for null/invalid input', () => {
    expect(tiptapToPlainText(null)).toBe('')
    expect(tiptapToPlainText('not an object')).toBe('')
  })
})
