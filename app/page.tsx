import { HeroSection } from '@/components/ui/glass-video-hero'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return <HeroSection isLoggedIn={Boolean(user)} />
}
