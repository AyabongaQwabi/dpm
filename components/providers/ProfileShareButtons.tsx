'use client'

import { useState } from 'react'
import { Copy, MessageCircle, Share2 } from 'lucide-react'
import { trackProviderEvent } from '@/components/analytics/ProviderAnalyticsTracker'

interface ProfileShareButtonsProps {
  providerId: string
  businessName: string
  profilePath: string
}

function absoluteUrl(path: string) {
  if (typeof window === 'undefined') return path
  return new URL(path, window.location.origin).toString()
}

export function ProfileShareButtons({
  providerId,
  businessName,
  profilePath,
}: ProfileShareButtonsProps) {
  const [copied, setCopied] = useState(false)
  const shareText = `View and book ${businessName} on ServicePros`

  function record(channel: string) {
    trackProviderEvent({
      providerId,
      eventType: 'profile_share_click',
      metadata: { channel },
    })
  }

  async function nativeShare() {
    record('native')
    const url = absoluteUrl(profilePath)
    if (navigator.share) {
      try {
        await navigator.share({ title: businessName, text: shareText, url })
      } catch {
        // User cancelled the native share sheet; no UI error needed.
      }
      return
    }
    await copyLink()
  }

  async function copyLink() {
    record('copy')
    await navigator.clipboard.writeText(absoluteUrl(profilePath))
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  const encodedUrl = encodeURIComponent(profilePath)
  const encodedText = encodeURIComponent(`${shareText}: ${profilePath}`)

  return (
    <div className="mt-5 flex flex-wrap items-center gap-2">
      <button
        type="button"
        onClick={nativeShare}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-foreground transition-colors hover:border-primary-accent/60 hover:bg-primary-accent/5"
      >
        <Share2 className="h-3.5 w-3.5" />
        Share profile
      </button>
      <button
        type="button"
        onClick={copyLink}
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary-accent/60 hover:text-foreground"
      >
        <Copy className="h-3.5 w-3.5" />
        {copied ? 'Copied' : 'Copy link'}
      </button>
      <a
        href={`https://wa.me/?text=${encodedText}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => record('whatsapp')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary-accent/60 hover:text-foreground"
        aria-label="Share on WhatsApp"
      >
        <MessageCircle className="h-4 w-4" />
      </a>
      <a
        href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => record('facebook')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary-accent/60 hover:text-foreground"
        aria-label="Share on Facebook"
      >
        <span className="text-xs font-bold">f</span>
      </a>
      <a
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`}
        target="_blank"
        rel="noreferrer"
        onClick={() => record('linkedin')}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition-colors hover:border-primary-accent/60 hover:text-foreground"
        aria-label="Share on LinkedIn"
      >
        <span className="text-[11px] font-bold">in</span>
      </a>
    </div>
  )
}
