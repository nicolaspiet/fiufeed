'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Bird, Crown, Heart } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { WhistlePlayer } from '@/components/audio/WhistlePlayer'
import { CompetitionComments } from '@/components/competition/CompetitionComments'

interface EntryComment {
  id: string
  content: string
  created_at: string
  user_id: string
  profile: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

interface Entry {
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
}

interface CompetitionEntriesProps {
  entries: Entry[]
  currentUserId: string | null
  competitionId: string
  canVote: boolean
  canComment: boolean
  userVotedEntry: string | null
  userEntry: string | null
  ended: boolean
  showWinnerHighlight: boolean
  titleBase: string
  commentsByEntry: Record<string, EntryComment[]>
}

function awardTitle(titleBase: string, place: number) {
  if (place === 1) return `Ouro ${titleBase}`
  if (place === 2) return `Prata ${titleBase}`
  if (place === 3) return `Bronze ${titleBase}`
  return null
}

export function CompetitionEntries({
  entries,
  currentUserId,
  competitionId,
  canVote,
  canComment,
  userVotedEntry: initialVotedEntry,
  userEntry,
  ended,
  showWinnerHighlight,
  titleBase,
  commentsByEntry,
}: CompetitionEntriesProps) {
  const supabase = createClient()
  const router = useRouter()
  const [votedEntry, setVotedEntry] = useState(initialVotedEntry)
  const [voteCounts, setVoteCounts] = useState<Record<string, number>>(
    Object.fromEntries(entries.map((entry) => [entry.id, entry.votes_count]))
  )
  const [voting, setVoting] = useState(false)

  async function vote(entryId: string) {
    if (!currentUserId || !canVote || voting || votedEntry) return
    setVoting(true)

    const { error } = await supabase.from('competition_votes').insert({
      competition_id: competitionId,
      entry_id: entryId,
      user_id: currentUserId,
    })

    if (!error) {
      setVotedEntry(entryId)
      setVoteCounts((counts) => ({ ...counts, [entryId]: (counts[entryId] ?? 0) + 1 }))
      router.refresh()
    }

    setVoting(false)
  }

  if (entries.length === 0) {
    return <p className="px-4 py-10 text-center text-sm" style={{ color: 'var(--text-faint)' }}>Nenhuma participação ainda.</p>
  }

  return (
    <div style={{ borderTop: '1px solid var(--border)' }}>
      {entries.map((entry, index) => {
        const position = index + 1
        const isWinner = ended && position === 1
        const isVoted = votedEntry === entry.id
        const isOwnEntry = entry.id === userEntry
        const showVoteCount = canVote || ended
        const rewardTitle = ended ? awardTitle(titleBase, position) : null

        return (
          <div
            key={entry.id}
            className="px-4 py-4"
            style={{
              borderBottom: '1px solid var(--border)',
              background: isWinner && showWinnerHighlight ? 'color-mix(in srgb, #10b981 12%, var(--bg) 88%)' : 'transparent',
            }}
          >
            <div className="flex items-start gap-3">
              <div className="mt-1 w-7 flex-shrink-0 text-center">
                {isWinner ? (
                  <Crown size={18} className="mx-auto text-yellow-400" />
                ) : (
                  <span className="text-sm font-bold" style={{ color: 'var(--text-faint)' }}>{position}</span>
                )}
              </div>

              <Link href={`/perfil/${entry.profiles.username}`} className="flex-shrink-0">
                {entry.profiles.avatar_url ? (
                  <img src={entry.profiles.avatar_url} alt="" className="h-9 w-9 rounded-full object-cover" />
                ) : (
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                    {entry.profiles.display_name?.[0]?.toUpperCase() ?? '?'}
                  </div>
                )}
              </Link>

              <div className="min-w-0 flex-1 space-y-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/perfil/${entry.profiles.username}`} className="text-sm font-medium hover:underline" style={{ color: 'var(--text)' }}>
                      {entry.profiles.display_name}
                    </Link>
                    {entry.profiles.equipped_badge_label && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-semibold text-emerald-400">
                        <Bird size={12} />
                        {entry.profiles.equipped_badge_label}
                      </span>
                    )}
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>@{entry.profiles.username}</span>
                    {isOwnEntry && <span className="text-xs font-medium text-emerald-400">seu envio</span>}
                  </div>

                  {(entry.profiles.equipped_title || rewardTitle) && (
                    <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
                      {entry.profiles.equipped_title ?? rewardTitle}
                    </p>
                  )}

                  {isWinner && showWinnerHighlight && (
                    <p className="text-xs font-medium text-emerald-400">
                      Bird Badge garantido · título {rewardTitle}
                    </p>
                  )}
                </div>

                {entry.whistles.caption && (
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{entry.whistles.caption}</p>
                )}

                <WhistlePlayer audioUrl={entry.whistles.audio_url} duration={entry.whistles.duration_s} />

                <div className="flex items-center gap-3 pt-1">
                  {canVote && !isOwnEntry && currentUserId && (
                    <button
                      onClick={() => vote(entry.id)}
                      disabled={!!votedEntry || voting}
                      className="flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50"
                      style={{ color: isVoted ? '#f87171' : 'var(--text-muted)' }}
                    >
                      <Heart size={16} fill={isVoted ? 'currentColor' : 'none'} />
                      {isVoted ? 'Votado' : 'Votar'}
                    </button>
                  )}
                  {showVoteCount && (
                    <span className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {voteCounts[entry.id] ?? 0} votos
                    </span>
                  )}
                </div>

                <CompetitionComments
                  competitionId={competitionId}
                  entryId={entry.id}
                  currentUserId={currentUserId}
                  canComment={canComment}
                  comments={commentsByEntry[entry.id] ?? []}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
