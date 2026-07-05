import { createHash, randomInt } from 'node:crypto'

const CODE_LENGTH = 6
const CODE_TTL_MS = 24 * 60 * 60 * 1000

export function generateClaimCode(): string {
  return String(randomInt(0, 1_000_000)).padStart(CODE_LENGTH, '0')
}

export function hashClaimCode(code: string): string {
  const pepper = process.env.CLAIM_CODE_PEPPER ?? 'dev-claim-pepper-change-me'
  return createHash('sha256').update(`${pepper}:${code}`).digest('hex')
}

export function verifyClaimCode(code: string, storedHash: string): boolean {
  return hashClaimCode(code) === storedHash
}

export function claimCodeExpiresAt(now: Date = new Date()): string {
  return new Date(now.getTime() + CODE_TTL_MS).toISOString()
}
