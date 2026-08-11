import { describe, it, expect, vi } from 'vitest'
import { hashIpAddress, initialFeatureRequestState, type FeatureRequestInsert } from '../feature-requests'
import { submitFeatureRequestWithDeps, type SubmitFeatureRequestDeps } from '../../feature-requests-submit'
import { FEATURE_REQUEST_LIMITS, type FeatureRequestArea, type FeatureRequestRole } from '../../feature-requests-config'

function makeForm(overrides: Record<string, string> = {}) {
  const form = new FormData()
  const values = {
    name: 'Aya Tester',
    email: 'aya@example.com',
    submitterRole: 'provider',
    area: 'profile',
    title: 'Let providers pin their best service',
    description: 'A provider should be able to choose one service that appears first on their profile.',
    sourcePath: '/feature-requests',
    companyWebsite: '',
    ...overrides,
  }
  for (const [key, value] of Object.entries(values)) form.set(key, value)
  return form
}

function makeDeps(overrides: Partial<SubmitFeatureRequestDeps> = {}) {
  const rows: FeatureRequestInsert[] = []
  const deps: SubmitFeatureRequestDeps = {
    countRecentSubmissions: vi.fn(async () => 0),
    insertFeatureRequest: vi.fn(async (row) => {
      rows.push(row)
      return {
        id: `request-${rows.length}`,
        created_at: '2026-08-11T00:00:00Z',
        ...row,
      }
    }),
    sendNotificationEmail: vi.fn(async () => undefined),
    sendConfirmationEmail: vi.fn(async () => undefined),
    logEmailError: vi.fn(),
    ...overrides,
  }
  return { deps, rows }
}

const context = {
  userId: '00000000-0000-0000-0000-000000000001',
  userAgent: 'vitest',
  ipHash: 'hashed-ip',
  now: new Date('2026-08-11T12:00:00Z'),
}

describe('feature request submission', () => {
  it('valid submission inserts a row and returns success', async () => {
    const { deps, rows } = makeDeps()
    const result = await submitFeatureRequestWithDeps(initialFeatureRequestState, makeForm(), context, deps)

    expect(result.ok).toBe(true)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      user_id: context.userId,
      name: 'Aya Tester',
      email: 'aya@example.com',
      submitter_role: 'provider' satisfies FeatureRequestRole,
      area: 'profile' satisfies FeatureRequestArea,
      ip_hash: 'hashed-ip',
    })
    expect(deps.sendNotificationEmail).toHaveBeenCalledOnce()
    expect(deps.sendConfirmationEmail).toHaveBeenCalledOnce()
  })

  it('honeypot filled returns success without inserting a row', async () => {
    const { deps, rows } = makeDeps()
    const result = await submitFeatureRequestWithDeps(
      initialFeatureRequestState,
      makeForm({ companyWebsite: 'https://spam.example' }),
      context,
      deps,
    )

    expect(result.ok).toBe(true)
    expect(rows).toHaveLength(0)
    expect(deps.insertFeatureRequest).not.toHaveBeenCalled()
    expect(deps.sendNotificationEmail).not.toHaveBeenCalled()
  })

  it('rejects an over-length title', async () => {
    const { deps } = makeDeps()
    const result = await submitFeatureRequestWithDeps(
      initialFeatureRequestState,
      makeForm({ title: 'x'.repeat(FEATURE_REQUEST_LIMITS.titleMaxChars + 1) }),
      context,
      deps,
    )

    expect(result.ok).toBe(false)
    expect(result.errors.title).toContain(String(FEATURE_REQUEST_LIMITS.titleMaxChars))
    expect(deps.insertFeatureRequest).not.toHaveBeenCalled()
  })

  it('rejects an over-length description', async () => {
    const { deps } = makeDeps()
    const result = await submitFeatureRequestWithDeps(
      initialFeatureRequestState,
      makeForm({ description: 'x'.repeat(FEATURE_REQUEST_LIMITS.descriptionMaxChars + 1) }),
      context,
      deps,
    )

    expect(result.ok).toBe(false)
    expect(result.errors.description).toContain(String(FEATURE_REQUEST_LIMITS.descriptionMaxChars))
    expect(deps.insertFeatureRequest).not.toHaveBeenCalled()
  })

  it('rejects the fourth submission from the same ip_hash within an hour', async () => {
    const { deps } = makeDeps({
      countRecentSubmissions: vi.fn(async () => 3),
    })

    const result = await submitFeatureRequestWithDeps(initialFeatureRequestState, makeForm(), context, deps)

    expect(result.ok).toBe(false)
    expect(result.message).toContain('recently')
    expect(deps.insertFeatureRequest).not.toHaveBeenCalled()
  })

  it('submits without IP rate limiting when no ip_hash is available', async () => {
    const { deps, rows } = makeDeps({
      countRecentSubmissions: vi.fn(async () => 3),
    })

    const result = await submitFeatureRequestWithDeps(
      initialFeatureRequestState,
      makeForm(),
      { ...context, ipHash: null },
      deps,
    )

    expect(result.ok).toBe(true)
    expect(rows).toHaveLength(1)
    expect(rows[0]?.ip_hash).toBeNull()
    expect(deps.countRecentSubmissions).not.toHaveBeenCalled()
  })

  it('keeps the row and returns success when email sending fails', async () => {
    const { deps, rows } = makeDeps({
      sendNotificationEmail: vi.fn(async () => {
        throw new Error('Resend unavailable')
      }),
    })

    const result = await submitFeatureRequestWithDeps(initialFeatureRequestState, makeForm(), context, deps)

    expect(result.ok).toBe(true)
    expect(rows).toHaveLength(1)
    expect(deps.logEmailError).toHaveBeenCalledOnce()
  })

  it('hashes IP addresses without exposing the raw address', () => {
    const hash = hashIpAddress('203.0.113.10', 'test-salt')
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
    expect(hash).not.toContain('203.0.113.10')
  })
})
