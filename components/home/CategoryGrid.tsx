import Link from 'next/link'
import { Icon, categoryIcon } from '@/components/ui/Icon'
import type { CategoryView } from '@/lib/public-data'

export function CategoryGrid({ categories }: { categories: CategoryView[] }) {
  if (!categories.length) return null

  return (
    <section className="border-y bg-secondary/50">
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="mb-8 max-w-2xl">
          <h2 className="font-display text-3xl font-bold tracking-tight">Browse by category</h2>
          <p className="mt-2 text-muted-foreground">
            Every vertical runs on the same trusted listing — pick a trade and compare real options fast.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {categories.slice(0, 8).map((category, index) => {
            const Glyph = categoryIcon(category.slug)
            return (
              <Link
                key={category.id}
                href={`/providers/category/${category.slug}`}
                className="group reveal relative overflow-hidden rounded-2xl border bg-card p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
                style={{ animationDelay: `${index * 0.05}s` }}
              >
                <span className="absolute right-4 top-4 font-mono text-xs text-muted-foreground">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Glyph className="h-6 w-6" weight="duotone" />
                </span>
                <h3 className="mt-4 font-display text-lg font-semibold">{category.name}</h3>
                <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{category.description}</p>
                <p className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-accent">
                  <span className="font-mono">{category.providerCount}</span> providers
                  <Icon.caretRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" weight="bold" />
                </p>
              </Link>
            )
          })}
        </div>
      </div>
    </section>
  )
}
