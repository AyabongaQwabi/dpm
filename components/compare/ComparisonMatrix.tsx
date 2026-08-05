interface ComparisonRow {
  criteria: string
  basicDirectory: string
  payPerLead: string
  bookingMarketplace: string
  servicePros: string
}

const ROWS: ComparisonRow[] = [
  {
    criteria: 'Provider profile',
    basicDirectory: 'Usually yes',
    payPerLead: 'Usually yes',
    bookingMarketplace: 'Usually yes',
    servicePros: 'Yes',
  },
  {
    criteria: 'Customer can compare services',
    basicDirectory: 'Varies',
    payPerLead: 'Varies',
    bookingMarketplace: 'Often yes',
    servicePros: 'Yes',
  },
  {
    criteria: 'Customer booking flow',
    basicDirectory: 'Usually off-platform',
    payPerLead: 'Varies',
    bookingMarketplace: 'Often yes',
    servicePros: 'Yes',
  },
  {
    criteria: 'Provider pays for enquiries',
    basicDirectory: 'Varies',
    payPerLead: 'Often yes',
    bookingMarketplace: 'Varies',
    servicePros: 'No',
  },
  {
    criteria: 'Provider commission on completed work',
    basicDirectory: 'Usually no',
    payPerLead: 'Varies',
    bookingMarketplace: 'Often yes',
    servicePros: 'Yes',
  },
  {
    criteria: 'Verification signals',
    basicDirectory: 'Varies',
    payPerLead: 'Varies',
    bookingMarketplace: 'Varies',
    servicePros: 'Contact, Google, CIPC, FICA badges where available',
  },
  {
    criteria: 'Reviews',
    basicDirectory: 'Varies',
    payPerLead: 'Varies',
    bookingMarketplace: 'Often yes',
    servicePros: 'Reviews from completed bookings',
  },
  {
    criteria: 'Pricing transparency',
    basicDirectory: 'Varies',
    payPerLead: 'Varies',
    bookingMarketplace: 'Varies',
    servicePros: 'Service/package pricing where provider publishes it',
  },
]

export function ComparisonMatrix() {
  return (
    <div className="overflow-x-auto rounded-2xl border">
      <table className="w-full min-w-[720px] text-sm">
        <thead>
          <tr className="border-b bg-muted/40">
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Criteria</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Basic directory</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Pay-per-lead marketplace</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground">Booking marketplace</th>
            <th className="px-4 py-3 text-left text-xs font-semibold text-primary-accent">ServicePros</th>
          </tr>
        </thead>
        <tbody className="divide-y">
          {ROWS.map((row) => (
            <tr key={row.criteria}>
              <td className="px-4 py-3 font-medium text-foreground">{row.criteria}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.basicDirectory}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.payPerLead}</td>
              <td className="px-4 py-3 text-muted-foreground">{row.bookingMarketplace}</td>
              <td className="px-4 py-3 font-medium text-foreground">{row.servicePros}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export const COMPARISON_CRITERIA = ROWS.map((row) => row.criteria)
