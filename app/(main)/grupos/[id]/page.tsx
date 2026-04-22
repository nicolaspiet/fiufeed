import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { WhistleCard } from '@/components/feed/WhistleCard'
import { GroupHeader } from '@/components/groups/GroupHeader'
import { GroupMembersManager } from '@/components/groups/GroupMembersManager'
import { createSignedAudioUrl } from '@/lib/audio-url'
import { sortFeedItems, toFeedItemFromRepost, toFeedItemFromWhistle } from '@/lib/feed'
import { getEquippedDecorations } from '@/lib/profile-decorations'
import { filterOutCompetitionReposts, filterOutCompetitionWhistles, getCompetitionWhistleIds } from '@/lib/competition'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function GrupoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: group } = await supabase.from('groups').select('*').eq('id', id).single()
  if (!group) notFound()

  let isMember = false
  let memberRole: 'owner' | 'admin' | 'member' | null = null
  if (user) {
    const { data } = await supabase.from('group_members')
      .select('role')
      .match({ group_id: id, user_id: user.id })
      .maybeSingle()
    isMember = !!data
    memberRole = (data?.role as 'owner' | 'admin' | 'member' | undefined) ?? null
  }

  if (group.is_private && !isMember) {
    return (
      <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
        <div className="mb-4 text-5xl">🔒</div>
        <h2 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text)' }}>{group.name}</h2>
        <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Este grupo e privado. Peca ao administrador um convite.</p>
      </div>
    )
  }

  const { data: members } = await supabase.from('group_members').select('user_id, role').eq('group_id', id)
  const memberUserIds = Array.from(new Set((members ?? []).map((member) => member.user_id)))
  const { data: memberProfiles } = memberUserIds.length > 0
    ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', memberUserIds)
    : { data: [] }

  const profileById = new Map((memberProfiles ?? []).map((profile) => [profile.id, profile]))
  const hydratedMembers = (members ?? [])
    .map((member) => {
      const profile = profileById.get(member.user_id)
      if (!profile) return null
      return {
        user_id: member.user_id,
        role: member.role as 'owner' | 'admin' | 'member',
        profile: {
          username: profile.username,
          display_name: profile.display_name,
          avatar_url: profile.avatar_url,
        },
      }
    })
    .filter((member): member is NonNullable<typeof member> => Boolean(member))
    .sort((left, right) => {
      const order = { owner: 0, admin: 1, member: 2 }
      return order[left.role] - order[right.role]
    })

  const competitionWhistleIds = await getCompetitionWhistleIds(supabase)

  const [{ data: whistlesRaw }, { data: repostsRaw }] = await Promise.all([
    supabase
      .from('whistles')
      .select('*, profiles!whistles_user_id_fkey(id, username, display_name, avatar_url, equipped_badge_id, equipped_title_id)')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('reposts')
      .select('id, user_id, original_whistle_id, group_id, created_at, profiles!reposts_user_id_fkey(id, username, display_name, avatar_url, equipped_badge_id, equipped_title_id), whistles!reposts_original_whistle_id_fkey(id, user_id, audio_url, duration_s, caption, likes_count, comments_count, group_id, created_at, profiles!whistles_user_id_fkey(id, username, display_name, avatar_url, equipped_badge_id, equipped_title_id))')
      .eq('group_id', id)
      .order('created_at', { ascending: false })
      .limit(30),
  ])

  const whistles = filterOutCompetitionWhistles(whistlesRaw ?? [], competitionWhistleIds)
  const reposts = filterOutCompetitionReposts(repostsRaw ?? [], competitionWhistleIds)
  const decorationMap = await getEquippedDecorations(supabase, [
    ...whistles.map((whistle) => whistle.profiles),
    ...reposts.map((repost) => repost.profiles),
    ...reposts.map((repost) => repost.whistles.profiles),
  ])

  const feedItems = sortFeedItems([
    ...await Promise.all((whistles ?? []).map(async (whistle) => toFeedItemFromWhistle({
      ...whistle,
      profiles: {
        ...whistle.profiles,
        ...decorationMap.get(whistle.profiles.id),
      },
      audio_url: await createSignedAudioUrl(supabase, whistle.audio_url),
    }))),
    ...await Promise.all((reposts ?? []).map(async (repost) => toFeedItemFromRepost({
      ...repost,
      profiles: {
        ...repost.profiles,
        ...decorationMap.get(repost.profiles.id),
      },
      whistles: {
        ...repost.whistles,
        profiles: {
          ...repost.whistles.profiles,
          ...decorationMap.get(repost.whistles.profiles.id),
        },
        audio_url: await createSignedAudioUrl(supabase, repost.whistles.audio_url),
      },
    }))),
  ])

  const originalWhistleIds = Array.from(new Set(feedItems.map((item) => item.original_whistle_id)))
  const { data: likedRows } = user && originalWhistleIds.length > 0
    ? await supabase.from('likes').select('whistle_id').eq('user_id', user.id).in('whistle_id', originalWhistleIds)
    : { data: [] }
  const likedSet = new Set((likedRows ?? []).map((row) => row.whistle_id))
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
      <GroupHeader
        group={group}
        isMember={isMember}
        memberRole={memberRole}
        membersCount={members?.length ?? 0}
        currentUserId={user?.id ?? null}
      />

      <GroupMembersManager
        groupId={group.id}
        currentUserId={user?.id ?? null}
        currentUserRole={memberRole}
        members={hydratedMembers}
      />

      {feedItems.length === 0 ? (
        <div className="py-16 text-center text-sm" style={{ color: 'var(--text-faint)' }}>
          {isMember ? 'Nenhum assobio neste grupo ainda. Seja o primeiro!' : 'Nenhum assobio neste grupo ainda.'}
        </div>
      ) : (
        feedItems.map((item) => (
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
  )
}
