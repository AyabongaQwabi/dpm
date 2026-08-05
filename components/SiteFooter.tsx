import Link from 'next/link'
import { PolicyLinks } from '@/components/PolicyLinks'

export function SiteFooter() {
  return (
    <footer className="mt-auto bg-primary text-primary-foreground">
      <div className="craft-rule" aria-hidden="true" />
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-14 sm:grid-cols-2 lg:grid-cols-4">
        <div>
          <h2 className="flex items-center gap-2.5 font-display text-lg font-bold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/logo-mark.png" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg" />
            Service Pros
          </h2>
          <p className="mt-3 text-sm leading-6 text-primary-foreground/75">
            South Africa’s home for trusted local providers — township to suburb, Cape Town to Joburg.
            Real businesses, real reviews, no middlemen.
          </p>
        </div>
        <div>
          <h3 className="font-semibold">Discover</h3>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li><Link href="/search" className="hover:text-primary-foreground">All providers</Link></li>
            <li><Link href="/services" className="hover:text-primary-foreground">Services</Link></li>
            <li><Link href="/feed" className="hover:text-primary-foreground">Provider stories</Link></li>
            <li><Link href="/how-it-works" className="hover:text-primary-foreground">How it works</Link></li>
            <li><Link href="/verification" className="hover:text-primary-foreground">Verification</Link></li>
            <li><Link href="/help" className="hover:text-primary-foreground">Help centre</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">For providers</h3>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li><Link href="/provider-signup" className="hover:text-primary-foreground">List your business</Link></li>
            <li><Link href="/provider-login" className="hover:text-primary-foreground">Provider login</Link></li>
            <li><Link href="/providers/top-rated/cape-town" className="hover:text-primary-foreground">Top rated</Link></li>
            <li><Link href="/why-servicepros" className="hover:text-primary-foreground">Why ServicePros</Link></li>
            <li><Link href="/referral-agents" className="hover:text-primary-foreground">Referral agents</Link></li>
            <li><Link href="/platform-partners" className="hover:text-primary-foreground">Platform partners</Link></li>
            <li><Link href="/provider-terms" className="hover:text-primary-foreground">Provider Terms</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-semibold">Company</h3>
          <ul className="mt-3 space-y-2 text-sm text-primary-foreground/75">
            <li><Link href="/about" className="hover:text-primary-foreground">About</Link></li>
            <li><Link href="/dpm" className="hover:text-primary-foreground">What is a DPM?</Link></li>
            <li><Link href="/contact" className="hover:text-primary-foreground">Contact</Link></li>
            <li><Link href="/terms" className="hover:text-primary-foreground">Terms of Service</Link></li>
            <li><Link href="/privacy" className="hover:text-primary-foreground">Privacy Policy</Link></li>
            <li><Link href="/refund" className="hover:text-primary-foreground">Refund Policy</Link></li>
            <li><Link href="/delivery" className="hover:text-primary-foreground">Delivery Policy</Link></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-primary-foreground/15 px-4 py-5 text-center font-mono text-xs text-primary-foreground/70">
        © {new Date().getFullYear()} Service Pros · Proudly South African
      </div>
    </footer>
  )
}
