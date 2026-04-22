import type { FeedItem } from '@/types/database'

interface ProfilePreview {
  username: string
  display_name: string
  avatar_url: string | null
  equipped_badge_id?: string | null
  equipped_title_id?: string | null
  equipped_badge_label?: string | null
  equipped_title?: string | null
}

interface WhistleRowWithProfile {
  id: string
  user_id: string
  audio_url: string
  duration_s: number
  caption: string
  likes_count: number
  comments_count: number
  group_id: string | null
  created_at: string
  profiles: ProfilePreview
}

interface RepostRowWithRelations {
  id: string
  user_id: string
  original_whistle_id: string
  group_id: string | null
  created_at: string
  profiles: ProfilePreview
  whistles: WhistleRowWithProfile
}

function baseScore(createdAt: string, likes: number, comments: number) {
  return (
    2 + likes * 1.5 + comments * 1.9
  ) / (Date.now() - new Date(createdAt).getTime() + 1000)
}

export function toFeedItemFromWhistle(whistle: WhistleRowWithProfile): FeedItem {
  return {
    item_type: 'whistle',
    item_id: whistle.id,
    original_whistle_id: whistle.id,
    actor_user_id: whistle.user_id,
    audio_url: whistle.audio_url,
    duration_s: whistle.duration_s,
    caption: whistle.caption,
    likes_count: whistle.likes_count,
    comments_count: whistle.comments_count,
    group_id: whistle.group_id ?? null,
    created_at: whistle.created_at,
    score: baseScore(whistle.created_at, whistle.likes_count, whistle.comments_count),
    username: whistle.profiles.username,
    display_name: whistle.profiles.display_name,
    avatar_url: whistle.profiles.avatar_url,
    equipped_badge_label: whistle.profiles.equipped_badge_label ?? null,
    equipped_title: whistle.profiles.equipped_title ?? null,
    original_user_id: whistle.user_id,
    original_username: whistle.profiles.username,
    original_display_name: whistle.profiles.display_name,
    original_avatar_url: whistle.profiles.avatar_url,
  }
}

export function toFeedItemFromRepost(repost: RepostRowWithRelations): FeedItem {
  return {
    item_type: 'repost',
    item_id: repost.id,
    original_whistle_id: repost.original_whistle_id,
    actor_user_id: repost.user_id,
    audio_url: repost.whistles.audio_url,
    duration_s: repost.whistles.duration_s,
    caption: repost.whistles.caption,
    likes_count: repost.whistles.likes_count,
    comments_count: repost.whistles.comments_count,
    group_id: repost.group_id ?? null,
    created_at: repost.created_at,
    score: baseScore(repost.created_at, repost.whistles.likes_count, repost.whistles.comments_count),
    username: repost.profiles.username,
    display_name: repost.profiles.display_name,
    avatar_url: repost.profiles.avatar_url,
    equipped_badge_label: repost.profiles.equipped_badge_label ?? null,
    equipped_title: repost.profiles.equipped_title ?? null,
    original_user_id: repost.whistles.user_id,
    original_username: repost.whistles.profiles.username,
    original_display_name: repost.whistles.profiles.display_name,
    original_avatar_url: repost.whistles.profiles.avatar_url,
  }
}

function pickBetterCandidate(current: FeedItem, candidate: FeedItem) {
  if (candidate.score !== current.score) {
    return candidate.score > current.score ? candidate : current
  }

  if (current.item_type !== candidate.item_type) {
    return current.item_type === 'whistle' ? current : candidate
  }

  return new Date(candidate.created_at).getTime() > new Date(current.created_at).getTime() ? candidate : current
}

export function stabilizeFeedItems(items: FeedItem[], limit = items.length) {
  const byOriginal = new Map<string, FeedItem>()

  for (const item of items) {
    const existing = byOriginal.get(item.original_whistle_id)
    byOriginal.set(item.original_whistle_id, existing ? pickBetterCandidate(existing, item) : item)
  }

  const ranked = [...byOriginal.values()].sort((left, right) => {
    if (right.score !== left.score) return right.score - left.score
    return new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  })

  const picked: FeedItem[] = []
  const deferred: FeedItem[] = []
  const authorCounts = new Map<string, number>()
  const groupCounts = new Map<string, number>()

  for (const item of ranked) {
    const authorCount = authorCounts.get(item.actor_user_id) ?? 0
    const groupKey = item.group_id ?? 'public'
    const groupCount = groupCounts.get(groupKey) ?? 0
    const previous = picked[picked.length - 1]

    const violatesAdjacency = previous?.actor_user_id === item.actor_user_id
    const violatesAuthorCap = authorCount >= 2
    const violatesGroupCap = groupCount >= 3

    if (violatesAdjacency || violatesAuthorCap || violatesGroupCap) {
      deferred.push(item)
      continue
    }

    picked.push(item)
    authorCounts.set(item.actor_user_id, authorCount + 1)
    groupCounts.set(groupKey, groupCount + 1)
  }

  for (const item of deferred) {
    if (picked.length >= limit) break

    const authorCount = authorCounts.get(item.actor_user_id) ?? 0
    const groupKey = item.group_id ?? 'public'
    const groupCount = groupCounts.get(groupKey) ?? 0

    if (authorCount >= 3 || groupCount >= 4) continue

    picked.push(item)
    authorCounts.set(item.actor_user_id, authorCount + 1)
    groupCounts.set(groupKey, groupCount + 1)
  }

  return picked.slice(0, limit)
}

export function sortFeedItems(items: FeedItem[]) {
  return stabilizeFeedItems(
    [...items].sort(
      (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
    )
  )
}
