'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildCompetitionPath } from '@/lib/routes'
import { getDbErrorMessage } from '@/lib/errors'

export default function NovaCompeticaoPage() {
  const router = useRouter()
  const supabase = createClient()

  const [title, setTitle] = useState('')
  const [theme, setTheme] = useState('')
  const [description, setDescription] = useState('')
  const [titleBase, setTitleBase] = useState('')
  const [submissionEndsAt, setSubmissionEndsAt] = useState('')
  const [votingEndsAt, setVotingEndsAt] = useState('')
  const [groupId, setGroupId] = useState('')
  const [groups, setGroups] = useState<Array<{ id: string; name: string }>>([])
  const [isSiteAdmin, setIsSiteAdmin] = useState(false)
  const [loading, setLoading] = useState(false)
  const [booting, setBooting] = useState(true)
  const [error, setError] = useState('')
  const [canHost, setCanHost] = useState(true)

  useEffect(() => {
    async function loadPermissions() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/entrar')
        return
      }

      const [{ data: profile }, { data: membershipRows }] = await Promise.all([
        supabase.from('profiles').select('is_site_admin').eq('id', user.id).single(),
        supabase
          .from('group_members')
          .select('group_id')
          .eq('user_id', user.id)
          .in('role', ['owner', 'admin']),
      ])

      const nextIsSiteAdmin = profile?.is_site_admin ?? false
      const groupIds = Array.from(new Set((membershipRows ?? []).map((row) => row.group_id)))
      const { data: managedGroups } = groupIds.length > 0
        ? await supabase.from('groups').select('id, name').in('id', groupIds).order('name', { ascending: true })
        : { data: [] }

      const nextGroups = managedGroups ?? []
      const nextCanHost = nextIsSiteAdmin || nextGroups.length > 0

      setIsSiteAdmin(nextIsSiteAdmin)
      setGroups(nextGroups)
      setCanHost(nextCanHost)

      if (nextIsSiteAdmin) {
        setGroupId('public')
      } else if (nextGroups.length > 0) {
        setGroupId(nextGroups[0].id)
      } else {
        setGroupId('')
      }

      setBooting(false)
    }

    void loadPermissions().catch(() => {
      setError('Não foi possível carregar as permissões. Recarregue a página.')
      setBooting(false)
    })
  }, [router, supabase])

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault()
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      router.push('/entrar')
      return
    }

    if (!canHost) {
      setError('Você não tem permissão para hospedar competições.')
      return
    }

    if (!groupId) {
      setError('Escolha onde essa competição vai rodar.')
      return
    }

    if (groupId === 'public' && !isSiteAdmin) {
      setError('Somente admins do site podem criar competições públicas.')
      return
    }

    const submissionDate = new Date(submissionEndsAt)
    const votingDate = new Date(votingEndsAt)

    if (Number.isNaN(submissionDate.getTime()) || Number.isNaN(votingDate.getTime())) {
      setError('Preencha as duas datas.')
      return
    }

    if (submissionDate.getTime() <= Date.now()) {
      setError('O fim dos envios precisa ficar no futuro.')
      return
    }

    if (votingDate.getTime() <= submissionDate.getTime()) {
      setError('A votação precisa terminar depois da fase de envios.')
      return
    }

    setLoading(true)

    try {
      const { data, error: insertError } = await supabase
        .from('competitions')
        .insert({
          title: title.trim(),
          theme: theme.trim(),
          description: description.trim(),
          title_base: titleBase.trim(),
          submission_ends_at: submissionDate.toISOString(),
          voting_ends_at: votingDate.toISOString(),
          group_id: groupId === 'public' ? null : groupId,
          created_by: user.id,
        })
        .select('id, public_id, slug, title')
        .single()

      if (insertError) {
        setError(getDbErrorMessage(insertError.message, insertError.code))
        return
      }

      router.push(buildCompetitionPath(data))
    } catch {
      setError('Não foi possível criar a competição. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!booting && !canHost) {
    return (
      <div>
        <div className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <button onClick={() => router.back()} style={{ color: 'var(--text-muted)' }}>
            <ArrowLeft size={20} />
          </button>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Nova competição</h1>
        </div>

        <div className="px-4 py-10">
          <h2 className="text-lg font-semibold" style={{ color: 'var(--text)' }}>Sem permissão para hospedar</h2>
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>
            Competições públicas são exclusivas para admins do site. Competições de grupo são exclusivas para owners e admins do próprio grupo.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-30 flex items-center gap-3 border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <button onClick={() => router.back()} style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Nova competição</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 p-4">
        <div>
          <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Título</label>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
            maxLength={80}
            placeholder="Ex: Melhor abertura da semana"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Tema</label>
          <input
            value={theme}
            onChange={(event) => setTheme(event.target.value)}
            required
            maxLength={80}
            placeholder="Ex: Pássaros do amanhecer"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Base do título</label>
          <input
            value={titleBase}
            onChange={(event) => setTitleBase(event.target.value)}
            required
            maxLength={60}
            placeholder="Ex: Mestre do Amanhecer"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
          <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
            O sistema vai gerar Ouro, Prata e Bronze a partir dessa base.
          </p>
        </div>

        <div>
          <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Descrição</label>
          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            rows={4}
            maxLength={240}
            placeholder="Explique a ideia da disputa e o que você espera dos envios."
            className="w-full resize-none rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Onde essa competição vai rodar</label>
          <select
            value={groupId}
            onChange={(event) => setGroupId(event.target.value)}
            disabled={booting}
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          >
            {isSiteAdmin && <option value="public">Pública no app inteiro</option>}
            {groups.map((group) => (
              <option key={group.id} value={group.id}>{group.name}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Envios até</label>
          <input
            type="datetime-local"
            value={submissionEndsAt}
            onChange={(event) => setSubmissionEndsAt(event.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm" style={{ color: 'var(--text-muted)' }}>Votação até</label>
          <input
            type="datetime-local"
            value={votingEndsAt}
            onChange={(event) => setVotingEndsAt(event.target.value)}
            required
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>

        {error && (
          <p className="rounded-lg px-3 py-2 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || booting || !title.trim() || !theme.trim() || !titleBase.trim() || !groupId}
          className="w-full rounded-xl py-3 font-semibold transition-colors disabled:opacity-50"
          style={{ background: 'var(--text)', color: 'var(--bg)' }}
        >
          {loading ? 'Criando...' : 'Criar competição'}
        </button>
      </form>
    </div>
  )
}
