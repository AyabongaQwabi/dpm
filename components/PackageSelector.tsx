'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { DiscountType } from '@/lib/db'
import { formatCredits } from '@/lib/format-credits'

interface Package {
  id: string
  name: string
  description: string
  price: number
  discount_type: DiscountType
  discount_amount: number | null
  offerings: string[]
  requirements: string
  delivery_time: string
  is_default: boolean
}

interface Props {
  packages: Package[]
  serviceId: string
  serviceName: string
  ctaVerb: string
  isSignedIn: boolean
  signInUrl: string
  providerSlug: string
}

function effectivePrice(price: number, type: DiscountType, amount: number | null): number {
  if (type === 'none' || amount === null) return price
  if (type === 'amount') return Math.max(0, price - amount)
  return price * (1 - amount / 100)
}

function discountLabel(type: DiscountType, amount: number | null): string | null {
  if (type === 'none' || amount === null) return null
  if (type === 'percent') return `${amount}% off`
  return `${formatCredits(Number(amount))} off`
}

export function PackageSelector({ packages, serviceId, serviceName, ctaVerb, isSignedIn, signInUrl, providerSlug }: Props) {
  const defaultPkg = packages.find((p) => p.is_default) ?? packages[0]
  const [selected, setSelected] = useState<string>(defaultPkg?.id ?? '')

  const selectedPkg = packages.find((p) => p.id === selected) ?? packages[0]

  if (!packages.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
        No pricing packages available yet.
      </div>
    )
  }

  const finalPrice = selectedPkg
    ? effectivePrice(selectedPkg.price, selectedPkg.discount_type, selectedPkg.discount_amount)
    : null
  const hasDiscount = selectedPkg?.discount_type !== 'none' && selectedPkg?.discount_amount !== null
  const label = discountLabel(selectedPkg?.discount_type ?? 'none', selectedPkg?.discount_amount ?? null)

  const checkoutUrl = isSignedIn
    ? `/checkout?serviceId=${serviceId}&packageId=${selected}`
    : signInUrl

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
      {/* Header */}
      <div className="border-b border-border bg-muted/30 px-6 py-4">
        <h2 className="font-semibold text-base">Choose a package</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{serviceName}</p>
      </div>

      <div className="p-6 space-y-3">
        {/* Package options */}
        {packages.length > 1 && (
          <div className="mb-5 grid gap-2 rounded-xl border border-border bg-muted/20 p-2">
            {packages.map((pkg) => {
              const eff = effectivePrice(pkg.price, pkg.discount_type, pkg.discount_amount)
              const isSelected = selected === pkg.id
              return (
                <button
                  key={pkg.id}
                  onClick={() => setSelected(pkg.id)}
                  className={[
                    'relative grid min-h-16 grid-cols-[1fr_auto] items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 cursor-pointer',
                    isSelected
                      ? 'border-primary bg-primary text-primary-foreground shadow-sm'
                      : 'border-transparent bg-card text-foreground hover:border-primary-accent/40 hover:bg-primary-accent/5',
                  ].join(' ')}
                >
                  <span className="min-w-0">
                    <span className="block break-words text-sm font-semibold leading-snug">{pkg.name}</span>
                    {pkg.is_default && (
                      <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${isSelected ? 'bg-primary-foreground/15 text-primary-foreground' : 'bg-primary/5 text-primary'}`}>
                        Popular
                      </span>
                    )}
                  </span>
                  <span className={`whitespace-nowrap text-right text-sm font-semibold tabular-nums ${isSelected ? 'text-primary-foreground' : 'text-muted-foreground'}`}>
                    {formatCredits(eff)}
                  </span>
                </button>
              )
            })}
          </div>
        )}

        {/* Selected package details */}
        {selectedPkg && (
          <div className="space-y-5">
            {/* Price */}
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className="text-3xl font-bold tabular-nums">
                  {finalPrice !== null ? formatCredits(finalPrice) : '—'}
                </p>
                {hasDiscount && (
                  <div className="flex items-center gap-2 mt-1">
                    <p className="text-sm text-muted-foreground line-through tabular-nums">
                      {formatCredits(selectedPkg.price)}
                    </p>
                    {label && (
                      <span className="rounded-full bg-green-100 text-green-700 border border-green-200 px-2 py-0.5 text-xs font-semibold">
                        {label}
                      </span>
                    )}
                  </div>
                )}
              </div>
              {selectedPkg.is_default && (
                <span className="text-xs font-medium rounded-full border border-primary/30 bg-primary/5 text-primary px-2.5 py-1">
                  Popular
                </span>
              )}
            </div>

            {/* Description */}
            {selectedPkg.description && (
              <p className="text-sm text-muted-foreground leading-relaxed">{selectedPkg.description}</p>
            )}

            {/* Delivery time */}
            {selectedPkg.delivery_time && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <svg className="h-4 w-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{selectedPkg.delivery_time}</span>
              </div>
            )}

            {/* Offerings */}
            {selectedPkg.offerings.length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2.5">What&apos;s included</p>
                <ul className="space-y-2">
                  {selectedPkg.offerings.map((item, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm">
                      <svg className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      <span className="text-muted-foreground leading-snug">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Requirements */}
            {selectedPkg.requirements && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
                <p className="text-xs font-semibold text-amber-800 mb-1">Requirements</p>
                <p className="text-xs text-amber-700 leading-relaxed">{selectedPkg.requirements}</p>
              </div>
            )}

            {/* CTA */}
            <Link
              href={checkoutUrl}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-primary-accent px-4 py-3.5 text-sm font-semibold text-primary-accent-foreground hover:opacity-90 transition-opacity"
            >
              {ctaVerb} — {selectedPkg.name}
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </Link>

            {!isSignedIn && (
              <p className="text-center text-xs text-muted-foreground">
                You&apos;ll be asked to sign in before booking.
              </p>
            )}

            {/* Provider link */}
            <div className="pt-2 border-t border-border">
              <Link
                href={`/providers/${providerSlug}`}
                className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                View provider profile
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
