import Fuse from 'fuse.js'
import type { User } from '../types/index.js'

/**
 * Fuzzy matching configuration for @mentions
 * - threshold: 0.4 means matches need to be at least 60% similar
 * - ignoreLocation: true to match anywhere in the string
 * - includeScore: true to get confidence scores
 */
const FUSE_OPTIONS = {
  keys: ['aliases', 'normalizedName'],
  threshold: 0.4,       // Lower = stricter matching (0 = exact, 1 = match anything)
  ignoreLocation: true, // Don't prefer matches at the start
  includeScore: true,   // Include match score for confidence filtering
  minMatchCharLength: 2 // Minimum characters to match
}

/**
 * Confidence threshold - reject matches with score higher than this
 * Fuse.js scores are 0 (perfect) to 1 (no match)
 */
const CONFIDENCE_THRESHOLD = 0.5

/**
 * Normalize text for matching
 * - Lowercase
 * - Remove accents (María → maria)
 * - Remove special characters
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')                          // Decompose accents
    .replace(/[\u0300-\u036f]/g, '')          // Remove accent marks
    .replace(/[^a-z0-9]/g, '')                // Remove non-alphanumeric
}

/**
 * Prepare users for fuzzy search
 * Creates a searchable index with normalized names and aliases
 */
interface SearchableUser {
  user: User
  aliases: string[]
  normalizedName: string
}

function prepareUsersForSearch(users: User[]): SearchableUser[] {
  return users.map(user => ({
    user,
    aliases: (user.aliases || []).map(a => normalizeText(a)),
    normalizedName: normalizeText(user.name)
  }))
}

/**
 * Match a mention string against group members
 *
 * @param mention - The mention text without @ (e.g., "juan", "maría", "jua")
 * @param groupMembers - Array of User objects to match against
 * @returns The matched User or null if no confident match found
 */
export function matchMention(mention: string, groupMembers: User[]): User | null {
  if (!mention || !groupMembers.length) {
    return null
  }

  const normalizedMention = normalizeText(mention)

  if (normalizedMention.length < 2) {
    return null
  }

  // Prepare searchable data
  const searchableUsers = prepareUsersForSearch(groupMembers)

  // Create Fuse instance
  const fuse = new Fuse(searchableUsers, FUSE_OPTIONS)

  // Search for the mention
  const results = fuse.search(normalizedMention)

  if (results.length === 0) {
    return null
  }

  // Get the best match
  const bestMatch = results[0]

  // Check confidence (score is 0 for perfect match, higher = worse)
  if (bestMatch.score !== undefined && bestMatch.score > CONFIDENCE_THRESHOLD) {
    return null
  }

  return bestMatch.item.user
}

/**
 * Match multiple mentions from a message
 *
 * @param mentions - Array of mention strings (without @)
 * @param groupMembers - Array of User objects to match against
 * @returns Object with matched user IDs and any unmatched mentions
 */
export interface MentionMatchResult {
  matchedUserIds: string[]
  unmatchedMentions: string[]
}

export function matchMentions(mentions: string[], groupMembers: User[]): MentionMatchResult {
  const matchedUserIds: string[] = []
  const unmatchedMentions: string[] = []
  const matchedIds = new Set<string>() // Prevent duplicate matches

  for (const mention of mentions) {
    const matchedUser = matchMention(mention, groupMembers)

    if (matchedUser && !matchedIds.has(matchedUser.id)) {
      matchedUserIds.push(matchedUser.id)
      matchedIds.add(matchedUser.id)
    } else if (!matchedUser) {
      unmatchedMentions.push(mention)
    }
    // If already matched, silently skip (don't add to unmatched)
  }

  return {
    matchedUserIds,
    unmatchedMentions
  }
}

/**
 * Get user IDs from mentions for expense splitting
 * This is the main function to call from the WhatsApp handler
 *
 * @param mentions - Array of mention strings extracted from message (without @)
 * @param groupMembers - Array of User objects in the group
 * @returns Array of user IDs for splitting (empty if no valid matches)
 */
export function resolveMentionsToUserIds(mentions: string[], groupMembers: User[]): string[] {
  if (!mentions.length || !groupMembers.length) {
    return []
  }

  const result = matchMentions(mentions, groupMembers)

  // Log unmatched mentions for debugging (but don't fail)
  if (result.unmatchedMentions.length > 0) {
    console.warn('Unmatched mentions:', result.unmatchedMentions)
  }

  return result.matchedUserIds
}
