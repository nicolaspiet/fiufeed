import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CommentForm } from '@/components/comments/CommentForm'
import { WhistleCard } from '@/components/feed/WhistleCard'
import { createSignedAudioUrl } from '@/lib/audio-url'
import { toFeedItemFromWhistle } from '@/lib/feed'
import { getEquippedDecorations } from '@/lib/profile-decorations'

interface PageProps {
  params: Promise<{ id: string }>
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'agora'
  if (m < 60) return `${m}m`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}d`
  return new Date(dateStr).toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })
}

export default async function AssobioPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: whistle } = await supabase
    .from('whistles')
    .select('*, profiles!whistles_user_id_fkey(id, username, display_name, avatar_url, equipped_badge_id, equipped_title_id)')
    .eq('id', id)
    .single()

  if (!whistle) notFound()

  const { data: competitionEntry } = await supabase
    .from('competition_entries')
    .select('competition_id')
    .eq('whistle_id', id)
    .maybeSingle()

  if (competitionEntry?.competition_id) {
    redirect(`/competicoes/${competitionEntry.competition_id}`)
  }

  const { data: comments } = await supabase
    .from('comments')
    .select('id, content, created_at, user_id')
    .eq('whistle_id', id)
    .order('created_at', { ascending: true })

  const commentUserIds = Array.from(new Set((comments ?? []).map((comment) => comment.user_id)))
  const { data: commentProfiles } = commentUserIds.length > 0
    ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', commentUserIds)
    : { data: [] }

  const profileById = new Map((commentProfiles ?? []).map((profile) => [profile.id, profile]))
  const decorationMap = await getEquippedDecorations(supabase, [whistle.profiles])

  const { data: likedRow } = user
    ? await supabase.from('likes').select('whistle_id').match({ user_id: user.id, whistle_id: id }).maybeSingle()
    : { data: null }
  const { data: repostRow } = user
    ? await supabase.from('reposts').select('id').match({ user_id: user.id, original_whistle_id: id }).maybeSingle()
    : { data: null }

  const feedItem = toFeedItemFromWhistle({
    ...whistle,
    profiles: {
      ...whistle.profiles,
      ...decorationMap.get(whistle.profiles.id),
    },
    audio_url: await createSignedAudioUrl(supabase, whistle.audio_url),
  })

  const hydratedComments = (comments ?? [])
    .map((comment) => ({
      ...comment,
      profile: profileById.get(comment.user_id) ?? null,
    }))
    .filter((comment): comment is typeof comment & { profile: NonNullable<typeof comment.profile> } => Boolean(comment.profile))

  return (
    <div>
      <div className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Assobio</h1>
      </div>

      <WhistleCard
        whistle={feedItem}
        currentUserId={user?.id ?? null}
        initialLiked={Boolean(likedRow)}
        initialReposted={Boolean(repostRow)}
      />

      <div className="border-b px-4 py-4" style={{ borderColor: 'var(--border)' }}>
        <CommentForm whistleId={id} currentUserId={user?.id ?? null} />
      </div>

      <section>
        <div className="border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>
            Comentarios
          </h2>
        </div>

        {hydratedComments.length === 0 ? (
          <p className="px-4 py-8 text-sm" style={{ color: 'var(--text-faint)' }}>
            Ainda nao ha comentarios por aqui.
          </p>
        ) : (
          hydratedComments.map((comment) => (
            <article key={comment.id} className="border-b px-4 py-4" style={{ borderColor: 'var(--border)' }}>
              <div className="flex gap-3">
                <Link href={`/perfil/${comment.profile.username}`} className="flex-shrink-0">
                  {comment.profile.avatar_url ? (
                    <img src={comment.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                      {comment.profile.display_name?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  )}
                </Link>

                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <Link href={`/perfil/${comment.profile.username}`} className="truncate text-sm font-semibold hover:underline" style={{ color: 'var(--text)' }}>
                      {comment.profile.display_name}
                    </Link>
                    <span className="truncate text-sm" style={{ color: 'var(--text-muted)' }}>@{comment.profile.username}</span>
                    <span className="flex-shrink-0 text-xs" style={{ color: 'var(--text-faint)' }}>· {timeAgo(comment.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                    {comment.content}
                  </p>
                </div>
              </div>
            </article>
          ))
        )}
      </section>
    </div>
  )
}
