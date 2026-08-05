import Link from 'next/link'

const LINKS = [
  { href: '/about', label: 'About' },
  { href: '/contact', label: 'Contact' },
  { href: '/terms', label: 'Terms of Service' },
  { href: '/provider-terms', label: 'Provider Terms' },
  { href: '/privacy', label: 'Privacy Policy' },
  { href: '/refund', label: 'Refund Policy' },
  { href: '/delivery', label: 'Delivery Policy' },
] as const

interface Props {
  className?: string
}

export function PolicyLinks({ className = '' }: Props) {
  return (
    <nav className={['flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs text-muted-foreground', className].join(' ')}>
      {LINKS.map((link) => (
        <Link key={link.href} href={link.href} className="hover:text-foreground hover:underline">
          {link.label}
        </Link>
      ))}
    </nav>
  )
}
