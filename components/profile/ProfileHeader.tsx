'use client'

import { useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Camera } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types/database'

interface ProfileHeaderProps {
  profile: Profile
  followersCount: number
  followingCount: number
  isOwnProfile: boolean
  isFollowing: boolean
  currentUserId: string | null
}

export function ProfileHeader({
  profile,
  followersCount,
  followingCount,
  isOwnProfile,
  isFollowing: initialFollowing,
  currentUserId,
}: ProfileHeaderProps) {
  const supabase = createClient()
  const router = useRouter()
  const avatarInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [following, setFollowing] = useState(initialFollowing)
  const [followers, setFollowers] = useState(followersCount)
  const [followLoading, setFollowLoading] = useState(false)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState(profile.display_name)
  const [bio, setBio] = useState(profile.bio)
  const [saving, setSaving] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url)
  const [bannerUrl, setBannerUrl] = useState(profile.banner_url)
  const [actionError, setActionError] = useState<string | null>(null)

  const imageMaxBytes = 4 * 1024 * 1024
  const imageAllowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

  async function toggleFollow() {
    if (!currentUserId || followLoading) return
    setFollowLoading(true)
    setActionError(null)

    if (following) {
      const { error } = await supabase.from('follows').delete().match({ follower_id: currentUserId, following_id: profile.id })
      if (error) {
        setActionError('Erro ao deixar de seguir.')
        setFollowLoading(false)
        return
      }
      setFollowing(false)
      setFollowers((count) => count - 1)
    } else {
      const { error } = await supabase.from('follows').insert({ follower_id: currentUserId, following_id: profile.id })
      if (error) {
        setActionError('Erro ao seguir este perfil.')
        setFollowLoading(false)
        return
      }
      setFollowing(true)
      setFollowers((count) => count + 1)
    }

    setFollowLoading(false)
  }

  async function uploadImage(file: File, bucket: 'avatars' | 'banners', field: 'avatar_url' | 'banner_url') {
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

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${currentUserId}/${crypto.randomUUID()}.${ext}`
    const { error: storageError } = await supabase.storage.from(bucket).upload(path, file)
    if (storageError) {
      setActionError('Erro ao enviar imagem.')
      return
    }

    const { data: { publicUrl } } = supabase.storage.from(bucket).getPublicUrl(path)
    const patch = field === 'avatar_url' ? { avatar_url: publicUrl } : { banner_url: publicUrl }
    const { error: dbError } = await supabase.from('profiles').update(patch).eq('id', currentUserId)
    if (dbError) {
      setActionError('Erro ao salvar imagem.')
      return
    }

    if (field === 'avatar_url') {
      setAvatarUrl(publicUrl)
    } else {
      setBannerUrl(publicUrl)
    }

    router.refresh()
  }

  async function saveProfile() {
    if (!currentUserId) return
    setSaving(true)
    setActionError(null)

    const { error } = await supabase.from('profiles').update({ display_name: displayName, bio }).eq('id', currentUserId)
    if (error) {
      setActionError('Erro ao salvar perfil.')
      setSaving(false)
      return
    }

    setSaving(false)
    setEditing(false)
    router.refresh()
  }

  return (
    <div>
      <div className="relative h-32 lg:h-44" style={{ background: 'var(--surface)' }}>
        {bannerUrl && <img src={bannerUrl} alt="" className="h-full w-full object-cover" />}
        <button onClick={() => router.back()} className="absolute left-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-black/50 text-white lg:hidden">
          <ArrowLeft size={16} />
        </button>
        {isOwnProfile && (
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
                if (file) uploadImage(file, 'banners', 'banner_url')
              }}
            />
          </>
        )}
      </div>

      <div className="px-4 pb-4">
        <div className="mb-3 mt-[-2.5rem] flex items-end justify-between">
          <div className="relative">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-4 bg-emerald-700" style={{ borderColor: 'var(--bg)' }}>
              {avatarUrl ? (
                <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{profile.display_name?.[0]?.toUpperCase() ?? '?'}</span>
              )}
            </div>
            {isOwnProfile && (
              <>
                <button
                  onClick={() => avatarInputRef.current?.click()}
                  className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full border-2 transition-colors"
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
                    if (file) uploadImage(file, 'avatars', 'avatar_url')
                  }}
                />
              </>
            )}
          </div>

          {isOwnProfile ? (
            <button
              onClick={() => (editing ? saveProfile() : setEditing(true))}
              disabled={saving}
              className="rounded-full px-4 py-1.5 text-sm font-medium transition-colors disabled:opacity-50"
              style={{ border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)' }}
            >
              {saving ? 'Salvando...' : editing ? 'Salvar' : 'Editar perfil'}
            </button>
          ) : currentUserId ? (
            <button
              onClick={toggleFollow}
              disabled={followLoading}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition-colors disabled:opacity-50 ${
                following
                  ? 'border hover:border-red-500 hover:text-red-400'
                  : 'bg-white text-black hover:bg-zinc-200'
              }`}
              style={following ? { borderColor: 'var(--border)', color: 'var(--text)', background: 'var(--bg)' } : undefined}
            >
              {following ? 'Seguindo' : 'Seguir'}
            </button>
          ) : null}
        </div>

        {editing ? (
          <div className="space-y-3">
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              placeholder="Nome"
              className="w-full rounded-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <textarea
              value={bio}
              onChange={(event) => setBio(event.target.value)}
              placeholder="Bio"
              maxLength={160}
              rows={3}
              className="w-full resize-none rounded-xl px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none"
              style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)', color: 'var(--text)' }}
            />
            <button onClick={() => setEditing(false)} className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Cancelar
            </button>
          </div>
        ) : (
          <>
            <h1 className="text-lg font-bold leading-tight" style={{ color: 'var(--text)' }}>{profile.display_name}</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>@{profile.username}</p>
            {profile.bio && <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--text-muted)' }}>{profile.bio}</p>}
          </>
        )}

        {actionError && <p className="mt-1 text-xs text-red-500">{actionError}</p>}

        <div className="mt-3 flex gap-5 text-sm">
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            {followingCount} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>seguindo</span>
          </span>
          <span className="font-semibold" style={{ color: 'var(--text)' }}>
            {followers} <span className="font-normal" style={{ color: 'var(--text-muted)' }}>seguidores</span>
          </span>
        </div>
      </div>

      <div className="px-4" style={{ borderBottom: '1px solid var(--border)' }}>
        <div className="inline-block border-b-2 border-emerald-400 py-3 text-sm font-medium" style={{ color: 'var(--text)' }}>
          Publicações
        </div>
      </div>
    </div>
  )
}
