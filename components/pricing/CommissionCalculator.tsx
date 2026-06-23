'use client'

import { useState, useMemo } from 'react'
import {
  COMMISSION_BRACKETS,
  PACKAGES,
  findBracket,
  effectiveRate,
} from '@/lib/pricing-config'

// Build the selector options for the ceiling-package dropdown from the
// canonical PACKAGES config — no hardcoding here.
const CEILING_OPTIONS = [
  { label: 'No package', rate: null, fee: 0, name: '' },
  ...PACKAGES.filter(p => p.ceilingRate !== null).map(p => ({
    label: `${p.name} — ${(p.ceilingRate! * 100).toFixed(2).replace(/\.?0+$/, '')}% ceiling  ·  R${p.monthlyFee.toLocaleString('en-ZA')}/mo`,
    rate: p.ceilingRate,
    fee: p.monthlyFee,
    name: p.name,
  })),
]

function round2(n: number) {
  return Math.round(n * 100) / 100
}

function fmt(n: number) {
  return 'R ' + n.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function pct(n: number) {
  return (n * 100).toFixed(2).replace(/\.?0+$/, '') + '%'
}

export function CommissionCalculator() {
  const [rawValue, setRawValue] = useState('5000')
  const [selectedIdx, setSelectedIdx] = useState(0) // index into CEILING_OPTIONS

  const price = useMemo(() => {
    const n = parseFloat(rawValue.replace(/[^0-9.]/g, ''))
    return isNaN(n) || n < 0 ? 0 : n
  }, [rawValue])

  const bracket = useMemo(() => findBracket(price), [price])
  const standardRate = bracket.rate
  const option = CEILING_OPTIONS[selectedIdx]
  const rate = effectiveRate(price, option.rate)
  const commission = round2(price * rate)
  const payout = round2(price - commission)

  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Input row */}
      <div className="px-6 pt-6 pb-5 border-b bg-muted/30">
        <label className="block text-sm font-semibold text-foreground mb-2">
          Service sale price
        </label>
        <div className="flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground select-none">R</span>
            <input
              type="text"
              inputMode="decimal"
              value={rawValue}
              onChange={e => setRawValue(e.target.value)}
              className="w-full rounded-xl border border-input bg-background pl-8 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="0"
            />
          </div>
          <div className="flex-1">
            <select
              value={selectedIdx}
              onChange={e => setSelectedIdx(Number(e.target.value))}
              className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring cursor-pointer"
            >
              {CEILING_OPTIONS.map((o, i) => (
                <option key={i} value={i}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Results */}
      <div className="px-6 py-5 grid sm:grid-cols-3 gap-4">
        <div className="rounded-xl bg-muted/40 px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Bracket</p>
          <p className="mt-1 text-base font-semibold text-foreground">{bracket.label}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">Standard rate: {pct(standardRate)}</p>
        </div>

        <div className="rounded-xl bg-primary/8 px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Platform fee</p>
          <p className="mt-1 text-xl font-bold text-foreground">{fmt(commission)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {pct(rate)} effective rate
            {option.rate !== null && rate < standardRate && (
              <span className="ml-1 text-primary font-medium">(ceiling applied)</span>
            )}
          </p>
        </div>

        <div className="rounded-xl bg-primary/12 px-4 py-3.5">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">You receive</p>
          <p className="mt-1 text-xl font-bold text-primary">{fmt(payout)}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">After commission</p>
        </div>
      </div>

      {/* Bracket breakdown (no package) or cross-plan comparison (package selected) */}
      {option.rate === null ? (
        <div className="px-6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Rate across all brackets
          </p>
          <div className="space-y-1.5">
            {COMMISSION_BRACKETS.map(b => {
              const isActive = bracket.min === b.min
              return (
                <div
                  key={b.label}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    isActive
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <span>{b.label}</span>
                  <span>{pct(b.rate)}</span>
                </div>
              )
            })}
          </div>
        </div>
      ) : (
        <div className="px-6 pb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-3">
            Package comparison at {price > 0 ? fmt(price) : 'this price'}
          </p>
          <div className="space-y-1.5">
            {CEILING_OPTIONS.map((o, i) => {
              const er = effectiveRate(price, o.rate)
              const comm = round2(price * er)
              const saving = round2(price * standardRate - comm)
              const isSelected = i === selectedIdx
              return (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors ${
                    isSelected
                      ? 'bg-primary text-primary-foreground font-semibold'
                      : 'bg-muted/40 text-muted-foreground'
                  }`}
                >
                  <span className="truncate mr-2">{o.label}</span>
                  <span className="shrink-0">
                    {fmt(comm)}
                    {saving > 0 && !isSelected && (
                      <span className="ml-1.5 text-xs opacity-70">save {fmt(saving)}</span>
                    )}
                  </span>
                </div>
              )
            })}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Savings shown are per sale. Monthly package fee is separate.
          </p>
        </div>
      )}
    </div>
  )
}
