import Link from 'next/link'
import { requireAdminSession } from '@/lib/session'
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { email } = await requireAdminSession()

  async function signOut() {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/sign-in')
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/30">
      <header className="sticky top-0 z-40 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-4 px-4">
          <Link href="/admin/claims" className="font-display font-bold text-primary text-lg tracking-tight">
            DPM Admin
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/admin/claims" className="text-muted-foreground hover:text-foreground transition-colors">
              Claims
            </Link>
          </nav>
          <div className="ml-auto flex items-center gap-3">
            <span className="hidden sm:inline text-xs text-muted-foreground">{email}</span>
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
      <main className="flex-1 min-w-0">{children}</main>
    </div>
  )
}
