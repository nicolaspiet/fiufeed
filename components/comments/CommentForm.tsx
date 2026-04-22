'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

interface CommentFormProps {
  whistleId: string
  currentUserId: string | null
}

export function CommentForm({ whistleId, currentUserId }: CommentFormProps) {
  const supabase = createClient()
  const router = useRouter()
  const [content, setContent] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    if (!currentUserId || loading || !content.trim()) return

    setLoading(true)
    setError('')

    const { error: insertError } = await supabase.from('comments').insert({
      whistle_id: whistleId,
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

  if (!currentUserId) {
    return (
      <div className="rounded-2xl px-1 py-2">
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          Entre para comentar este post.{' '}
          <Link href="/entrar" className="font-medium" style={{ color: 'var(--text)' }}>
            Fazer login
          </Link>
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 px-1 py-2">
      <div>
        <label className="mb-1.5 block text-sm font-medium" style={{ color: 'var(--text)' }}>Comentar</label>
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={3}
          maxLength={500}
          placeholder="Escreva sua resposta..."
          className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
          style={{ background: 'var(--bg-subtle)', color: 'var(--text)' }}
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="flex items-center justify-between">
        <span className="text-xs" style={{ color: 'var(--text-faint)' }}>{content.length}/500</span>
        <button
          type="submit"
          disabled={loading || !content.trim()}
          className="rounded-full bg-emerald-500 px-4 py-2 text-sm font-semibold text-white transition-colors disabled:opacity-50 hover:bg-emerald-400"
        >
          {loading ? 'Enviando...' : 'Comentar'}
        </button>
      </div>
    </form>
  )
}
