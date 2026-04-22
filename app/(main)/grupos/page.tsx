import Link from 'next/link'
import { Lock, Plus, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { buildGroupPath } from '@/lib/routes'

export default async function GruposPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let myGroups: { group_id: string }[] = []
  if (user) {
    const { data } = await supabase.from('group_members').select('group_id').eq('user_id', user.id)
    myGroups = data ?? []
  }

  const myGroupIds = myGroups.map((group) => group.group_id)

  const { data: groups } = myGroupIds.length > 0
    ? await supabase.from('groups').select('*').in('id', myGroupIds).order('created_at', { ascending: false })
    : { data: [] }

  const { data: publicGroups } = await supabase
    .from('groups')
    .select('*')
    .eq('is_private', false)
    .not('id', 'in', myGroupIds.length > 0 ? `(${myGroupIds.join(',')})` : '()')
    .order('created_at', { ascending: false })
    .limit(20)

  return (
    <div>
      <div className="sticky top-0 z-30 flex items-center justify-between border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Grupos</h1>
        <Link href="/grupos/novo" className="flex items-center gap-1.5 text-sm font-medium" style={{ color: 'var(--text-muted)' }}>
          <Plus size={16} />
          Novo
        </Link>
      </div>

      {(groups ?? []).length > 0 && (
        <section>
          <div className="border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
            <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Meus Grupos</h2>
          </div>
          {(groups ?? []).map((group) => (
            <Link
              key={group.id}
              href={buildGroupPath(group)}
              className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-[var(--hover-bg)]"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
                {group.avatar_url ? (
                  <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users size={20} style={{ color: 'var(--text-faint)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{group.name}</p>
                  {group.is_private && <Lock size={12} className="flex-shrink-0" style={{ color: 'var(--text-faint)' }} />}
                </div>
                {group.description && <p className="truncate text-xs" style={{ color: 'var(--text-faint)' }}>{group.description}</p>}
              </div>
            </Link>
          ))}
        </section>
      )}

      <section>
        <div className="border-b px-4 py-3" style={{ background: 'var(--surface)', borderColor: 'var(--border)' }}>
          <h2 className="text-xs font-semibold uppercase tracking-wide" style={{ color: 'var(--text-faint)' }}>Descobrir Grupos</h2>
        </div>
        {(publicGroups ?? []).length === 0 ? (
          <p className="px-4 py-6 text-sm" style={{ color: 'var(--text-faint)' }}>Nenhum grupo publico ainda.</p>
        ) : (
          (publicGroups ?? []).map((group) => (
            <Link
              key={group.id}
              href={buildGroupPath(group)}
              className="flex items-center gap-3 border-b px-4 py-3 transition-colors hover:bg-[var(--hover-bg)]"
              style={{ borderColor: 'var(--border)' }}
            >
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-full" style={{ background: 'var(--surface)' }}>
                {group.avatar_url ? (
                  <img src={group.avatar_url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <Users size={20} style={{ color: 'var(--text-faint)' }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>{group.name}</p>
                {group.description && <p className="truncate text-xs" style={{ color: 'var(--text-faint)' }}>{group.description}</p>}
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}
