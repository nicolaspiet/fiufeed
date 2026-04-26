import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { signAudioUrls } from '@/lib/audio-url'
import { WhistleCard } from '@/components/feed/WhistleCard'
import { stabilizeFeedItems } from '@/lib/feed'

const PAGE_SIZE = 20
const CANDIDATE_MULTIPLIER = 5

function parsePageParam(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value
  const page = Number.parseInt(rawValue ?? '1', 10)
  return Number.isFinite(page) && page > 0 ? page : 1
}

interface FeedPageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}

export default async function FeedPage({ searchParams }: FeedPageProps) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const resolvedSearchParams = await searchParams
  const page = parsePageParam(resolvedSearchParams.page)
  const visibleCount = page * PAGE_SIZE
  const candidateLimit = Math.max(visibleCount * CANDIDATE_MULTIPLIER, 120)

  const { data: rawFeedItems } = await supabase.rpc('get_feed', {
    p_user_id: user.id,
    p_limit: candidateLimit,
    p_offset: 0,
  })

  const signedItems = await signAudioUrls(supabase, rawFeedItems ?? [])
  const feedItems = stabilizeFeedItems(signedItems, visibleCount)
  const hasMore = (rawFeedItems?.length ?? 0) > feedItems.length
  const originalWhistleIds = Array.from(new Set(feedItems.map((item) => item.original_whistle_id)))

  const { data: likedRows } = originalWhistleIds.length > 0
    ? await supabase.from('likes').select('whistle_id').eq('user_id', user.id).in('whistle_id', originalWhistleIds)
    : { data: [] }
  const likedSet = new Set((likedRows ?? []).map((row) => row.whistle_id))

  const { data: repostRows } = originalWhistleIds.length > 0
    ? await supabase
      .from('reposts')
      .select('original_whistle_id')
      .eq('user_id', user.id)
      .in('original_whistle_id', originalWhistleIds)
    : { data: [] }
  const repostedSet = new Set((repostRows ?? []).map((row) => row.original_whistle_id))

  if (feedItems.length === 0) {
    return (
      <div>
        <div className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
          <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Feed</h1>
        </div>

        <div className="flex flex-col items-center justify-center px-8 py-20 text-center">
          <div className="mb-4 text-5xl">🎵</div>
          <h2 className="mb-2 text-lg font-semibold" style={{ color: 'var(--text)' }}>Seu feed está vazio</h2>
          <p className="text-sm" style={{ color: 'var(--text-faint)' }}>
            Siga outros perfis para ver as publicações deles aqui.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="sticky top-0 z-30 border-b px-4 py-3 backdrop-blur" style={{ background: 'var(--bg)', borderColor: 'var(--border)' }}>
        <h1 className="text-lg font-bold" style={{ color: 'var(--text)' }}>Feed</h1>
      </div>

      {feedItems.map((item) => (
        <WhistleCard
          key={`${item.item_type}-${item.item_id}`}
          whistle={item}
          currentUserId={user.id}
          initialLiked={likedSet.has(item.original_whistle_id)}
          initialReposted={repostedSet.has(item.original_whistle_id)}
        />
      ))}

      {hasMore ? (
        <div className="px-4 py-6">
          <Link
            href={`/feed?page=${page + 1}`}
            scroll={false}
            className="flex w-full items-center justify-center rounded-full px-4 py-3 text-sm font-semibold transition-colors hover:opacity-90"
            style={{ background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)' }}
          >
            Carregar mais 20
          </Link>
        </div>
      ) : null}
    </div>
  )
}
