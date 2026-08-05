/** Visible dev-time placeholder for a fact that must be confirmed before launch. Renders inline. */
export function TodoPlaceholder({ children }: { children: string }) {
  return (
    <span className="rounded bg-destructive/10 px-1.5 py-0.5 font-mono text-xs text-destructive">
      TODO(aya): {children}
    </span>
  )
}
