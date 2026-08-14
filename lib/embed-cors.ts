/**
 * CORS for public embed endpoints. Providers have no registered/verified
 * domain in the schema (checked: `providers` has no website/domain column
 * usable as an allowlist key — `website` is an unvalidated free-text field
 * editable by the provider, so it cannot anchor a security allowlist), so
 * there is nothing meaningful to allowlist against. These endpoints only
 * ever return data already public and unauthenticated on the provider's
 * ServicePros profile — nothing here is sensitive to a wildcard origin.
 * Wildcard, not allowlist. Revisit if a verified-domain concept is added.
 */
export function embedCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  }
}
