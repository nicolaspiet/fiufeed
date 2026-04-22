import { Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { signAudioUrls } from '@/lib/audio-url'
import { toFeedItemFromWhistle } from '@/lib/feed'
import { WhistleCard } from '@/components/feed/WhistleCard'

export default async function DescobrirPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const now = new Date().toISOString()
  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()

  const [{ data: todayTopRaw }, { data: weekTopRaw }] = await Promise.all([
    supabase
      .from('whistles')
      .select('*, profiles!whistles_user_id_fkey(username, display_name, avatar_url)')
      .is('group_id', null)
      .gte('created_at', dayAgo)
      .lte('created_at', now)
      .order('likes_count', { ascending: false })
      .limit(5),
    supabase
      .from('whistles')
      .select('*, profiles!whistles_user_id_fkey(username, display_name, avatar_url)')
      .is('group_id', null)
      .gte('created_at', weekAgo)
      .lte('created_at', now)
      .order('likes_count', { ascending: false })
      .limit(10),
  ])

  const [todayTop, weekTop] = await Promise.all([
    signAudioUrls(supabase, todayTopRaw ?? []),
    signAudioUrls(supabase, weekTopRaw ?? []),
  ])

  return (
    <div>
      <div className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur" style={{ background: 'color-mix(in srgb, var(--bg) 88%, transparent)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Descobrir</h1>
      </div>

      <div className="border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
        <div className="flex items-center gap-3 rounded-full px-4 py-2.5" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border)' }}>
          <Search size={16} className="flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
          <input
            type="search"
            placeholder="Buscar perfis..."
            className="flex-1 bg-transparent text-sm focus:outline-none"
            style={{ color: 'var(--text)' }}
          />
        </div>
      </div>

      <section>
        <div className="border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Em alta hoje</h2>
        </div>
        {todayTop.length === 0 ? (
          <p className="px-4 py-6 text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum post em alta hoje.</p>
        ) : (
          todayTop.map((whistle, index) => (
            <div key={whistle.id} className="flex items-start gap-3 border-b px-4 py-3" style={{ borderColor: 'var(--border)' }}>
              <span className="mt-1 w-6 flex-shrink-0 text-center text-2xl font-black" style={{ color: 'var(--text-faint)' }}>
                {index + 1}
              </span>
              <div className="min-w-0 flex-1">
                <WhistleCard whistle={toFeedItemFromWhistle(whistle)} currentUserId={user?.id ?? null} />
              </div>
            </div>
          ))
        )}
      </section>

      <section>
        <div className="border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-sm font-semibold uppercase tracking-wide" style={{ color: 'var(--text-muted)' }}>Melhor da semana</h2>
        </div>
        {weekTop.length === 0 ? (
          <p className="px-4 py-6 text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum post nesta semana ainda.</p>
        ) : (
          weekTop.map((whistle) => (
            <WhistleCard
              key={whistle.id}
              whistle={toFeedItemFromWhistle(whistle)}
              currentUserId={user?.id ?? null}
            />
          ))
        )}
      </section>
    </div>
  )
}
