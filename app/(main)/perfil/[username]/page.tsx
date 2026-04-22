import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { ProfileHeader } from '@/components/profile/ProfileHeader'
import { WhistleCard } from '@/components/feed/WhistleCard'
import { createSignedAudioUrl } from '@/lib/audio-url'
import { sortFeedItems, toFeedItemFromRepost, toFeedItemFromWhistle } from '@/lib/feed'

interface PageProps {
  params: Promise<{ username: string }>
}

export default async function PerfilPage({ params }: PageProps) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  // Follower counts
  const [{ count: followersCount }, { count: followingCount }] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
  ])

  // Is current user following this profile?
  let isFollowing = false
  if (user && user.id !== profile.id) {
    const { data } = await supabase.from('follows')
      .select('follower_id')
      .match({ follower_id: user.id, following_id: profile.id })
      .maybeSingle()
    isFollowing = !!data
  }

  const [{ data: whistles }, { data: reposts }] = await Promise.all([
    supabase
      .from('whistles')
      .select('*, profiles!whistles_user_id_fkey(username, display_name, avatar_url)')
      .eq('user_id', profile.id)
      .is('group_id', null)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('reposts')
      .select('id, user_id, original_whistle_id, group_id, created_at, profiles!reposts_user_id_fkey(username, display_name, avatar_url), whistles!reposts_original_whistle_id_fkey(id, user_id, audio_url, duration_s, caption, likes_count, comments_count, group_id, created_at, profiles!whistles_user_id_fkey(username, display_name, avatar_url))')
      .eq('user_id', profile.id)
      .is('group_id', null)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  // Liked whistle IDs
  const feedItems = sortFeedItems([
    ...await Promise.all((whistles ?? []).map(async (whistle) => toFeedItemFromWhistle({
      ...whistle,
      audio_url: await createSignedAudioUrl(supabase, whistle.audio_url),
    }))),
    ...await Promise.all((reposts ?? []).map(async (repost) => toFeedItemFromRepost({
      ...repost,
      whistles: {
        ...repost.whistles,
        audio_url: await createSignedAudioUrl(supabase, repost.whistles.audio_url),
      },
    }))),
  ])

  const originalWhistleIds = Array.from(new Set(feedItems.map((item) => item.original_whistle_id)))
  const { data: likedRows } = user && originalWhistleIds.length > 0
    ? await supabase.from('likes').select('whistle_id').eq('user_id', user.id).in('whistle_id', originalWhistleIds)
    : { data: [] }
  const likedSet = new Set((likedRows ?? []).map(r => r.whistle_id))
  const { data: repostRows } = user && originalWhistleIds.length > 0
    ? await supabase
      .from('reposts')
      .select('original_whistle_id')
      .eq('user_id', user.id)
      .in('original_whistle_id', originalWhistleIds)
    : { data: [] }
  const repostedSet = new Set((repostRows ?? []).map((row) => row.original_whistle_id))

  return (
    <div>
      <ProfileHeader
        profile={profile}
        followersCount={followersCount ?? 0}
        followingCount={followingCount ?? 0}
        isOwnProfile={user?.id === profile.id}
        isFollowing={isFollowing}
        currentUserId={user?.id ?? null}
      />

      <div>
        {feedItems.length === 0 ? (
          <div className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
            Nenhum assobio ainda.
          </div>
        ) : (
          feedItems.map(item => (
            <WhistleCard
              key={`${item.item_type}-${item.item_id}`}
              whistle={item}
              currentUserId={user?.id ?? null}
              initialLiked={likedSet.has(item.original_whistle_id)}
              initialReposted={repostedSet.has(item.original_whistle_id)}
            />
          ))
        )}
      </div>
    </div>
  )
}
