import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export async function getCompetitionWhistleIds(supabase: SupabaseClient<Database>) {
  const { data } = await supabase.rpc('get_competition_whistle_ids')
  return new Set((data ?? []).map((entry) => entry.whistle_id))
}

export function filterOutCompetitionWhistles<T extends { id: string }>(items: T[], competitionWhistleIds: Set<string>) {
  return items.filter((item) => !competitionWhistleIds.has(item.id))
}

export function filterOutCompetitionReposts<T extends { original_whistle_id: string }>(
  items: T[],
  competitionWhistleIds: Set<string>
) {
  return items.filter((item) => !competitionWhistleIds.has(item.original_whistle_id))
}
