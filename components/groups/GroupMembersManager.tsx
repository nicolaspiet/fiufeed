'use client'

import { useState } from 'react'
import { Crown, Shield, UserMinus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface GroupMemberListItem {
  user_id: string
  role: 'owner' | 'admin' | 'member'
  profile: {
    username: string
    display_name: string
    avatar_url: string | null
  }
}

interface GroupMembersManagerProps {
  groupId: string
  currentUserId: string | null
  currentUserRole: 'owner' | 'admin' | 'member' | null
  members: GroupMemberListItem[]
}

function roleLabel(role: GroupMemberListItem['role']) {
  if (role === 'owner') return 'Owner'
  if (role === 'admin') return 'Admin'
  return 'Membro'
}

export function GroupMembersManager({
  groupId,
  currentUserId,
  currentUserRole,
  members: initialMembers,
}: GroupMembersManagerProps) {
  const supabase = createClient()
  const [members, setMembers] = useState(initialMembers)
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [error, setError] = useState('')

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin'

  async function updateRole(targetUserId: string, nextRole: 'admin' | 'member') {
    setLoadingId(targetUserId)
    setError('')

    const { error: rpcError } = await supabase.rpc('set_group_member_role', {
      p_group_id: groupId,
      p_target_user_id: targetUserId,
      p_role: nextRole,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoadingId(null)
      return
    }

    setMembers((current) =>
      current.map((member) =>
        member.user_id === targetUserId ? { ...member, role: nextRole } : member
      )
    )
    setLoadingId(null)
  }

  async function removeMember(targetUserId: string) {
    setLoadingId(targetUserId)
    setError('')

    const { error: rpcError } = await supabase.rpc('remove_group_member', {
      p_group_id: groupId,
      p_target_user_id: targetUserId,
    })

    if (rpcError) {
      setError(rpcError.message)
      setLoadingId(null)
      return
    }

    setMembers((current) => current.filter((member) => member.user_id !== targetUserId))
    setLoadingId(null)
  }

  function renderActions(member: GroupMemberListItem) {
    if (!canManage || !currentUserId || member.user_id === currentUserId) return null
    if (member.role === 'owner') return null

    if (currentUserRole === 'owner') {
      return (
        <div className="flex flex-wrap gap-2">
          {member.role === 'member' ? (
            <button
              onClick={() => updateRole(member.user_id, 'admin')}
              disabled={loadingId === member.user_id}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--surface)', color: 'var(--text)' }}
            >
              Tornar admin
            </button>
          ) : (
            <button
              onClick={() => updateRole(member.user_id, 'member')}
              disabled={loadingId === member.user_id}
              className="rounded-full px-3 py-1 text-xs font-medium transition-colors disabled:opacity-50"
              style={{ background: 'var(--surface)', color: 'var(--text)' }}
            >
              Rebaixar
            </button>
          )}
          <button
            onClick={() => removeMember(member.user_id)}
            disabled={loadingId === member.user_id}
            className="rounded-full px-3 py-1 text-xs font-medium text-red-400 transition-colors disabled:opacity-50"
            style={{ background: 'rgba(239,68,68,0.1)' }}
          >
            Remover
          </button>
        </div>
      )
    }

    if (currentUserRole === 'admin' && member.role === 'member') {
      return (
        <button
          onClick={() => removeMember(member.user_id)}
          disabled={loadingId === member.user_id}
          className="rounded-full px-3 py-1 text-xs font-medium text-red-400 transition-colors disabled:opacity-50"
          style={{ background: 'rgba(239,68,68,0.1)' }}
        >
          Remover
        </button>
      )
    }

    return null
  }

  return (
    <section style={{ borderBottom: '1px solid var(--border)' }}>
      <div className="px-4 py-3" style={{ background: 'var(--surface)' }}>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text)' }}>Membros</h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--text-faint)' }}>
          {canManage ? 'Owners gerenciam admins. Admins gerenciam membros.' : 'Veja quem participa deste grupo.'}
        </p>
      </div>
      {error && (
        <p className="px-4 py-3 text-sm text-red-400">{error}</p>
      )}
      <div>
        {members.map((member) => (
          <div key={member.user_id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: '1px solid var(--border)' }}>
            {member.profile.avatar_url ? (
              <img src={member.profile.avatar_url} alt="" className="h-10 w-10 rounded-full object-cover" />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-700 text-sm font-bold text-white">
                {member.profile.display_name?.[0]?.toUpperCase() ?? '?'}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium" style={{ color: 'var(--text)' }}>
                  {member.profile.display_name}
                </p>
                {member.role === 'owner' && <Crown size={14} className="text-yellow-400" />}
                {member.role === 'admin' && <Shield size={14} className="text-emerald-400" />}
              </div>
              <p className="truncate text-xs" style={{ color: 'var(--text-faint)' }}>
                @{member.profile.username} · {roleLabel(member.role)}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {renderActions(member)}
              {loadingId === member.user_id && <UserMinus size={14} style={{ color: 'var(--text-faint)' }} />}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
