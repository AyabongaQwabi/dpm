import servicePackageRulesConfig from '@/config/service-package-rules.json'

export const SERVICE_PACKAGE_TITLE_MIN_CHARS = servicePackageRulesConfig.title.minChars
export const SERVICE_PACKAGE_TITLE_MAX_CHARS = servicePackageRulesConfig.title.maxChars
export const SERVICE_PACKAGE_TITLE_MAX_WORDS = servicePackageRulesConfig.title.maxWords
export const SERVICE_PACKAGE_TITLE_ALLOWED_PATTERN = servicePackageRulesConfig.title.allowedPattern
export const SERVICE_PACKAGE_TITLE_GUIDANCE = servicePackageRulesConfig.title.guidance
export const SERVICE_PACKAGE_OFFERINGS_MAX_ITEMS = servicePackageRulesConfig.offerings.maxItems
export const SERVICE_PACKAGE_OFFERING_MAX_CHARS = servicePackageRulesConfig.offerings.maxItemChars

const allowedTitlePattern = new RegExp(SERVICE_PACKAGE_TITLE_ALLOWED_PATTERN)

export function normaliseServicePackageTitle(title: string): string {
  return title.trim().replace(/\s+/g, ' ')
}

export function validateServicePackageTitle(title: string): string | null {
  const trimmed = normaliseServicePackageTitle(title)

  if (trimmed.length < SERVICE_PACKAGE_TITLE_MIN_CHARS) {
    return `Package name must be at least ${SERVICE_PACKAGE_TITLE_MIN_CHARS} characters.`
  }

  if (trimmed.length > SERVICE_PACKAGE_TITLE_MAX_CHARS) {
    return `Package name must be ${SERVICE_PACKAGE_TITLE_MAX_CHARS} characters or fewer.`
  }

  if (trimmed.split(/\s+/).length > SERVICE_PACKAGE_TITLE_MAX_WORDS) {
    return `Package name must be ${SERVICE_PACKAGE_TITLE_MAX_WORDS} words or fewer.`
  }

  if (!allowedTitlePattern.test(trimmed)) {
    return 'Package name can use letters, numbers, spaces, and simple punctuation only.'
  }

  return null
}
