import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Sidebar from '@/components/Sidebar'
import type { Profile } from '@/lib/types'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: '#0a0e2a' }}>
      <Sidebar profile={profile as Profile | null} />
      <main className="flex-1 overflow-y-auto ml-[252px]">
        {children}
      </main>
    </div>
  )
}
