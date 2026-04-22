export const dynamic = 'force-dynamic'

import { createClient } from '@/lib/supabase/server'
import { BottomNav } from '@/components/ui/BottomNav'
import { RightSidebar } from '@/components/ui/RightSidebar'
import { Sidebar } from '@/components/ui/Sidebar'
import { PostButton } from '@/components/ui/PostButton'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()
    profile = data
  }

  const now = new Date().toISOString()
  const dayAgo = new Date(Date.now() - 86400000).toISOString()
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString()
  const { data: publicGroupRows } = await supabase
    .from('groups')
    .select('id')
    .eq('is_private', false)

  const publicGroupIds = (publicGroupRows ?? []).map((group) => group.id)
  const publicScopeFilter = publicGroupIds.length > 0
    ? `group_id.is.null,group_id.in.(${publicGroupIds.join(',')})`
    : 'group_id.is.null'

  const [activeCompetitionsResult, todayTopResult, weekTopResult] = await Promise.all([
    supabase
      .from('competitions')
      .select('id, title, theme, submission_ends_at, voting_ends_at')
      .is('group_id', null)
      .gte('voting_ends_at', now)
      .order('submission_ends_at', { ascending: true })
      .limit(4),
    supabase
      .from('whistles')
      .select('id, caption, likes_count, comments_count, profiles!whistles_user_id_fkey(username, display_name)')
      .or(publicScopeFilter)
      .gte('created_at', dayAgo)
      .lte('created_at', now)
      .order('likes_count', { ascending: false })
      .limit(3),
    supabase
      .from('whistles')
      .select('id, caption, likes_count, comments_count, profiles!whistles_user_id_fkey(username, display_name)')
      .or(publicScopeFilter)
      .gte('created_at', weekAgo)
      .lte('created_at', now)
      .order('likes_count', { ascending: false })
      .limit(3),
  ])

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
      <div className="flex justify-center">
        <div className="flex w-full max-w-[1320px]">
          <div className="hidden lg:flex flex-col w-[240px] xl:w-[260px] shrink-0">
            <div className="sticky top-0 h-screen">
              <Sidebar profile={profile} />
            </div>
          </div>
          <main className="flex-1 min-w-0 pb-20 lg:pb-0" style={{ borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
            {children}
          </main>
          <div className="hidden xl:flex w-[320px] shrink-0">
            <div className="sticky top-0 max-h-screen w-full overflow-y-auto">
              <RightSidebar
                profile={profile}
                competitions={activeCompetitionsResult.data ?? []}
                todayTop={todayTopResult.data ?? []}
                weekTop={weekTopResult.data ?? []}
              />
            </div>
          </div>
        </div>
      </div>
      <BottomNav />
      <PostButton userId={user?.id ?? null} />
    </div>
  )
}
