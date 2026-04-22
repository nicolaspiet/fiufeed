import Link from 'next/link'
import { Plus, Trophy } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { CountdownTimer } from '@/components/competition/CountdownTimer'
import { buildCompetitionPath } from '@/lib/routes'

export default async function CompeticoesPage() {
  const supabase = await createClient()
  const now = new Date().toISOString()
  const { data: { user } } = await supabase.auth.getUser()

  let canHostCompetition = false
  if (user) {
    const [{ data: profile }, { data: memberships }] = await Promise.all([
      supabase.from('profiles').select('is_site_admin').eq('id', user.id).single(),
      supabase.from('group_members').select('group_id').eq('user_id', user.id).in('role', ['owner', 'admin']).limit(1),
    ])
    canHostCompetition = Boolean(profile?.is_site_admin) || Boolean((memberships ?? []).length > 0)
  }

  const { data: active } = await supabase
    .from('competitions')
    .select('*')
    .is('group_id', null)
    .gte('voting_ends_at', now)
    .order('submission_ends_at', { ascending: true })

  const { data: past } = await supabase
    .from('competitions')
    .select('*')
    .is('group_id', null)
    .lt('voting_ends_at', now)
    .order('voting_ends_at', { ascending: false })
    .limit(10)

  function getStatus(competition: { submission_ends_at: string; voting_ends_at: string }) {
    const currentTime = Date.now()
    if (currentTime < new Date(competition.submission_ends_at).getTime()) return 'submissao'
    if (currentTime < new Date(competition.voting_ends_at).getTime()) return 'votacao'
    return 'encerrada'
  }

  const statusLabel = { submissao: 'Enviando', votacao: 'Votação', encerrada: 'Encerrada' }
  const statusColor = { submissao: 'text-emerald-400 bg-emerald-500/10', votacao: 'text-blue-400 bg-blue-500/10', encerrada: 'text-zinc-500 bg-zinc-800' }

  return (
    <div>
      <div className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <div className="flex items-center justify-between gap-3">
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Competições</h1>
          {canHostCompetition && (
            <Link href="/competicoes/nova" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
              <Plus size={16} />
              Nova
            </Link>
          )}
        </div>
      </div>

      <section>
        <div className="border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Ativas</h2>
        </div>
        {(active ?? []).length === 0 ? (
          <p className="px-4 py-6 text-sm" style={{ color: 'var(--text-faint)' }}>Nenhuma competição ativa no momento.</p>
        ) : (
          (active ?? []).map((competition) => {
            const status = getStatus(competition)

            return (
              <Link
                key={competition.id}
                href={buildCompetitionPath(competition)}
                className="block border-b px-4 py-4 transition-colors hover:bg-[var(--hover-bg)]"
                style={{ borderColor: 'var(--border)' }}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${statusColor[status]}`}>{statusLabel[status]}</span>
                    </div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{competition.title}</h3>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--text-faint)' }}>Tema: {competition.theme}</p>
                  </div>
                  <Trophy size={20} className="mt-0.5 flex-shrink-0 text-emerald-400" />
                </div>
                <div className="mt-2">
                  {status === 'submissao' && <CountdownTimer endsAt={competition.submission_ends_at} label="Envios encerram em" />}
                  {status === 'votacao' && <CountdownTimer endsAt={competition.voting_ends_at} label="Votação encerra em" />}
                </div>
              </Link>
            )
          })
        )}
      </section>

      {(past ?? []).length > 0 && (
        <section>
          <div className="border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Encerradas</h2>
          </div>
          {(past ?? []).map((competition) => (
            <Link
              key={competition.id}
              href={buildCompetitionPath(competition)}
              className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-[var(--hover-bg)]"
              style={{ borderColor: 'var(--border)' }}
            >
              <Trophy size={18} className="flex-shrink-0" style={{ color: 'var(--text-faint)' }} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm" style={{ color: 'var(--text-muted)' }}>{competition.title}</p>
                <p className="text-xs" style={{ color: 'var(--text-faint)' }}>Tema: {competition.theme}</p>
              </div>
            </Link>
          ))}
        </section>
      )}
    </div>
  )
}
