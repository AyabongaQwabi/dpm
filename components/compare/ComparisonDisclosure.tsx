export function ComparisonDisclosure({ lastUpdated }: { lastUpdated: string }) {
  return (
    <section className="mt-12 space-y-4 rounded-2xl border bg-muted/30 p-6 text-sm leading-6 text-muted-foreground">
      <div>
        <h2 className="text-base font-semibold text-foreground">Disclosure</h2>
        <p className="mt-2">
          This guide explains common marketplace models for customers and providers. It is published by
          ServicePros, so ServicePros is described from our own platform terms and product design. Other
          platforms may use different rules, fees, or workflows; always check their current terms before
          deciding.
        </p>
      </div>
      <div>
        <h2 className="text-base font-semibold text-foreground">Methodology</h2>
        <p className="mt-2">
          We compare platform models using criteria a customer or service provider can inspect before
          signing up: profile visibility, booking flow, pricing transparency, payment method, refund rules,
          verification signals, reviews, provider fees, and support channels.
        </p>
      </div>
      <p className="text-xs">Published by Namoota Technology. Last updated: {lastUpdated}.</p>
    </section>
  )
}
