import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { submitNpsResponse } from '@/lib/actions/nps'

export const metadata: Metadata = {
  title: 'Quick survey — ServicePros',
  robots: { index: false, follow: false },
}

interface NpsPageProps {
  params: Promise<{ token: string }>
  searchParams: Promise<{ done?: string; error?: string }>
}

async function submit(formData: FormData) {
  'use server'
  const token = formData.get('token') as string
  const score = Number(formData.get('score'))
  const verbatim = (formData.get('verbatim') as string | null) ?? null

  const { redirect } = await import('next/navigation')
  const result = await submitNpsResponse({ token, score, verbatim })

  if (result.ok) {
    redirect(`/nps/${token}?done=1`)
  }
  redirect(`/nps/${token}?error=${encodeURIComponent(result.error ?? 'Something went wrong.')}`)
}

export default async function NpsPage({ params, searchParams }: NpsPageProps) {
  const { token } = await params
  const { done, error } = await searchParams

  const admin = createAdminClient()
  const { data: survey } = await admin
    .from('nps_survey_queue')
    .select('id, side')
    .eq('survey_token', token)
    .maybeSingle()

  const { data: existingResponse } = survey
    ? await admin.from('satisfaction_responses').select('id').eq('survey_id', survey.id).maybeSingle()
    : { data: null }

  const alreadyAnswered = done === '1' || Boolean(existingResponse)

  if (!survey) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <p className="text-muted-foreground">This survey link isn&apos;t valid.</p>
      </main>
    )
  }

  if (alreadyAnswered) {
    return (
      <main className="mx-auto max-w-md px-4 py-16 text-center">
        <h1 className="text-xl font-semibold mb-2">Thank you</h1>
        <p className="text-muted-foreground">Your response has been recorded.</p>
      </main>
    )
  }

  const question =
    survey.side === 'customer'
      ? 'How likely are you to recommend ServicePros to a friend or colleague?'
      : 'How likely are you to recommend ServicePros to another business owner?'

  return (
    <main className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-xl font-semibold mb-4">{question}</h1>
      {error && <p className="text-red-600 text-sm mb-4">{decodeURIComponent(error)}</p>}
      <form action={submit} className="space-y-6">
        <input type="hidden" name="token" value={token} />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 11 }, (_, score) => (
            <button
              key={score}
              type="submit"
              name="score"
              value={score}
              className="h-10 w-10 rounded-md border border-input text-sm font-medium hover:bg-muted transition-colors"
            >
              {score}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">0 = not at all likely, 10 = extremely likely. Clicking a number submits your answer.</p>
        <label className="block text-sm">
          Anything you&apos;d like to add? (optional)
          <textarea
            name="verbatim"
            rows={3}
            className="mt-1 w-full rounded-md border border-input px-3 py-2 text-sm"
            maxLength={2000}
          />
        </label>
      </form>
    </main>
  )
}
