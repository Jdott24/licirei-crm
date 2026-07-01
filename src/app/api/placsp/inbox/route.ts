import { NextResponse }                               from 'next/server'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies }                                       from 'next/headers'
import { PlacspRepository }                             from '@/lib/placsp/PlacspRepository'

export const dynamic = 'force-dynamic'

function makeSupabase() {
  const store = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) => {
            try { store.set(name, value, options) } catch {}
          })
        },
      } satisfies CookieMethodsServer,
    }
  )
}

export async function GET() {
  try {
    const supabase = makeSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const items = await new PlacspRepository().getInbox(user.id, supabase)
    return NextResponse.json(items)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
