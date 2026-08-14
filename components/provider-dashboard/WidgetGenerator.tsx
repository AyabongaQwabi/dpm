'use client'

import { useEffect, useRef, useState } from 'react'
import { EMBED_MODES, type EmbedMode } from '@/lib/embed-config'

const MODE_LABELS: Record<EmbedMode, string> = {
  services: 'Services list',
  card: 'Profile card',
  reviews: 'Reviews',
}

const MODE_DESCRIPTIONS: Record<EmbedMode, string> = {
  services: 'Your bookable services with prices (or "Get a custom quote"), each with a Book button.',
  card: 'A compact card with your rating, city, and service count, linking to your full profile.',
  reviews: 'A scrolling list of your verified-booking reviews, or a small always-visible rating badge.',
}

interface WidgetStats {
  windowDays: number
  loads: number
  clicks: number
  byOriginDomain: { domain: string; count: number }[]
}

interface WidgetGeneratorProps {
  providerId: string
  siteUrl: string
  stats: WidgetStats
}

export function WidgetGenerator({ providerId, siteUrl, stats }: WidgetGeneratorProps) {
  const [mode, setMode] = useState<EmbedMode>('services')
  const [reviewsVariant, setReviewsVariant] = useState<'default' | 'badge'>('default')
  const [accent, setAccent] = useState('#0F3329')
  const [radius, setRadius] = useState('12')
  const [copied, setCopied] = useState(false)
  const previewRef = useRef<HTMLDivElement>(null)

  const dataAttrs = [
    `data-provider="${providerId}"`,
    `data-mode="${mode}"`,
    mode === 'reviews' && reviewsVariant === 'badge' ? `data-variant="badge"` : null,
    `data-accent="${accent}"`,
    `data-radius="${radius}"`,
  ].filter(Boolean)

  const snippet = `<script src="${siteUrl}/embed/v1.js" ${dataAttrs.join(' ')} async></script>`

  useEffect(() => {
    const container = previewRef.current
    if (!container) return
    container.innerHTML = ''

    const script = document.createElement('script')
    script.src = `${siteUrl}/embed/v1.js`
    script.setAttribute('data-provider', providerId)
    script.setAttribute('data-mode', mode)
    if (mode === 'reviews' && reviewsVariant === 'badge') script.setAttribute('data-variant', 'badge')
    script.setAttribute('data-accent', accent)
    script.setAttribute('data-radius', radius)
    script.async = true
    container.appendChild(script)
  }, [providerId, siteUrl, mode, reviewsVariant, accent, radius])

  async function copySnippet() {
    try {
      await navigator.clipboard.writeText(snippet)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // Clipboard API can be unavailable (older browser, insecure context) —
      // the snippet is still visible and selectable in the <pre> below.
    }
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-12 space-y-10">
      <div>
        <h1 className="text-2xl font-bold mb-2">Widgets</h1>
        <p className="text-sm text-muted-foreground">
          Add a live ServicePros widget to your own website. Every booking still runs through the
          full ServicePros flow — payment, messaging, and reviews all stay on-platform.
        </p>
      </div>

      <section className="rounded-xl border bg-card px-5 py-4">
        <p className="text-sm font-semibold mb-3">
          Last {stats.windowDays} days
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <p className="text-2xl font-bold tabular-nums">{stats.loads}</p>
            <p className="text-xs text-muted-foreground">Widget loads</p>
          </div>
          <div>
            <p className="text-2xl font-bold tabular-nums">{stats.clicks}</p>
            <p className="text-xs text-muted-foreground">Book / quote / profile clicks</p>
          </div>
        </div>
        {stats.byOriginDomain.length > 0 ? (
          <div className="pt-3 border-t">
            <p className="text-xs font-medium text-muted-foreground mb-2">By site</p>
            <ul className="space-y-1">
              {stats.byOriginDomain.map((row) => (
                <li key={row.domain} className="flex items-center justify-between text-sm">
                  <span className="text-foreground">{row.domain}</span>
                  <span className="text-muted-foreground tabular-nums">{row.count}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground pt-3 border-t">
            No widget activity yet. Once you install a widget below, loads and clicks will show up here.
          </p>
        )}
      </section>

      <div className="grid lg:grid-cols-2 gap-8">
        <section className="space-y-5">
          <div>
            <label className="block text-sm font-medium mb-2">Mode</label>
            <div className="grid gap-2">
              {EMBED_MODES.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMode(m)}
                  className={[
                    'text-left rounded-lg border px-3 py-2.5 transition-colors',
                    mode === m ? 'border-primary bg-primary/5' : 'border-border hover:border-primary-accent/40',
                  ].join(' ')}
                >
                  <span className="block text-sm font-semibold">{MODE_LABELS[m]}</span>
                  <span className="block text-xs text-muted-foreground mt-0.5">{MODE_DESCRIPTIONS[m]}</span>
                </button>
              ))}
            </div>
          </div>

          {mode === 'reviews' && (
            <div>
              <label className="block text-sm font-medium mb-2">Reviews style</label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setReviewsVariant('default')}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${reviewsVariant === 'default' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  Scrolling list
                </button>
                <button
                  type="button"
                  onClick={() => setReviewsVariant('badge')}
                  className={`rounded-lg border px-3 py-1.5 text-sm ${reviewsVariant === 'badge' ? 'border-primary bg-primary/5' : 'border-border'}`}
                >
                  Rating badge
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <label className="block text-sm font-medium">
              Accent colour
              <input
                type="color"
                value={accent}
                onChange={(e) => setAccent(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-lg border"
              />
            </label>
            <label className="block text-sm font-medium">
              Corner radius
              <input
                type="number"
                min={0}
                max={24}
                value={radius}
                onChange={(e) => setRadius(e.target.value)}
                className="mt-1.5 h-9 w-full rounded-lg border px-3 text-sm"
              />
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Copy this into your site</label>
            <pre className="rounded-lg border bg-muted/40 px-3 py-3 text-xs overflow-x-auto whitespace-pre-wrap break-all">
              {snippet}
            </pre>
            <button
              type="button"
              onClick={copySnippet}
              className="mt-2 rounded-lg bg-primary-accent px-4 py-2 text-xs font-semibold text-primary-accent-foreground hover:opacity-90"
            >
              {copied ? 'Copied' : 'Copy snippet'}
            </button>
          </div>

          <div className="rounded-lg border bg-muted/20 px-4 py-3 text-xs text-muted-foreground space-y-2">
            <p className="font-semibold text-foreground">Install instructions</p>
            <p><span className="font-medium text-foreground">WordPress:</span> add a Custom HTML block (or edit your theme template) and paste the snippet where you want the widget to appear.</p>
            <p><span className="font-medium text-foreground">Wix:</span> add an &ldquo;Embed &amp; Custom Code&rdquo; element to your page and paste the snippet, set to run once when the page loads.</p>
            <p><span className="font-medium text-foreground">Squarespace:</span> add a Code Block to the section where you want the widget and paste the snippet.</p>
            <p>
              The widget renders directly on the page as a script — it does not use an iframe, so it
              is not compatible with page builders that only accept an iframe embed URL.
            </p>
          </div>
        </section>

        <section>
          <p className="block text-sm font-medium mb-2">Live preview</p>
          <div className="rounded-xl border bg-background p-6 min-h-40">
            <div ref={previewRef} />
          </div>
        </section>
      </div>
    </main>
  )
}
