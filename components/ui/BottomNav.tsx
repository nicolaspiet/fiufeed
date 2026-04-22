'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Trophy, User, Users } from 'lucide-react'

const NAV_ITEMS = [
  { href: '/feed', icon: Home, label: 'Feed' },
  { href: '/descobrir', icon: Search, label: 'Descobrir' },
  { href: '/grupos', icon: Users, label: 'Grupos' },
  { href: '/competicoes', icon: Trophy, label: 'Competições' },
  { href: '/perfil', icon: User, label: 'Perfil' },
]

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 backdrop-blur lg:hidden" style={{ background: 'var(--bg)', borderTop: '1px solid var(--border)' }}>
      <div className="flex h-16 items-center justify-around px-2">
        {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
          const active = pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              className="flex flex-col items-center gap-0.5 rounded-xl px-3 py-1 transition-colors"
              style={{ color: active ? 'var(--text)' : 'var(--text-faint)' }}
            >
              <Icon size={22} strokeWidth={active ? 2.5 : 1.75} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
