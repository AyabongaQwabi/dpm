import Link from 'next/link'
import { Icon, categoryIcon } from '@/components/ui/Icon'
import type { CategoryView } from '@/lib/public-data'

interface HeroSectionProps {
  heading: string
  subheading: string
  categories: CategoryView[]
  totalProviders: number
  cityCount: number
}

export function HeroSection({ heading, subheading, categories, totalProviders, cityCount }: HeroSectionProps) {
  const quick = categories.slice(0, 4)

  return (
    <section className="relative overflow-hidden bg-primary text-primary-foreground">
      {/* art-directed screen-print hero — warm, not stock photography */}
      <div className="absolute inset-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/images/hero-highveld.png" alt="" className="h-full w-full object-cover opacity-30" />
        <div className="absolute inset-0 bg-[linear-gradient(100deg,hsl(var(--primary)/0.96),hsl(var(--primary)/0.72)_55%,hsl(var(--primary)/0.4))]" />
      </div>

      <div className="relative mx-auto grid min-h-[620px] max-w-7xl items-center gap-12 px-4 py-20 lg:grid-cols-[1.15fr_.85fr]">
        <div className="reveal">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1 text-sm">
            <Icon.sparkle className="h-4 w-4" weight="fill" />
            Proudly South African · {cityCount} {cityCount === 1 ? 'city' : 'cities'} and growing
          </div>
          <h1 className="max-w-3xl text-balance font-display text-5xl font-bold leading-[1.05] tracking-tight md:text-6xl">
            {heading}
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-primary-foreground/80">{subheading}</p>

          <form action="/search" method="GET" className="mt-9 max-w-2xl rounded-2xl bg-card p-2 text-card-foreground shadow-2xl">
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="flex flex-1 items-center gap-3 rounded-xl px-3">
                <Icon.search className="h-5 w-5 text-muted-foreground" />
                <input
                  name="q"
                  type="search"
                  placeholder="Try “caterer in Soweto” or “armed response Sandton”"
                  className="min-h-12 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                />
              </label>
              <button
                type="submit"
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary-accent px-5 font-semibold text-primary-accent-foreground transition-opacity hover:opacity-90"
              >
                Search
                <Icon.arrowRight className="h-4 w-4" weight="bold" />
              </button>
            </div>
          </form>

          {quick.length > 0 && (
            <div className="mt-5 flex flex-wrap gap-2">
              {quick.map((category) => {
                const Glyph = categoryIcon(category.slug)
                return (
                  <Link
                    key={category.id}
                    href={`/providers/category/${category.slug}`}
                    className="inline-flex items-center gap-2 rounded-full border border-primary-foreground/25 bg-primary-foreground/10 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-primary-foreground/20"
                  >
                    <Glyph className="h-4 w-4" />
                    {category.name}
                  </Link>
                )
              })}
            </div>
          )}
        </div>

        {/* Real counts only — never invented numbers */}
        <div className="reveal reveal-delay-2 hidden rounded-2xl border border-primary-foreground/15 bg-primary-foreground/10 p-5 shadow-2xl backdrop-blur lg:block">
          <div className="flex items-baseline justify-between border-b border-primary-foreground/15 pb-4">
            <span className="font-mono text-3xl font-semibold">{totalProviders}</span>
            <span className="text-sm text-primary-foreground/75">listed providers</span>
          </div>
          <div className="mt-4 grid gap-2">
            {categories.slice(0, 4).map((category) => {
              const Glyph = categoryIcon(category.slug)
              return (
                <Link
                  key={category.id}
                  href={`/providers/category/${category.slug}`}
                  className="flex items-center justify-between rounded-xl bg-primary-foreground/10 px-4 py-3 transition-colors hover:bg-primary-foreground/20"
                >
                  <span className="inline-flex items-center gap-2.5 font-medium">
                    <Glyph className="h-5 w-5" />
                    {category.name}
                  </span>
                  <span className="font-mono text-sm text-primary-foreground/80">{category.providerCount}</span>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
