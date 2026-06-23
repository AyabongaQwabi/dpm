import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AccountSidebar } from '@/components/customer-account/AccountSidebar'

export default async function CustomerAccountLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/sign-in')

  const { data: customer } = await supabase
    .from('customers')
    .select('id, name, email')
    .eq('auth_provider_id', user.id)
    .single()

  if (!customer) redirect('/sign-up')

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/" className="font-display font-bold text-primary text-lg tracking-tight">
            DPM
          </Link>
          <span className="text-muted-foreground/40 text-lg">·</span>
          <span className="font-medium text-sm truncate max-w-xs text-foreground/80">
            {customer.name}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <Link
              href="/services"
              className="hidden sm:inline-flex text-xs border rounded-lg px-3 py-1.5 hover:bg-accent transition-colors"
            >
              Browse services
            </Link>
            <form action={signOut}>
              <button
                type="submit"
                className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <AccountSidebar />
        <main className="flex-1 min-w-0">
          {children}
        </main>
      </div>
    </div>
  )
}
