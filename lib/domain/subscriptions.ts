// Pure subscription helpers — no framework imports.

import { PACKAGES } from '@/lib/pricing-config'

const MS_PER_DAY = 24 * 60 * 60 * 1000

export function getPackageByNumber(packageNumber: number) {
  return PACKAGES.find((p) => p.packageNumber === packageNumber) ?? PACKAGES[0]
}

export function daysRemaining(billingEnd: string | Date, now: Date = new Date()): number {
  const end = billingEnd instanceof Date ? billingEnd : new Date(billingEnd)
  const diff = end.getTime() - now.getTime()
  return Math.max(0, Math.ceil(diff / MS_PER_DAY))
}

export function addOneMonth(from: Date = new Date()): Date {
  const end = new Date(from)
  end.setMonth(end.getMonth() + 1)
  return end
}

export interface BaseSubscriptionInsert {
  provider_id: string
  package_number: number
  monthly_fee: number
  billing_start: string
  billing_end: string
  status: 'active'
}

export function buildBaseSubscriptionRow(providerId: string, now: Date = new Date()): BaseSubscriptionInsert {
  const pkg = getPackageByNumber(1)
  const billingStart = now.toISOString()
  const billingEnd = addOneMonth(now).toISOString()
  return {
    provider_id: providerId,
    package_number: pkg.packageNumber,
    monthly_fee: pkg.monthlyFee,
    billing_start: billingStart,
    billing_end: billingEnd,
    status: 'active',
  }
}
