import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function createClient() {
  const cookieStore = cookies()

  const cookieMethods: CookieMethodsServer = {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) {
      cookiesToSet.forEach(({ name, value, options }) => {
        try { cookieStore.set(name, value, options) } catch {}
      })
    },
  }

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: cookieMethods }
  )
}
