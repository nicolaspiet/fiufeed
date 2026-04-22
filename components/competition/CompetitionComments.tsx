'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CompetitionComment {
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

interface CompetitionCommentsProps {
  competitionId: string
  entryId: string
  currentUserId: string | null
  canComment: boolean
  comments: CompetitionComment[]
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

export function CompetitionComments({
  competitionId,
  entryId,
  currentUserId,
  canComment,
  comments,
}: CompetitionCommentsProps) {
  const supabase = createClient()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!currentUserId || !canComment || loading || !content.trim()) return

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('competition_comments').insert({
      competition_id: competitionId,
      entry_id: entryId,
      user_id: currentUserId,
      content: content.trim(),
    })

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    setContent('')
    setLoading(false)
    router.refresh()
  }

  return (
    <div className="space-y-3 rounded-2xl bg-black/5 px-3 py-3">
      <div className="space-y-2">
        {comments.length === 0 ? (
          <p className="text-xs" style={{ color: 'var(--text-faint)' }}>
            Nenhum comentário nesta participação ainda.
          </p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-2xl bg-black/10 px-3 py-2">
              <div className="flex items-baseline gap-2">
                <Link href={`/perfil/${comment.profile.username}`} className="text-xs font-semibold" style={{ color: 'var(--text)' }}>
                  {comment.profile.display_name}
                </Link>
                <span className="text-xs" style={{ color: 'var(--text-faint)' }}>
                  @{comment.profile.username} · {timeAgo(comment.created_at)}
                </span>
              </div>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>
                {comment.content}
              </p>
            </div>
          ))
        )}
      </div>

      {canComment && currentUserId && (
        <form onSubmit={handleSubmit} className="space-y-2">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            rows={2}
            maxLength={500}
            placeholder="Comente nesta participação..."
            className="w-full resize-none rounded-xl px-3 py-2 text-sm focus:outline-none"
            style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}
          />
          {error && <p className="text-xs text-red-400">{error}</p>}
          <div className="flex items-center justify-between">
            <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{content.length}/500</span>
            <button
              type="submit"
              disabled={loading || !content.trim()}
              className="rounded-full bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white transition-colors disabled:opacity-50 hover:bg-emerald-400"
            >
              {loading ? 'Enviando...' : 'Comentar'}
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
