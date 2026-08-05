'use client'

import { useState } from 'react'
import { Icon } from '@/components/ui/Icon'
import type { HelpTopic } from '@/lib/help-content'

// All answers stay in the DOM regardless of open state (grid-rows collapse,
// not unmount) so crawlers and in-page search see every answer.
export function HelpAccordion({ topic }: { topic: HelpTopic }) {
  // Deep link support: /help#question-id opens that question on load. Lazy
  // initializer runs client-side only on hydration's first client render,
  // matching the SSR pass (window is unavailable server-side, so this stays
  // null there) — no effect/setState-in-effect needed.
  const [openId, setOpenId] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null
    const hash = window.location.hash.slice(1)
    return topic.questions.some((q) => q.id === hash) ? hash : null
  })

  return (
    <div className="space-y-3">
      {topic.questions.map((q) => {
        const isOpen = openId === q.id
        const panelId = `help-panel-${q.id}`
        const buttonId = `help-button-${q.id}`
        return (
          <div key={q.id} id={q.id} className="scroll-mt-24 rounded-2xl border bg-card">
            <h3>
              <button
                type="button"
                id={buttonId}
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() => setOpenId(isOpen ? null : q.id)}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left text-sm font-semibold text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                {q.question}
                <Icon.caretRight
                  className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 ${isOpen ? 'rotate-90' : ''}`}
                  weight="bold"
                />
              </button>
            </h3>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none ${
                isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'
              }`}
            >
              <div className="overflow-hidden">
                <p className="px-5 pb-4 text-sm leading-6 text-muted-foreground">{q.answer}</p>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
