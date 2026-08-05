const ROWS = [
  {
    label: 'Who pays',
    directory: 'The provider, for a listing',
    marketplace: 'The provider, to bid on a lead',
    dpm: 'The provider, on completed work',
  },
  {
    label: 'When they pay',
    directory: 'Upfront, regardless of results',
    marketplace: 'Before they know if the lead converts',
    dpm: 'After the customer has paid',
  },
  {
    label: 'What the provider gets',
    directory: 'A name and a number on a page',
    marketplace: 'A chance to compete for an enquiry',
    dpm: 'A profile, services, quoting, reputation and growth',
  },
  {
    label: 'Who wins if the job never happens',
    directory: 'The platform — the listing was already paid for',
    marketplace: 'The platform — the lead was already paid for',
    dpm: 'Nobody. No completed work, no commission',
  },
] as const

export function ComparisonTable() {
  return (
    <div className="overflow-x-auto rounded-2xl border bg-card">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b text-left">
            <th scope="col" className="p-4 font-medium text-muted-foreground" />
            <th scope="col" className="p-4 font-display font-semibold text-foreground">Directory</th>
            <th scope="col" className="p-4 font-display font-semibold text-foreground">Lead marketplace</th>
            <th scope="col" className="p-4 font-display font-semibold text-primary-accent">DPM</th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((row) => (
            <tr key={row.label} className="border-b last:border-0">
              <th scope="row" className="p-4 text-left font-medium text-foreground align-top">{row.label}</th>
              <td className="p-4 text-muted-foreground align-top">{row.directory}</td>
              <td className="p-4 text-muted-foreground align-top">{row.marketplace}</td>
              <td className="p-4 font-medium text-foreground align-top">{row.dpm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
