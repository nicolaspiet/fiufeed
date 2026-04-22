'use client'

import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Home, LogOut, Mic, Moon, Search, Sun, Trophy, User, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { WhistleRecorderSheet } from '@/components/audio/WhistleRecorderSheet'
import { useTheme } from '@/components/ui/ThemeProvider'
import type { Profile } from '@/types/database'

const NAV_ITEMS = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/descobrir', icon: Search, label: 'Descobrir' },
  { href: '/grupos', icon: Users, label: 'Grupos' },
  { href: '/competicoes', icon: Trophy, label: 'Competições' },
  { href: '/perfil', icon: User, label: 'Perfil' },
]

interface SidebarProps {
  profile: Profile | null
}

export function Sidebar({ profile }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const { theme, toggle } = useTheme()
  const [showRecorder, setShowRecorder] = useState(false)

  async function handleSignOut() {
    await supabase.auth.signOut()
    router.push('/entrar')
    router.refresh()
  }

  return (
    <aside className="flex h-full flex-col px-3 py-5" style={{ background: 'var(--bg)' }}>
      <Link href="/feed" className="mb-6 block px-3 text-xl font-bold" style={{ color: 'var(--text)' }}>
        Fiufeed
      </Link>

      <nav className="flex-1 space-y-0.5">
        {profile && (
          <button
            onClick={() => setShowRecorder(true)}
            className="mb-4 flex w-full items-center justify-center gap-2 rounded-full bg-emerald-500 px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-emerald-400"
          >
            <Mic size={18} />
            Publicar
          </button>
        )}
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)
          const profileHref = href === '/perfil' && profile ? `/perfil/${profile.username}` : href

          return (
            <Link
              key={href}
              href={profileHref}
              className="flex items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors"
              style={{
                background: active ? 'var(--active-bg)' : 'transparent',
                color: active ? 'var(--active-text)' : 'var(--text-muted)',
              }}
              onMouseEnter={(event) => {
                if (!active) event.currentTarget.style.background = 'var(--hover-bg)'
              }}
              onMouseLeave={(event) => {
                if (!active) event.currentTarget.style.background = 'transparent'
              }}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mt-4 space-y-1" style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem' }}>
        <button
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-full px-3 py-2.5 text-sm font-medium transition-colors"
          style={{ color: 'var(--text-muted)' }}
          onMouseEnter={(event) => {
            event.currentTarget.style.background = 'var(--hover-bg)'
          }}
          onMouseLeave={(event) => {
            event.currentTarget.style.background = 'transparent'
          }}
        >
          {theme === 'dark' ? <Sun size={18} strokeWidth={1.75} /> : <Moon size={18} strokeWidth={1.75} />}
          {theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
        </button>

        {profile && (
          <>
            <Link
              href={`/perfil/${profile.username}`}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 transition-colors"
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--hover-bg)'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent'
              }}
            >
              {profile.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="h-8 w-8 rounded-full object-cover" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                  {profile.display_name?.[0]?.toUpperCase() ?? '?'}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{profile.display_name}</p>
                <p className="truncate text-xs" style={{ color: 'var(--text-faint)' }}>@{profile.username}</p>
              </div>
            </Link>

            <button
              onClick={handleSignOut}
              className="flex w-full items-center gap-3 rounded-full px-3 py-2 text-sm transition-colors"
              style={{ color: 'var(--text-muted)' }}
              onMouseEnter={(event) => {
                event.currentTarget.style.background = 'var(--hover-bg)'
                event.currentTarget.style.color = '#ef4444'
              }}
              onMouseLeave={(event) => {
                event.currentTarget.style.background = 'transparent'
                event.currentTarget.style.color = 'var(--text-muted)'
              }}
            >
              <LogOut size={16} />
              Sair
            </button>
          </>
        )}
      </div>

      {profile && showRecorder && (
        <WhistleRecorderSheet
          userId={profile.id}
          destinationLabel="Fiufeed"
          onClose={() => setShowRecorder(false)}
          onPosted={() => setShowRecorder(false)}
        />
      )}
    </aside>
  )
}
