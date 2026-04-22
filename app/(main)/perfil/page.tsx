import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function PerfilRedirectPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/entrar')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  if (profile) redirect(`/perfil/${profile.username}`)
  redirect('/feed')
}
