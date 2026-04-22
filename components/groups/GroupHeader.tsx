'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera, Lock, Plus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WhistleRecorderSheet } from '@/components/audio/WhistleRecorderSheet'
import type { Group } from '@/types/database'

interface GroupHeaderProps {
  group: Group
  isMember: boolean
  memberRole: string | null
  membersCount: number
  currentUserId: string | null
}

export function GroupHeader({ group, isMember, memberRole, membersCount, currentUserId }: GroupHeaderProps) {
  const supabase = createClient()
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [joining, setJoining] = useState(false)
  const [member, setMember] = useState(isMember)
  const [showRecorder, setShowRecorder] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(group.avatar_url)
  const [bannerUrl, setBannerUrl] = useState(group.banner_url)
  const [uploading, setUploading] = useState<'avatar' | 'banner' | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const imageMaxBytes = 4 * 1024 * 1024
  const imageAllowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
  const isAdminOrOwner = memberRole === 'owner' || memberRole === 'admin'

  async function toggleJoin() {
    if (!currentUserId || joining) return
    setJoining(true)
    setActionError(null)

    if (member) {
      const { error } = await supabase.from('group_members').delete().match({ group_id: group.id, user_id: currentUserId })
      if (error) {
        setActionError('Erro ao sair do grupo.')
        setJoining(false)
        return
      }
      setMember(false)
    } else {
      const { error } = await supabase.from('group_members').insert({ group_id: group.id, user_id: currentUserId, role: 'member' })
      if (error) {
        setActionError('Erro ao entrar no grupo.')
        setJoining(false)
        return
      }
      setMember(true)
    }

    setJoining(false)
    router.refresh()
  }

  async function uploadImage(file: File, kind: 'avatar' | 'banner') {
    if (!currentUserId) return
    setActionError(null)

    if (file.size > imageMaxBytes) {
      setActionError('Imagem muito grande (máx. 4 MB).')
      return
    }

    if (!imageAllowedTypes.includes(file.type)) {
      setActionError('Formato inválido. Use JPEG, PNG, WebP ou GIF.')
      return
    }

    setUploading(kind)

    const bucket = kind === 'avatar' ? 'group-avatars' : 'group-banners'
    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${group.id}/${crypto.randomUUID()}.${ext}`

    const { error: storageError } = await supabase.storage.from(bucket).upload(path, file)
    if (storageError) {
      setActionError('Erro ao enviar imagem.')
      setUploading(null)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    const patch = kind === 'avatar' ? { avatar_url: publicUrl } : { banner_url: publicUrl }
    const { error: dbError } = await supabase.from('groups').update(patch).eq('id', group.id)
    if (dbError) {
      setActionError('Erro ao salvar imagem.')
      setUploading(null)
      return
    }

    if (kind === 'avatar') {
      setAvatarUrl(publicUrl)
    } else {
      setBannerUrl(publicUrl)
    }

    setUploading(null)
    router.refresh()
  }

  return (
    <div>
      <div className="relative h-32 lg:h-44" style={{ background: 'var(--surface)' }}>
        {bannerUrl && <img src={bannerUrl} alt="" className="h-full w-full object-cover" />}
        <button onClick={() => router.back()} className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white lg:hidden">
          <ArrowLeft size={16} />
        </button>
        {isAdminOrOwner && (
          <>
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white transition-colors hover:bg-black/70"
            >
              <Camera size={14} />
            </button>
            <input
              ref={bannerInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0]
                if (file) uploadImage(file, 'banner')
              }}
            />
          </>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="mb-3 mt-[-2.5rem] flex items-end justify-between">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4" style={{ borderColor: 'var(--bg)', background: 'var(--surface)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <Users size={28} style={{ color: 'var(--text-faint)' }} />
              )}
            </div>
            {isAdminOrOwner && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2"
                  style={{ background: 'var(--bg)', borderColor: 'var(--bg)', color: 'var(--text-muted)' }}
                >
                  <Camera size={12} />
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0]
                    if (file) uploadImage(file, 'avatar')
                  }}
                />
              </>
            )}
          </div>

          <div className="flex gap-2">
            {member && currentUserId && (
              <button
                onClick={() => setShowRecorder(true)}
                className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-emerald-400"
              >
                <Plus size={14} />
                Publicar
              </button>
            )}
            {!group.is_private && currentUserId && (
              <button
                onClick={toggleJoin}
                disabled={joining}
                className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                  member
                    ? 'border hover:border-red-500 hover:text-red-400'
                    : 'bg-white text-black hover:bg-zinc-200'
                }`}
                style={member ? { borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg)' } : undefined}
              >
                {joining ? (member ? 'Saindo...' : 'Entrando...') : member ? 'Sair' : 'Entrar'}
              </button>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>{group.name}</h1>
          {group.is_private && <Lock size={14} style={{ color: 'var(--text-faint)' }} />}
        </div>
        {group.description && <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>{group.description}</p>}
        <div className="mt-2 flex items-center gap-3 text-sm" style={{ color: 'var(--text-faint)' }}>
          <span>{membersCount} membros</span>
          {uploading && <span>Enviando {uploading === 'avatar' ? 'foto' : 'banner'}...</span>}
        </div>
        {actionError && <p className="mt-1 text-xs text-red-500">{actionError}</p>}
      </div>

      <div className="px-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="inline-block border-b-2 border-emerald-400 py-3 text-sm font-medium" style={{ color: 'var(--text)' }}>
          Publicações
        </div>
      </div>

      {showRecorder && currentUserId && (
        <WhistleRecorderSheet
          userId={currentUserId}
          groupId={group.id}
          destinationLabel={group.name}
          onClose={() => setShowRecorder(false)}
          onPosted={async () => {
            setShowRecorder(false)
            router.refresh()
          }}
        />
      )}
    </div>
  )
}
