import { notFound } from 'next/navigation'
import { Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signAudioUrls } from '@/lib/audio-url'
import { CompetitionEntries } from '@/components/competition/CompetitionEntries'
import { CountdownTimer } from '@/components/competition/CountdownTimer'
import { SubmitEntryButton } from '@/components/competition/SubmitEntryButton'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function CompeticaoPage({ params }: PageProps) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: competition } = await supabase.from('competitions').select('*').eq('id', id).single()
  if (!competition) notFound()

  const now = Date.now()
  const submissionOpen = now < new Date(competition.submission_ends_at).getTime()
  const votingOpen = !submissionOpen && now < new Date(competition.voting_ends_at).getTime()
  const ended = !submissionOpen && !votingOpen

  let entries: Array<{
    id: string
    user_id: string
    votes_count: number
    profiles: { username: string; display_name: string; avatar_url: string | null }
    whistles: { audio_url: string; duration_s: number; caption: string }
  }> = []

  if (!submissionOpen) {
    const { data } = await supabase
      .from('competition_entries')
      .select('*, profiles!inner(username, display_name, avatar_url), whistles!inner(audio_url, duration_s, caption)')
      .eq('competition_id', id)
      .order('votes_count', { ascending: false })
    entries = await Promise.all(
      (data ?? []).map(async (entry) => ({
        ...entry,
        whistles: (await signAudioUrls(supabase, [entry.whistles]))[0],
      }))
    )
  }

  let userEntry: string | null = null
  let userVotedEntry: string | null = null
  let ownSubmission: (typeof entries)[number] | null = null

  if (user) {
    const { data: entryRow } = await supabase
      .from('competition_entries')
      .select('id, user_id, votes_count, profiles!inner(username, display_name, avatar_url), whistles!inner(audio_url, duration_s, caption)')
      .match({ competition_id: id, user_id: user.id })
      .maybeSingle()
    userEntry = entryRow?.id ?? null
    ownSubmission = entryRow
      ? {
        ...entryRow,
        whistles: (await signAudioUrls(supabase, [entryRow.whistles]))[0],
      }
      : null

    const { data: voteRow } = await supabase
      .from('competition_votes')
      .select('entry_id')
      .match({ competition_id: id, user_id: user.id })
      .maybeSingle()
    userVotedEntry = voteRow?.entry_id ?? null
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
        <div className="space-y-1">
          {submissionOpen && <CountdownTimer endsAt={competition.submission_ends_at} label="Envios encerram em" />}
          {votingOpen && <CountdownTimer endsAt={competition.voting_ends_at} label="Votação encerra em" />}
          {ended && <p className="text-sm" style={{ color: 'var(--text-faint)' }}>Competição encerrada</p>}
        </div>
      </div>

      {submissionOpen && user && !userEntry && (
        <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
          <SubmitEntryButton competitionId={id} competitionTitle={competition.title} userId={user.id} />
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
            competitionId={id}
            canVote={false}
            userVotedEntry={userVotedEntry}
            userEntry={userEntry}
            ended={false}
          />
        </>
      )}

      {submissionOpen && !ownSubmission && (
        <p className="px-4 py-8 text-sm" style={{ color: 'var(--text-faint)' }}>
          As participações ficam públicas quando a fase de envios terminar.
        </p>
      )}

      {!submissionOpen && (
        <CompetitionEntries
          entries={entries}
          currentUserId={user?.id ?? null}
          competitionId={id}
          canVote={votingOpen}
          userVotedEntry={userVotedEntry}
          userEntry={userEntry}
          ended={ended}
        />
      )}
    </div>
  )
}
