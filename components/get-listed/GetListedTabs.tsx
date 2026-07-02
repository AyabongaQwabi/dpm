'use client'

import { useSearchParams, useRouter, usePathname } from 'next/navigation'
import { ProviderPricingContent } from '@/components/pricing/ProviderPricingContent'

type TabId = 'overview' | 'pricing'

const TABS: { id: TabId; label: string }[] = [
  { id: 'overview', label: 'Overview' },
  { id: 'pricing', label: 'Pricing' },
]

interface Props {
  overview: React.ReactNode
}

export function GetListedTabs({ overview }: Props) {
  const searchParams = useSearchParams()
  const router = useRouter()
  const pathname = usePathname()
  const activeTab: TabId = searchParams.get('tab') === 'pricing' ? 'pricing' : 'overview'

  function selectTab(tab: TabId) {
    const params = new URLSearchParams(searchParams.toString())
    if (tab === 'overview') {
      params.delete('tab')
    } else {
      params.set('tab', tab)
    }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  return (
    <>
      <div className="border-b bg-background">
        <div className="mx-auto max-w-7xl px-4">
          <nav className="flex gap-1" aria-label="Get listed sections">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => selectTab(tab.id)}
                className={[
                  'border-b-2 px-4 py-3 text-sm font-semibold transition-colors',
                  activeTab === tab.id
                    ? 'border-primary-accent text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground',
                ].join(' ')}
                aria-current={activeTab === tab.id ? 'page' : undefined}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {activeTab === 'pricing' ? <ProviderPricingContent /> : overview}
    </>
  )
}
