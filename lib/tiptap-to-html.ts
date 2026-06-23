// Lightweight Tiptap JSON → HTML converter for server-side rendering.
// Covers the node/mark types used by ArticleEditor: StarterKit + Image + YouTube + Link.

interface TiptapNode {
  type: string
  attrs?: Record<string, unknown>
  content?: TiptapNode[]
  marks?: TiptapMark[]
  text?: string
}

interface TiptapMark {
  type: string
  attrs?: Record<string, unknown>
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function applyMarks(text: string, marks: TiptapMark[] = []): string {
  let result = escapeHtml(text)
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold': result = `<strong>${result}</strong>`; break
      case 'italic': result = `<em>${result}</em>`; break
      case 'strike': result = `<s>${result}</s>`; break
      case 'code': result = `<code>${result}</code>`; break
      case 'link': {
        const href = escapeHtml(String(mark.attrs?.href ?? ''))
        const target = mark.attrs?.target ? ` target="${escapeHtml(String(mark.attrs.target))}"` : ''
        result = `<a href="${href}"${target} rel="noopener noreferrer">${result}</a>`
        break
      }
    }
  }
  return result
}

function renderNodes(nodes: TiptapNode[] = []): string {
  return nodes.map(renderNode).join('')
}

function renderNode(node: TiptapNode): string {
  switch (node.type) {
    case 'doc':
      return renderNodes(node.content)

    case 'paragraph':
      return `<p>${renderNodes(node.content)}</p>`

    case 'heading': {
      const level = Number(node.attrs?.level ?? 2)
      return `<h${level}>${renderNodes(node.content)}</h${level}>`
    }

    case 'text':
      return applyMarks(node.text ?? '', node.marks)

    case 'hardBreak':
      return '<br>'

    case 'bulletList':
      return `<ul>${renderNodes(node.content)}</ul>`

    case 'orderedList':
      return `<ol>${renderNodes(node.content)}</ol>`

    case 'listItem':
      return `<li>${renderNodes(node.content)}</li>`

    case 'blockquote':
      return `<blockquote>${renderNodes(node.content)}</blockquote>`

    case 'codeBlock':
      return `<pre><code>${renderNodes(node.content)}</code></pre>`

    case 'horizontalRule':
      return '<hr>'

    case 'image': {
      const src = escapeHtml(String(node.attrs?.src ?? ''))
      const alt = escapeHtml(String(node.attrs?.alt ?? ''))
      return `<img src="${src}" alt="${alt}" loading="lazy">`
    }

    case 'youtube': {
      const src = String(node.attrs?.src ?? '')
      // Convert watch URL to embed URL if needed
      const embedUrl = src
        .replace('watch?v=', 'embed/')
        .replace('youtu.be/', 'www.youtube.com/embed/')
      return `<div class="aspect-video my-6"><iframe src="${escapeHtml(embedUrl)}" allowfullscreen class="w-full h-full rounded-lg"></iframe></div>`
    }

    default:
      return renderNodes(node.content)
  }
}

export function tiptapToHtml(json: unknown): string {
  if (!json || typeof json !== 'object') return ''
  return renderNode(json as TiptapNode)
}
