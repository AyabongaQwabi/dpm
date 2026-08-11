// C.2: visible disclosure on every sponsored item — an ASA/CPA requirement,
// not a design preference. Legible text, not a faint superscript or icon-only
// mark. Renders inside a sponsored item's own labelled slot — never implies
// the item's position in the organic list changed.
export function SponsoredLabel() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
      Sponsored
    </span>
  )
}
