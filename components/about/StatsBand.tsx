interface StatsBandProps {
  providerCount: number
  categoryCount: number
  cityCount: number
}

export function StatsBand({ providerCount, categoryCount, cityCount }: StatsBandProps) {
  if (!providerCount && !categoryCount && !cityCount) return null

  const stats = [
    { value: providerCount, label: 'providers' },
    { value: categoryCount, label: 'categories' },
    { value: cityCount, label: 'cities' },
  ]

  return (
    <dl className="grid grid-cols-3 divide-x rounded-2xl border bg-card text-center">
      {stats.map((stat) => (
        <div key={stat.label} className="px-4 py-6">
          <dt className="font-mono text-2xl font-semibold text-foreground sm:text-3xl">{stat.value}</dt>
          <dd className="mt-1 text-xs text-muted-foreground sm:text-sm">{stat.label}</dd>
        </div>
      ))}
    </dl>
  )
}
