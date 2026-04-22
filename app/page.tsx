import { redirect } from 'next/navigation'
import { HeroSection } from '@/components/ui/glass-video-hero'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/feed')
  }

  return <HeroSection />
}
