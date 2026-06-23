'use client'

import { useEffect, useState } from 'react'
import { Icon } from '@/components/ui/Icon'

type Theme = 'light' | 'dark' | 'system'

function resolveTheme(theme: Theme) {
  if (theme === 'system') {
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  }
  return theme === 'dark'
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === 'undefined') return 'system'
    return (localStorage.getItem('theme') as Theme | null) ?? 'system'
  })

  useEffect(() => {
    document.documentElement.classList.toggle('dark', resolveTheme(theme))
  }, [theme])

  function cycleTheme() {
    const next: Theme = theme === 'system' ? 'light' : theme === 'light' ? 'dark' : 'system'
    setTheme(next)
    localStorage.setItem('theme', next)
  }

  const Glyph = theme === 'system' ? Icon.desktop : theme === 'dark' ? Icon.moon : Icon.sun

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`Theme: ${theme}`}
      title={`Theme: ${theme}`}
      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border bg-card text-foreground hover:bg-muted transition-colors"
    >
      <Glyph className="h-[18px] w-[18px] text-primary-accent" />
    </button>
  )
}
