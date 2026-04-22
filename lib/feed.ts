import type { FeedItem } from '@/types/database'

interface ProfilePreview {
  username: string
  display_name: string
  avatar_url: string | null
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
    score: 0,
    username: whistle.profiles.username,
    display_name: whistle.profiles.display_name,
    avatar_url: whistle.profiles.avatar_url,
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
    score: 0,
    username: repost.profiles.username,
    display_name: repost.profiles.display_name,
    avatar_url: repost.profiles.avatar_url,
    original_user_id: repost.whistles.user_id,
    original_username: repost.whistles.profiles.username,
    original_display_name: repost.whistles.profiles.display_name,
    original_avatar_url: repost.whistles.profiles.avatar_url,
  }
}

export function sortFeedItems(items: FeedItem[]) {
  return [...items].sort(
    (left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime()
  )
}
