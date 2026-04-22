'use client'

import Link from 'next/link'
import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Copy, Heart, MessageCircle, MoreHorizontal, Repeat2, Share2, Trash2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WhistlePlayer } from '@/components/audio/WhistlePlayer'
import { ConfirmModal } from '@/components/ui/ConfirmModal'
import { formatDuration } from '@/lib/utils/audio'
import type { FeedItem } from '@/types/database'

interface WhistleCardProps {
  whistle: FeedItem
  currentUserId: string | null
  initialLiked?: boolean
  initialReposted?: boolean
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

export function WhistleCard({
  whistle,
  currentUserId,
  initialLiked = false,
  initialReposted = false,
}: WhistleCardProps) {
  const supabase = createClient()
  const router = useRouter()
  const pathname = usePathname()
  const menuRef = useRef<HTMLDivElement | null>(null)

  const [liked, setLiked] = useState(initialLiked)
  const [reposted, setReposted] = useState(initialReposted)
  const [likesCount, setLikesCount] = useState(whistle.likes_count)
  const [likeLoading, setLikeLoading] = useState(false)
  const [repostLoading, setRepostLoading] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [actionError, setActionError] = useState('')
  const [dismissed, setDismissed] = useState(false)
  const [confirmAction, setConfirmAction] = useState<'delete-whistle' | 'remove-repost' | null>(null)
  const [confirmLoading, setConfirmLoading] = useState(false)

  const isRepost = whistle.item_type === 'repost'
  const canDeleteOriginal = currentUserId === whistle.original_user_id
  const canRemoveRepost = isRepost && currentUserId === whistle.actor_user_id

  useEffect(() => {
    function handlePointerDown(event: MouseEvent) {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handlePointerDown)
    return () => document.removeEventListener('mousedown', handlePointerDown)
  }, [])

  async function toggleLike() {
    if (!currentUserId || likeLoading) return

    setLikeLoading(true)
    setActionError('')

    if (liked) {
      const { error } = await supabase
        .from('likes')
        .delete()
        .match({ user_id: currentUserId, whistle_id: whistle.original_whistle_id })

      if (error) {
        setActionError(error.message)
        setLikeLoading(false)
        return
      }

      setLiked(false)
      setLikesCount((count) => Math.max(count - 1, 0))
      setLikeLoading(false)
      return
    }

    const { error } = await supabase.from('likes').insert({
      user_id: currentUserId,
      whistle_id: whistle.original_whistle_id,
    })

    if (error) {
      setActionError(error.message)
      setLikeLoading(false)
      return
    }

    setLiked(true)
    setLikesCount((count) => count + 1)
    setLikeLoading(false)
  }

  async function toggleRepost() {
    if (!currentUserId || repostLoading) return

    setRepostLoading(true)
    setActionError('')

    if (reposted) {
      const { error } = await supabase
        .from('reposts')
        .delete()
        .match({ user_id: currentUserId, original_whistle_id: whistle.original_whistle_id })

      if (error) {
        setActionError(error.message)
        setRepostLoading(false)
        return
      }

      if (isRepost && canRemoveRepost) {
        setDismissed(true)
      }

      setReposted(false)
      setRepostLoading(false)
      router.refresh()
      return
    }

    const { error } = await supabase.from('reposts').insert({
      user_id: currentUserId,
      original_whistle_id: whistle.original_whistle_id,
      group_id: whistle.group_id,
    })

    if (error) {
      setActionError(error.message)
      setRepostLoading(false)
      return
    }

    setReposted(true)
    setRepostLoading(false)
    router.refresh()
  }

  async function handleShare() {
    const shareUrl = `${location.origin}/assobio/${whistle.original_whistle_id}`

    if (navigator.share) {
      await navigator.share({ title: `Post de @${whistle.original_username}`, url: shareUrl })
      return
    }

    await navigator.clipboard.writeText(shareUrl)
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(`${location.origin}/assobio/${whistle.original_whistle_id}`)
      setActionError('')
    } catch {
      setActionError('Não foi possível copiar o link agora.')
    }
    setMenuOpen(false)
  }

  async function deleteOriginalWhistle() {
    if (!canDeleteOriginal) return

    setConfirmLoading(true)

    const { error } = await supabase.from('whistles').delete().eq('id', whistle.original_whistle_id)

    if (error) {
      setActionError(error.message)
      setMenuOpen(false)
      setConfirmLoading(false)
      return
    }

    setMenuOpen(false)
    setConfirmAction(null)
    setConfirmLoading(false)
    setDismissed(true)

    if (pathname.startsWith('/assobio/')) {
      router.push('/feed')
      router.refresh()
      return
    }

    router.refresh()
  }

  async function removeRepost() {
    if (!canRemoveRepost) return

    setConfirmLoading(true)

    const { error } = await supabase.from('reposts').delete().eq('id', whistle.item_id)

    if (error) {
      setActionError(error.message)
      setMenuOpen(false)
      setConfirmLoading(false)
      return
    }

    setMenuOpen(false)
    setConfirmAction(null)
    setConfirmLoading(false)
    setDismissed(true)
    setReposted(false)

    if (pathname.startsWith('/assobio/')) {
      router.refresh()
      return
    }

    router.refresh()
  }

  if (dismissed) {
    return null
  }

  return (
    <article className="border-b px-4 py-4 transition-colors hover:bg-[var(--hover-bg)]" style={{ borderColor: 'var(--border)' }}>
      <div className="flex gap-3">
        <Link href={`/perfil/${whistle.username}`} className="flex-shrink-0">
          {whistle.avatar_url ? (
            <img src={whistle.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
              {whistle.display_name?.[0]?.toUpperCase() ?? '?'}
            </div>
          )}
        </Link>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-baseline gap-2">
                <Link href={`/perfil/${whistle.username}`} className="truncate text-sm font-semibold hover:underline" style={{ color: 'var(--text)' }}>
                  {whistle.display_name}
                </Link>
                <span className="truncate text-sm" style={{ color: 'var(--text-muted)' }}>@{whistle.username}</span>
                <span className="flex-shrink-0 text-xs" style={{ color: 'var(--text-faint)' }}>· {timeAgo(whistle.created_at)}</span>
              </div>

              {isRepost ? (
                <p className="mt-0.5 text-xs" style={{ color: 'var(--text-faint)' }}>
                  Repostou o post de{' '}
                  <Link href={`/perfil/${whistle.original_username}`} className="font-medium hover:underline" style={{ color: 'var(--text-muted)' }}>
                    @{whistle.original_username}
                  </Link>
                </p>
              ) : null}
            </div>

            <div ref={menuRef} className="relative flex-shrink-0">
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                className="rounded-full p-2 transition-colors hover:bg-[var(--bg-subtle)]"
                style={{ color: 'var(--text-faint)' }}
                aria-label="Abrir ações do post"
              >
                <MoreHorizontal size={18} />
              </button>

              {menuOpen && (
                <div
                  className="absolute right-0 top-10 z-20 min-w-[180px] overflow-hidden rounded-2xl"
                  style={{ background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: '0 12px 32px rgba(0,0,0,0.18)' }}
                >
                  <button
                    type="button"
                    onClick={copyLink}
                    className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--hover-bg)]"
                    style={{ color: 'var(--text)' }}
                  >
                    <Copy size={16} />
                    Copiar link
                  </button>

                  {canDeleteOriginal && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmAction('delete-whistle')
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--hover-bg)]"
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={16} />
                      Excluir post
                    </button>
                  )}

                  {canRemoveRepost && (
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmAction('remove-repost')
                      }}
                      className="flex w-full items-center gap-2 px-4 py-3 text-left text-sm transition-colors hover:bg-[var(--hover-bg)]"
                      style={{ color: '#f87171' }}
                    >
                      <Trash2 size={16} />
                      Remover repost
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {isRepost && whistle.original_user_id !== whistle.actor_user_id ? (
            <div className="flex items-baseline gap-2">
              <Link href={`/perfil/${whistle.original_username}`} className="truncate text-sm font-semibold hover:underline" style={{ color: 'var(--text)' }}>
                {whistle.original_display_name}
              </Link>
              <span className="truncate text-sm" style={{ color: 'var(--text-muted)' }}>@{whistle.original_username}</span>
            </div>
          ) : null}

          {whistle.caption && (
            <p className="text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{whistle.caption}</p>
          )}

          <WhistlePlayer audioUrl={whistle.audio_url} duration={whistle.duration_s} />

          <div className="flex items-center gap-5 pt-1">
            <button
              onClick={toggleLike}
              disabled={!currentUserId || likeLoading}
              className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50"
              style={{ color: liked ? '#f87171' : 'var(--text-muted)' }}
            >
              <Heart size={17} fill={liked ? 'currentColor' : 'none'} />
              <span>{likesCount > 0 ? likesCount : ''}</span>
            </button>

            <Link href={`/assobio/${whistle.original_whistle_id}`} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              <MessageCircle size={17} />
              <span>{whistle.comments_count > 0 ? whistle.comments_count : ''}</span>
            </Link>

            <button
              onClick={toggleRepost}
              disabled={!currentUserId || repostLoading}
              className="flex items-center gap-1.5 text-sm transition-colors disabled:opacity-50"
              style={{ color: reposted ? 'var(--accent, #10b981)' : 'var(--text-muted)' }}
            >
              <Repeat2 size={17} />
            </button>

            <button onClick={handleShare} className="flex items-center gap-1.5 text-sm transition-colors" style={{ color: 'var(--text-muted)' }}>
              <Share2 size={17} />
            </button>

            <span className="ml-auto text-xs" style={{ color: 'var(--text-faint)' }}>{formatDuration(whistle.duration_s)}</span>
          </div>

          {actionError && (
            <p className="text-sm" style={{ color: '#f87171' }}>
              {actionError}
            </p>
          )}
        </div>
      </div>

      <ConfirmModal
        open={confirmAction === 'delete-whistle'}
        title="Excluir post?"
        description="Essa ação remove o post e os itens ligados a ele, como comentários, curtidas e reposts."
        confirmLabel="Excluir"
        destructive
        loading={confirmLoading}
        onClose={() => {
          if (!confirmLoading) setConfirmAction(null)
        }}
        onConfirm={deleteOriginalWhistle}
      />

      <ConfirmModal
        open={confirmAction === 'remove-repost'}
        title="Remover repost?"
        description="O post original continua no app. Você vai remover apenas o seu repost."
        confirmLabel="Remover"
        destructive
        loading={confirmLoading}
        onClose={() => {
          if (!confirmLoading) setConfirmAction(null)
        }}
        onConfirm={removeRepost}
      />
    </article>
  )
}
