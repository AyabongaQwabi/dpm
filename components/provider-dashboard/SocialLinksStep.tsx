'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { saveOnboardingStep } from '@/lib/actions/onboarding'

const PLATFORMS = ['Instagram', 'Facebook', 'X (Twitter)', 'LinkedIn', 'TikTok', 'YouTube', 'WhatsApp', 'Website']

interface SocialLink { platform: string; url: string }

interface Props {
  stepPosition: number
  isLast: boolean
  prevStep: number | null
  nextStep: number | null
  savedLinks: SocialLink[]
}

export function SocialLinksStep({ stepPosition, isLast, prevStep, nextStep, savedLinks }: Props) {
  const router = useRouter()
  const [links, setLinks] = useState<SocialLink[]>(
    savedLinks.length > 0 ? savedLinks : [{ platform: 'Instagram', url: '' }]
  )

  function addLink() {
    const used = new Set(links.map((l) => l.platform))
    const next = PLATFORMS.find((p) => !used.has(p)) ?? 'Website'
    setLinks((prev) => [...prev, { platform: next, url: '' }])
  }

  function removeLink(i: number) {
    setLinks((prev) => prev.filter((_, idx) => idx !== i))
  }

  function updateLink(i: number, key: keyof SocialLink, val: string) {
    setLinks((prev) => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    const fd = new FormData()
    fd.set('__stepPosition', String(stepPosition))
    fd.set('__social_links', JSON.stringify(links.filter((l) => l.url.trim())))
    try {
      await saveOnboardingStep(fd)
    } catch {
      // server action calls redirect() which throws NEXT_REDIRECT — not a real error
    }
    if (isLast) {
      router.push('/provider-dashboard')
    } else if (nextStep !== null) {
      router.push(`/provider-dashboard/onboarding?step=${nextStep}`)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Add links to your social media profiles and website. These appear on your public profile.
      </p>

      <div className="space-y-3">
        {links.map((link, i) => (
          <div key={i} className="flex gap-2 items-start">
            <div className="w-40 flex-shrink-0">
              <Label className="sr-only">Platform</Label>
              <select
                value={link.platform}
                onChange={(e) => updateLink(i, 'platform', e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {PLATFORMS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex-1">
              <Label className="sr-only">URL</Label>
              <Input
                type="url"
                placeholder="https://..."
                value={link.url}
                onChange={(e) => updateLink(i, 'url', e.target.value)}
              />
            </div>
            {links.length > 1 && (
              <button
                type="button"
                onClick={() => removeLink(i)}
                className="mt-2 text-muted-foreground hover:text-destructive text-sm"
                aria-label="Remove"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      {links.length < PLATFORMS.length && (
        <button
          type="button"
          onClick={addLink}
          className="text-sm text-primary hover:underline"
        >
          + Add another link
        </button>
      )}

      <div className="flex gap-3 pt-2">
        {prevStep !== null && (
          <Button variant="outline" asChild>
            <a href={`/provider-dashboard/onboarding?step=${prevStep}`}>Back</a>
          </Button>
        )}
        <Button type="submit" className="flex-1">
          {isLast ? 'Finish & publish' : 'Save & continue'}
        </Button>
      </div>
    </form>
  )
}
