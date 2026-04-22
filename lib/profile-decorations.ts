import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

interface ProfileDecorationTarget {
  id: string
  equipped_badge_id?: string | null
  equipped_title_id?: string | null
}

export async function getEquippedDecorations(
  supabase: SupabaseClient<Database>,
  profiles: ProfileDecorationTarget[]
) {
  const badgeIds = Array.from(new Set(profiles.map((profile) => profile.equipped_badge_id).filter(Boolean))) as string[]
  const titleIds = Array.from(new Set(profiles.map((profile) => profile.equipped_title_id).filter(Boolean))) as string[]

  const [{ data: badges }, { data: titles }] = await Promise.all([
    badgeIds.length > 0
      ? supabase.from('user_badges').select('id, label').in('id', badgeIds)
      : Promise.resolve({ data: [] as Array<{ id: string; label: string }> }),
    titleIds.length > 0
      ? supabase.from('user_titles').select('id, title').in('id', titleIds)
      : Promise.resolve({ data: [] as Array<{ id: string; title: string }> }),
  ])

  const badgeById = new Map((badges ?? []).map((badge) => [badge.id, badge.label]))
  const titleById = new Map((titles ?? []).map((title) => [title.id, title.title]))

  return new Map(
    profiles.map((profile) => [
      profile.id,
      {
        equipped_badge_label: profile.equipped_badge_id ? badgeById.get(profile.equipped_badge_id) ?? null : null,
        equipped_title: profile.equipped_title_id ? titleById.get(profile.equipped_title_id) ?? null : null,
      },
    ])
  )
}
