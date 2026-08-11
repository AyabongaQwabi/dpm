/**
 * Content moderation word lists — business/policy content, not code. Edit
 * config/content-moderation.json to change a word list; a deploy is
 * required to pick it up (static import, same convention as
 * config/feature-pauses.json).
 */

import contentModerationConfig from '@/config/content-moderation.json'
import type { ModerationWordLists } from '@/lib/domain/content-moderation'

export const MODERATION_WORD_LISTS: ModerationWordLists = {
  claimWords: contentModerationConfig.claimWords,
  competitorNames: contentModerationConfig.competitorNames,
  profanityWords: contentModerationConfig.profanityWords,
}
