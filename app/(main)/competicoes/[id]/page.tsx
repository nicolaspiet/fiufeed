import { notFound, redirect } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signAudioUrls } from '@/lib/audio-url'
import { CompetitionEntries } from '@/components/competition/CompetitionEntries'
import { CountdownTimer } from '@/components/competition/CountdownTimer'
import { SubmitEntryButton } from '@/components/competition/SubmitEntryButton'
import { getEquippedDecorations } from '@/lib/profile-decorations'
import { buildCompetitionPath, extractCompetitionPublicId, isUuid } from '@/lib/routes'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompeticaoPage({ params }: PageProps) {
  const { id: segment } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const lookupPublicId = extractCompetitionPublicId(segment)
  const competitionQuery = supabase.from('competitions').select('*')
  const { data: competition } = isUuid(segment)
    ? await competitionQuery.eq('id', segment).single()
    : await competitionQuery.eq('public_id', lookupPublicId ?? segment).single()

  if (!competition) notFound()

  const canonicalPath = buildCompetitionPath(competition)
  if (canonicalPath !== `/competicoes/${segment}`) {
    redirect(canonicalPath)
  }

  const competitionId = competition.id

  const now = Date.now()
  const submissionOpen = now < new Date(competition.submission_ends_at).getTime()
  const votingOpen = !submissionOpen && now < new Date(competition.voting_ends_at).getTime()
  const ended = !submissionOpen && !votingOpen
  const winnerHighlightOpen = ended && now < new Date(competition.voting_ends_at).getTime() + 3600000

  if (ended) {
    await supabase.rpc('settle_competition_rewards', { p_competition_id: competitionId })
  }

  let userEntry: string | null = null
  let userVotedEntry: string | null = null
  let ownSubmission: {
    id: string
    user_id: string
    votes_count: number
    profiles: {
      username: string
      display_name: string
      avatar_url: string | null
      equipped_badge_label?: string | null
      equipped_title?: string | null
    }
    whistles: { audio_url: string; duration_s: number; caption: string }
  } | null = null

  if (user) {
    const { data: entryRow } = await supabase
      .from('competition_entries')
      .select('id, user_id, votes_count, profiles!inner(id, username, display_name, avatar_url, equipped_badge_id, equipped_title_id), whistles!inner(audio_url, duration_s, caption)')
      .match({ competition_id: competitionId, user_id: user.id })
      .maybeSingle()

    if (entryRow) {
      const decorationMap = await getEquippedDecorations(supabase, [entryRow.profiles])
      userEntry = entryRow.id
      ownSubmission = {
        ...entryRow,
        profiles: {
          ...entryRow.profiles,
          ...decorationMap.get(entryRow.profiles.id),
        },
        whistles: (await signAudioUrls(supabase, [entryRow.whistles]))[0],
      }
    }

    const { data: voteRow } = await supabase
      .from('competition_votes')
      .select('entry_id')
      .match({ competition_id: competitionId, user_id: user.id })
      .maybeSingle()
    userVotedEntry = voteRow?.entry_id ?? null
  }

  const isParticipant = Boolean(userEntry)

  let entries: Array<{
    id: string
    user_id: string
    votes_count: number
    profiles: {
      username: string
      display_name: string
      avatar_url: string | null
      equipped_badge_label?: string | null
      equipped_title?: string | null
    }
    whistles: { audio_url: string; duration_s: number; caption: string }
  }> = []

  if (!submissionOpen && isParticipant) {
    const { data } = await supabase
      .from('competition_entries')
      .select('*, profiles!inner(id, username, display_name, avatar_url, equipped_badge_id, equipped_title_id), whistles!inner(audio_url, duration_s, caption)')
      .eq('competition_id', competitionId)
      .order('votes_count', { ascending: false })
      .order('created_at', { ascending: true })

    const decorationMap = await getEquippedDecorations(supabase, (data ?? []).map((entry) => entry.profiles))

    entries = await Promise.all(
      (data ?? []).map(async (entry) => ({
        ...entry,
        profiles: {
          ...entry.profiles,
          ...decorationMap.get(entry.profiles.id),
        },
        whistles: (await signAudioUrls(supabase, [entry.whistles]))[0],
      }))
    )
  }

  let commentsByEntry: Record<string, Array<{
    id: string
    content: string
    created_at: string
    user_id: string
    profile: { username: string; display_name: string; avatar_url: string | null }
  }>> = {}

  if (!submissionOpen && isParticipant) {
    const { data: competitionComments } = await supabase
      .from('competition_comments')
      .select('id, entry_id, user_id, content, created_at')
      .eq('competition_id', competitionId)
      .order('created_at', { ascending: true })

    const commentUserIds = Array.from(new Set((competitionComments ?? []).map((comment) => comment.user_id)))
    const { data: commentProfiles } = commentUserIds.length > 0
      ? await supabase.from('profiles').select('id, username, display_name, avatar_url').in('id', commentUserIds)
      : { data: [] }

    const profileById = new Map((commentProfiles ?? []).map((profile) => [profile.id, profile]))

    commentsByEntry = (competitionComments ?? []).reduce<Record<string, Array<{
      id: string
      content: string
      created_at: string
      user_id: string
      profile: { username: string; display_name: string; avatar_url: string | null }
    }>>>((accumulator, comment) => {
      const profile = profileById.get(comment.user_id)
      if (!profile) return accumulator
      accumulator[comment.entry_id] = [
        ...(accumulator[comment.entry_id] ?? []),
        {
          ...comment,
          profile: {
            username: profile.username,
            display_name: profile.display_name,
            avatar_url: profile.avatar_url,
          },
        },
      ]
      return accumulator
    }, {})
  }

  return (
    <div>
      <div className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-2">
          <Trophy size={18} className="text-emerald-400" />
          <h1 className="truncate text-lg font-bold" style={{ color: 'var(--text)' }}>{competition.title}</h1>
        </div>
      </div>

      <div className="space-y-2 border-b px-4 py-4" style={{ borderColor: 'var(--border)' }}>
        <div className="inline-block rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-semibold text-emerald-400">
          Tema: {competition.theme}
        </div>
        {competition.description && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{competition.description}</p>}
        <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
          Títulos em jogo: Ouro {competition.title_base}, Prata {competition.title_base}, Bronze {competition.title_base}
        </p>
        <div className="space-y-1">
          {submissionOpen && <CountdownTimer endsAt={competition.submission_ends_at} label="Envios encerram em" />}
          {votingOpen && <CountdownTimer endsAt={competition.voting_ends_at} label="Votação encerra em" />}
          {ended && <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Competição encerrada</p>}
        </div>
      </div>

      {submissionOpen && user && !userEntry && (
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <SubmitEntryButton
            competitionId={competitionId}
            competitionTitle={competition.title}
            competitionGroupId={competition.group_id}
            userId={user.id}
          />
        </div>
      )}

      {submissionOpen && ownSubmission && (
        <>
          <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)', background: 'var(--surface)' }}>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Sua participação foi recebida</h2>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
              Ela aparece só para você até a fase de envios terminar.
            </p>
          </div>
          <CompetitionEntries
            entries={[ownSubmission]}
            currentUserId={user?.id ?? null}
            competitionId={competitionId}
            canVote={false}
            canComment={false}
            userVotedEntry={userVotedEntry}
            userEntry={userEntry}
            ended={false}
            showWinnerHighlight={false}
            titleBase={competition.title_base}
            commentsByEntry={{}}
          />
        </>
      )}

      {submissionOpen && !ownSubmission && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--text-faint)' }}>
          As participações ficam visíveis apenas para quem entrou na competição quando a votação começar.
        </p>
      )}

      {!submissionOpen && !isParticipant && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--text-faint)' }}>
          Só quem entrou na competição pode ver as participações, votar e comentar.
        </p>
      )}

      {!submissionOpen && isParticipant && (
        <CompetitionEntries
          entries={entries}
          currentUserId={user?.id ?? null}
          competitionId={competitionId}
          canVote={votingOpen}
          canComment={votingOpen || ended}
          userVotedEntry={userVotedEntry}
          userEntry={userEntry}
          ended={ended}
          showWinnerHighlight={winnerHighlightOpen}
          titleBase={competition.title_base}
          commentsByEntry={commentsByEntry}
        />
      )}
    </div>
  )
}
