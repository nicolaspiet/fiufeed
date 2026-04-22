import Link from 'next/link'
import { Trophy } from 'lucide-react'
import type { Profile } from '@/types/database'
import { buildCompetitionPath, buildWhistlePath } from '@/lib/routes'

interface SidebarCompetition {
  id: string
  public_id: string
  slug: string
  title: string
  theme: string
  submission_ends_at: string
  voting_ends_at: string
}

interface SidebarTrendingWhistle {
  id: string
  public_id: string
  caption: string
  likes_count: number
  comments_count: number
  profiles: {
    username: string
    display_name: string
  }
}

interface RightSidebarProps {
  profile: Profile | null
  competitions: SidebarCompetition[]
  todayTop: SidebarTrendingWhistle[]
  weekTop: SidebarTrendingWhistle[]
}

function getCompetitionStatus(competition: SidebarCompetition) {
  const now = Date.now()
  if (now < new Date(competition.submission_ends_at).getTime()) {
    return 'Envios abertos'
  }
  if (now < new Date(competition.voting_ends_at).getTime()) {
    return 'Votação aberta'
  }
  return 'Encerrada'
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="overflow-hidden rounded-2xl" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{title}</h2>
      </div>
      <div>{children}</div>
    </section>
  )
}

function TrendingList({ items, empty }: { items: SidebarTrendingWhistle[]; empty: string }) {
  if (items.length === 0) {
    return <p className="px-4 py-4 text-sm" style={{ color: 'var(--text-faint)' }}>{empty}</p>
  }

  return items.map((item, index) => (
    <Link
      key={item.id}
      href={buildWhistlePath(item)}
      className="block border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--hover-bg)]"
      style={{ borderColor: 'var(--border)' }}
    >
      <div className="flex items-start gap-3">
        <span className="w-5 flex-shrink-0 text-xs font-bold" style={{ color: 'var(--text-faint)' }}>
          {index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
            {item.profiles.display_name}
          </p>
          <p className="truncate text-xs" style={{ color: 'var(--text-faint)' }}>
            @{item.profiles.username}
          </p>
          <p className="mt-1 line-clamp-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {item.caption || 'Post sem legenda'}
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--text-faint)' }}>
            {item.likes_count} curtidas · {item.comments_count} comentários
          </p>
        </div>
      </div>
    </Link>
  ))
}

export function RightSidebar({ profile, competitions, todayTop, weekTop }: RightSidebarProps) {
  return (
    <aside className="flex flex-col gap-4 px-4 py-5">
      {profile && (
        <Section title="Seu perfil">
          <Link
            href={`/perfil/${profile.username}`}
            className="flex items-center gap-3 px-4 py-4 transition-colors hover:bg-[var(--hover-bg)]"
          >
            {profile.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-12 w-12 rounded-full object-cover" />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full text-base font-bold" style={{ background: 'var(--surface)', color: 'var(--text)' }}>
                {profile.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold" style={{ color: 'var(--text)' }}>{profile.display_name}</p>
              <p className="truncate text-xs" style={{ color: 'var(--text-faint)' }}>@{profile.username}</p>
            </div>
          </Link>
        </Section>
      )}

      <Section title="Em alta hoje">
        <TrendingList items={todayTop} empty="Nenhum post em alta hoje." />
      </Section>

      <Section title="Melhor da semana">
        <TrendingList items={weekTop} empty="Nenhum destaque nesta semana." />
      </Section>

      <Section title="Competições">
        {competitions.length === 0 ? (
          <p className="px-4 py-4 text-sm" style={{ color: 'var(--text-faint)' }}>Nenhuma competição ativa no momento.</p>
        ) : (
          competitions.map((competition) => (
            <Link
              key={competition.id}
              href={buildCompetitionPath(competition)}
              className="block border-b px-4 py-3 transition-colors last:border-b-0 hover:bg-[var(--hover-bg)]"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex items-start gap-3">
                <Trophy size={16} className="mt-0.5 flex-shrink-0 text-emerald-500" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{competition.title}</p>
                  <p className="mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>Tema: {competition.theme}</p>
                  <p className="mt-2 text-xs font-medium text-emerald-500">{getCompetitionStatus(competition)}</p>
                </div>
              </div>
            </Link>
          ))
        )}
      </Section>
    </aside>
  )
}
