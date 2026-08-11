import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()

function read(path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

describe('nurture email architecture', () => {
  it('stores nurture copy and timing in JSON config', () => {
    const config = read('config/nurture-emails.json')
    const loader = read('lib/nurture-emails-config.ts')

    expect(config).toContain('"provider_onboarding_v1"')
    expect(config).toContain('"customer_onboarding_v1"')
    expect(config).toContain('"offsetDays"')
    expect(loader).toContain("import nurtureEmailConfig from '@/config/nurture-emails.json'")
  })

  it('uses a database queue with idempotency instead of many cron schedules', () => {
    const migration = read('supabase/migrations/20260816000000_nurture_email_queue.sql')
    const actions = read('lib/actions/nurture-emails.ts')

    expect(migration).toContain('CREATE TABLE nurture_email_queue')
    expect(migration).toContain('idempotency_key  TEXT NOT NULL UNIQUE')
    expect(actions).toContain('.upsert(rows, { onConflict: \'idempotency_key\', ignoreDuplicates: true })')
    expect(actions).toContain('processDueNurtureEmails')
  })

  it('keeps all Vercel cron schedules Hobby-compatible daily schedules', () => {
    const vercel = JSON.parse(read('vercel.json')) as { crons: Array<{ path: string; schedule: string }> }

    expect(vercel.crons.some((cron) => cron.path === '/api/cron/nurture-emails')).toBe(true)
    for (const cron of vercel.crons) {
      const fields = cron.schedule.trim().split(/\s+/)
      expect(fields).toHaveLength(5)
      expect(fields[0], `${cron.path} minute field`).toMatch(/^\d+$/)
      expect(fields[1], `${cron.path} hour field`).toMatch(/^\d+$/)
      expect(fields[2], `${cron.path} day-of-month field`).toBe('*')
      expect(fields[3], `${cron.path} month field`).toBe('*')
      expect(fields[4], `${cron.path} day-of-week field`).toBe('*')
    }
  })

  it('enrolls customers and providers at creation time and sends welcome immediately', () => {
    const customerSignup = read('app/(auth)/sign-up/page.tsx')
    const onboarding = read('lib/actions/onboarding.ts')

    expect(customerSignup).toContain('enqueueNurtureSequence')
    expect(customerSignup).toContain("processImmediateNurtureWelcome('customer'")
    expect(onboarding).toContain('enqueueNurtureSequence')
    expect(onboarding).toContain("processImmediateNurtureWelcome('provider'")
  })

  it('adds one secured daily cron endpoint for nurture delivery', () => {
    const route = read('app/api/cron/nurture-emails/route.ts')

    expect(route).toContain('CRON_SECRET')
    expect(route).toContain('processDueNurtureEmails')
  })
})
