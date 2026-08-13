'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { ArrowRight, BadgeCheck, Copy, FileText, MessageCircle, QrCode, Sticker } from 'lucide-react'
import type { ProfileCompletenessItem } from '@/lib/domain/profile-completeness'
import type { AnalyticsRangeDays, ProviderAnalyticsMetric, ProviderAnalyticsSummary } from '@/lib/domain/provider-analytics'

interface ShareableService {
  id: string
  title: string
  url: string
  isPublished: boolean
}

interface SinglePlayerToolkitProps {
  providerId: string
  businessName: string
  profileUrl: string
  profilePath: string
  services: ShareableService[]
  completeness: {
    percent: number
    score: number
    total: number
    items: ProfileCompletenessItem[]
    nextItems: ProfileCompletenessItem[]
  }
  analytics: ProviderAnalyticsSummary
  printKitEligible: boolean
}

function CopyButton({ value, label = 'Copy' }: { value: string; label?: string }) {
  const [copied, setCopied] = useState(false)

  return (
    <button
      type="button"
      onClick={async () => {
        await navigator.clipboard.writeText(value)
        setCopied(true)
        window.setTimeout(() => setCopied(false), 1600)
      }}
      className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-muted"
    >
      <Copy className="h-3.5 w-3.5" />
      {copied ? 'Copied' : label}
    </button>
  )
}

function formatMetric(metric: Pick<ProviderAnalyticsMetric, 'unit' | 'value'>): string {
  if (metric.value === null) return '-'
  if (metric.unit === 'percent') return `${Math.round(metric.value * 100)}%`
  if (metric.unit === 'rating') return metric.value.toFixed(1)
  if (metric.unit === 'minutes') return `${Math.round(metric.value)}m`
  return String(Math.round(metric.value))
}

function metricBarWidth(value: number | null, medianValue: number | null): string {
  const max = Math.max(value ?? 0, medianValue ?? 0, 1)
  return `${Math.max(4, Math.round(((value ?? 0) / max) * 100))}%`
}

function AnalyticsMetricRow({ metric }: { metric: ProviderAnalyticsMetric }) {
  const hasMedian = metric.median !== null

  return (
    <div className="rounded-lg border bg-background p-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-xs font-medium text-muted-foreground">{metric.label}</p>
        <p className="font-mono text-lg font-bold">{formatMetric(metric)}</p>
      </div>
      <div className="mt-3 space-y-1.5">
        <div className="h-2 overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary-accent" style={{ width: metricBarWidth(metric.value, metric.median) }} />
        </div>
        {hasMedian && (
          <>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-foreground/35" style={{ width: metricBarWidth(metric.median, metric.value) }} />
            </div>
            <p className="text-[11px] text-muted-foreground">Median: {formatMetric({ unit: metric.unit, value: metric.median })}</p>
          </>
        )}
      </div>
    </div>
  )
}

export function SinglePlayerToolkit({
  providerId,
  businessName,
  profileUrl,
  profilePath,
  services,
  completeness,
  analytics,
  printKitEligible,
}: SinglePlayerToolkitProps) {
  const publishedServices = services.filter((service) => service.isPublished)
  const [rangeDays, setRangeDays] = useState<AnalyticsRangeDays>(30)
  const selectedRange = analytics.ranges.find((range) => range.days === rangeDays) ?? analytics.ranges[0]
  const whatsappText = useMemo(
    () => encodeURIComponent(`Hi, you can view and book ${businessName} on ServicePros here: ${profileUrl}`),
    [businessName, profileUrl],
  )

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Growth Hub</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Turn your profile into a booking link</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">
              Share your ServicePros profile, send customers straight to bookable services, and build verified activity that makes your business easier to trust.
            </p>
          </div>
          <Link
            href={profilePath}
            className="inline-flex items-center gap-1.5 rounded-xl bg-primary-accent px-3.5 py-2 text-sm font-semibold text-primary-accent-foreground hover:opacity-90"
          >
            View profile
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="mt-5 rounded-xl border bg-muted/20 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Profile link</p>
              <p className="mt-1 text-sm text-muted-foreground">Ready to send to customers.</p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <CopyButton value={profileUrl} />
              <a
                href={`https://wa.me/?text=${whatsappText}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-muted"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                Share
              </a>
            </div>
          </div>
        </div>

        <div className="mt-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3 className="font-display text-base font-semibold">Service links</h3>
            <Link href="/provider-dashboard/services/new" className="text-sm font-semibold text-primary-accent hover:underline">
              Add service
            </Link>
          </div>
          {publishedServices.length ? (
            <div className="grid gap-3">
              {publishedServices.slice(0, 4).map((service) => (
                <div key={service.id} className="flex flex-col gap-3 rounded-xl border bg-background p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium">{service.title}</p>
                    <p className="mt-1 text-xs text-muted-foreground">Share this service directly with customers.</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <CopyButton value={service.url} />
                    <Link href={`/services/${service.id}`} className="inline-flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-semibold hover:bg-muted">
                      Open
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed bg-muted/20 p-5 text-sm text-muted-foreground">
              Create and publish one service to unlock direct booking links you can send to customers.
            </div>
          )}
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <a
            href={`/api/providers/${providerId}/badge.png`}
            download
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
          >
            <BadgeCheck className="h-4 w-4" />
            Brand badge
          </a>
          <a
            href={`/api/providers/${providerId}/qr.png`}
            download
            className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
          >
            <QrCode className="h-4 w-4" />
            Profile QR
          </a>
        </div>

        {printKitEligible ? (
          <div className="mt-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Evangelism kit</p>
            <p className="mt-1 text-xs text-muted-foreground">Print-ready PDFs, regenerated fresh on every download so badge status is always current.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <a
                href={`/api/providers/${providerId}/print-kit/decal-a5.pdf`}
                download
                className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
              >
                <Sticker className="h-4 w-4" />
                A5 decal
              </a>
              <a
                href={`/api/providers/${providerId}/print-kit/certificate-a4.pdf`}
                download
                className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                A4 certificate
              </a>
              <a
                href={`/api/providers/${providerId}/print-kit/sticker-circular.pdf`}
                download
                className="inline-flex items-center justify-center gap-2 rounded-xl border bg-background px-4 py-3 text-sm font-semibold hover:bg-muted"
              >
                <QrCode className="h-4 w-4" />
                60mm sticker
              </a>
            </div>
          </div>
        ) : (
          <div className="mt-3 rounded-xl border border-dashed bg-muted/20 p-4 text-xs text-muted-foreground">
            Claim your profile and earn at least one verification badge to unlock the print-ready evangelism kit (decal, certificate, sticker).
          </div>
        )}
      </section>

      <aside className="space-y-6">
        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Profile strength</p>
              <h2 className="mt-1 font-display text-xl font-semibold">{completeness.percent}% complete</h2>
            </div>
            <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-muted/30 font-mono text-lg font-bold">
              {completeness.score}
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary-accent" style={{ width: `${completeness.percent}%` }} />
          </div>
          {completeness.nextItems.length > 0 ? (
            <div className="mt-4 space-y-2">
              {completeness.nextItems.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  className="flex items-center justify-between gap-3 rounded-xl border bg-background px-3 py-2.5 text-sm hover:bg-muted"
                >
                  <span>{item.label}</span>
                  <span className="font-mono text-xs text-primary-accent">+{item.points}</span>
                </Link>
              ))}
            </div>
          ) : (
            <p className="mt-4 rounded-xl border bg-muted/20 px-3 py-2.5 text-sm text-muted-foreground">
              Your profile is ready to share. Keep it fresh with recent work and services.
            </p>
          )}
        </section>

        {analytics.access.allowed ? (
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Your reach</p>
                <h2 className="mt-1 font-display text-xl font-semibold">Analytics</h2>
              </div>
              <div className="inline-flex rounded-lg border bg-background p-0.5">
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type="button"
                    onClick={() => setRangeDays(days as AnalyticsRangeDays)}
                    className={[
                      'h-8 min-w-10 rounded-md px-2 text-xs font-semibold',
                      rangeDays === days ? 'bg-primary-accent text-primary-accent-foreground' : 'text-muted-foreground hover:bg-muted',
                    ].join(' ')}
                  >
                    {days}d
                  </button>
                ))}
              </div>
            </div>
            {analytics.comparisonUnavailableReason && (
              <p className="mt-3 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
                {analytics.comparisonUnavailableReason}
              </p>
            )}
            <div className="mt-4 grid gap-3">
              {(selectedRange?.metrics ?? []).map((metric) => (
                <AnalyticsMetricRow key={metric.key} metric={metric} />
              ))}
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border bg-card p-5 shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary-accent">Your reach</p>
            <h2 className="mt-1 font-display text-xl font-semibold">Analytics</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Upgrade to a ceiling package or activate Pro to see profile analytics.
            </p>
            <Link
              href="/provider-dashboard/billing"
              className="mt-4 inline-flex rounded-lg bg-primary-accent px-3 py-2 text-sm font-semibold text-primary-accent-foreground"
            >
              View billing
            </Link>
          </section>
        )}
      </aside>
    </div>
  )
}
