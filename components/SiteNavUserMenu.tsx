'use client'

import { useEffect, useId, useRef, useState } from 'react'
import Link from 'next/link'
import { signOut } from '@/lib/actions/auth'

interface SiteNavUserMenuProps {
  initial: string
  email: string
}

export function SiteNavUserMenu({
  initial,
  email,
}: SiteNavUserMenuProps) {
  const [open, setOpen] = useState(false)
  const menuId = useId()
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false)
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [open])

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-full border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
        title={email || 'Account menu'}
      >
        <span aria-hidden="true">{initial}</span>
        <span className="sr-only">Account menu</span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          className="absolute right-0 top-[calc(100%+0.5rem)] z-50 min-w-44 rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          <form action={signOut}>
            <button
              type="submit"
              role="menuitem"
              className="flex w-full rounded-lg px-3 py-2 text-left text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              Sign out
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
