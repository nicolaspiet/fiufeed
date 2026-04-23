'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { buildGroupPath } from '@/lib/routes'
import { getDbErrorMessage } from '@/lib/errors'

export default function NovoGrupoPage() {
  const router = useRouter()
  const supabase = createClient()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isPrivate, setIsPrivate] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/entrar'); return }

      const { data, error: err } = await supabase.from('groups').insert({
        name: name.trim(),
        description: description.trim(),
        is_private: isPrivate,
        owner_id: user.id,
      }).select().single()

      if (err) {
        setError(getDbErrorMessage(err.message, err.code))
        return
      }

      router.push(buildGroupPath(data))
    } catch {
      setError('Não foi possível criar o grupo. Verifique sua conexão e tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="sticky top-0 z-30 backdrop-blur px-4 py-3 border-b flex items-center gap-3" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <button onClick={() => router.back()} style={{ color: 'var(--text-muted)' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Novo Grupo</h1>
      </div>

      <form onSubmit={handleCreate} className="p-4 space-y-4">
        <div>
          <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Nome do grupo</label>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            required
            maxLength={60}
            placeholder="Ex: Assoviadores do Nordeste"
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <div>
          <label className="block text-sm mb-1.5" style={{ color: 'var(--text-muted)' }}>Descrição</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            maxLength={200}
            rows={3}
            placeholder="Sobre o grupo..."
            className="w-full rounded-xl px-4 py-3 text-sm focus:outline-none resize-none transition-colors"
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text)' }}
          />
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div
            onClick={() => setIsPrivate(p => !p)}
            className="w-11 h-6 rounded-full transition-colors relative"
            style={{ background: isPrivate ? 'var(--text)' : 'var(--border)' }}
          >
            <div className="absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform" style={{ transform: isPrivate ? 'translateX(20px)' : 'translateX(2px)' }} />
          </div>
          <span className="text-sm" style={{ color: 'var(--text)' }}>Grupo privado</span>
        </label>
        <p className="text-xs -mt-2" style={{ color: 'var(--text-faint)' }}>Grupos privados só aceitam membros por convite.</p>

        {error && (
          <p className="rounded-lg px-3 py-2 text-sm text-red-400" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}>
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={loading || !name.trim()}
          className="w-full font-semibold py-3 rounded-xl transition-colors disabled:opacity-50"
          style={{ background: 'var(--text)', color: 'var(--bg)' }}
        >
          {loading ? 'Criando...' : 'Criar grupo'}
        </button>
      </form>
    </div>
  )
}
