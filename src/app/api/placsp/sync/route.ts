import { NextResponse }                               from 'next/server'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies }                                       from 'next/headers'
import { PlacspSyncService }                            from '@/lib/placsp/PlacspSyncService'

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

export async function POST(req: Request) {
  try {
    const supabase = makeSupabase()
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Accept XML pre-fetched by the browser (bypasses geo-restriction)
    const ct = req.headers.get('content-type') ?? ''
    const feedXml = ct.includes('xml') ? await req.text() : undefined

    const result = await new PlacspSyncService().syncForUser(user.id, supabase, feedXml)

    if (result.status === 'error') {
      return NextResponse.json(result, { status: 502 })
    }
    return NextResponse.json(result)
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'Error interno' },
      { status: 500 }
    )
  }
}
