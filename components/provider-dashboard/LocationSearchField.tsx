'use client'

import { useEffect, useRef, useState } from 'react'

interface Props {
  fieldKey: string
  label: string
  isRequired: boolean
  savedValue: string
}

declare global {
  interface Window {
    google?: {
      maps: {
        places: {
          Autocomplete: new (
            input: HTMLInputElement,
            opts?: { types?: string[]; componentRestrictions?: { country: string | string[] } },
          ) => {
            addListener: (event: string, handler: () => void) => void
            getPlace: () => { formatted_address?: string; name?: string }
          }
        }
      }
    }
  }
}

const SCRIPT_ID = 'google-places-autocomplete-script'

/**
 * Nationwide location input backed by Google Places Autocomplete — replaces
 * the old hardcoded 25-city checkbox list. Falls back to a plain text input
 * if NEXT_PUBLIC_GOOGLE_PLACES_API_KEY isn't configured, so onboarding still
 * works (just without suggestions) rather than breaking.
 */
export function LocationSearchField({ fieldKey, label, isRequired, savedValue }: Props) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState(savedValue)
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY

  useEffect(() => {
    if (!apiKey || !inputRef.current) return

    let cancelled = false

    function initAutocomplete() {
      if (cancelled || !inputRef.current || !window.google?.maps?.places) return
      const autocomplete = new window.google.maps.places.Autocomplete(inputRef.current, {
        types: ['(cities)'],
        componentRestrictions: { country: 'za' },
      })
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace()
        const label = place.formatted_address ?? place.name ?? ''
        if (label) setValue(label)
      })
    }

    if (window.google?.maps?.places) {
      initAutocomplete()
      return
    }

    const existing = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', initAutocomplete)
      return () => existing.removeEventListener('load', initAutocomplete)
    }

    const script = document.createElement('script')
    script.id = SCRIPT_ID
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
    script.async = true
    script.addEventListener('load', initAutocomplete)
    document.head.appendChild(script)

    return () => {
      cancelled = true
      script.removeEventListener('load', initAutocomplete)
    }
  }, [apiKey])

  return (
    <div className="space-y-2">
      <label htmlFor={fieldKey} className="text-sm font-medium text-foreground">
        {label}
        {isRequired && <span className="text-destructive ml-0.5">*</span>}
      </label>
      <input
        ref={inputRef}
        id={fieldKey}
        name={fieldKey}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        required={isRequired}
        placeholder="Start typing your city or town…"
        autoComplete="off"
        className="w-full rounded-[var(--radius)] border border-input bg-card px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground shadow-sm transition-shadow focus:outline-none focus:ring-2 focus:ring-ring focus:border-ring"
      />
      <p className="text-xs text-muted-foreground">
        We serve providers nationwide — search for any town or city in South Africa.
      </p>
    </div>
  )
}
