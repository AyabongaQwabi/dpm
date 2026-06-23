import { Icon } from '@/components/ui/Icon'

const items = [
  {
    icon: Icon.verified,
    title: 'Real profiles, not adverts',
    text: 'Every listing shows services, galleries, business details and reviews so you can decide before you call.',
  },
  {
    icon: Icon.chat,
    title: 'Learn from local know-how',
    text: 'Browse provider stories, service tips and promos straight from businesses in your own community.',
  },
  {
    icon: Icon.heart,
    title: 'Built for the way SA shops',
    text: 'Fast city pages, category filters and ratings — made for finding someone local you can actually trust.',
  },
]

interface TrustSectionProps {
  providerCount: number
  categoryCount: number
  cityCount: number
}

export function TrustSection({ providerCount, categoryCount, cityCount }: TrustSectionProps) {
  const stats = [
    { value: providerCount, label: 'listed providers' },
    { value: categoryCount, label: 'service categories' },
    { value: cityCount, label: 'cities covered' },
  ]

  return (
    <section className="bg-primary text-primary-foreground">
      <div className="craft-rule" aria-hidden="true" />
      <div className="mx-auto max-w-7xl px-4 py-16">
        <div className="grid gap-5 md:grid-cols-3">
          {items.map((item) => (
            <div key={item.title} className="rounded-2xl border border-primary-foreground/15 bg-primary-foreground/8 p-6">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-accent/20 text-primary-foreground">
                <item.icon className="h-6 w-6" weight="duotone" />
              </span>
              <h3 className="mt-5 font-display text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 text-primary-foreground/70">{item.text}</p>
            </div>
          ))}
        </div>

        <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-primary-foreground/15 pt-8 text-center">
          {stats.map((stat) => (
            <div key={stat.label}>
              <dt className="font-mono text-3xl font-semibold md:text-4xl">{stat.value}</dt>
              <dd className="mt-1 text-sm text-primary-foreground/70">{stat.label}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
