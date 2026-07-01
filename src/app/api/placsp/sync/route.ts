import { NextResponse } from 'next/server'
import { createServerClient, type CookieMethodsServer } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { XMLParser } from 'fast-xml-parser'

const PLACSP_FEED = 'https://contrataciondelestado.es/sindicacion/sindicacion_1016/licitacionesPerfilesContratanteCompleto3.atom'
const MAX_FEED_SIZE = 5 * 1024 * 1024 // 5 MB
const FETCH_TIMEOUT_MS = 15000        // 15 s

function makeSupabase() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll: (list) => {
          list.forEach(({ name, value, options }) => {
            try { cookieStore.set(name, value, options) } catch {}
          })
        },
      } satisfies CookieMethodsServer,
    }
  )
}

export async function POST() {
  try {
    const supabase = makeSupabase()

    // Verificar sesión
    const { data: { user }, error: authErr } = await supabase.auth.getUser()
    if (authErr || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener filtros CPV activos del usuario (filtrado por user_id)
    const { data: filtros, error: fErr } = await supabase
      .from('cpv_filters')
      .select('*')
      .eq('activo', true)
      .eq('user_id', user.id)

    if (fErr) return NextResponse.json({ error: fErr.message }, { status: 500 })
    if (!filtros || filtros.length === 0) {
      return NextResponse.json({ nuevas: 0, msg: 'Sin filtros CPV activos' })
    }

    // Todos los CPV a vigilar
    const cpvsActivos = new Set(filtros.flatMap((f: { cpvs: string[] }) => f.cpvs))
    if (cpvsActivos.size === 0) {
      return NextResponse.json({ nuevas: 0, msg: 'Los filtros activos no tienen códigos CPV' })
    }

    // Obtener expedientes ya en inbox para evitar duplicados
    const { data: existing } = await supabase
      .from('inbox')
      .select('expediente')
      .eq('user_id', user.id)
    const existingSet = new Set((existing ?? []).map((r: { expediente: string }) => r.expediente))

    // Descargar feed ATOM con timeout y límite de tamaño
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

    let feedRes: Response
    try {
      feedRes = await fetch(PLACSP_FEED, {
        headers: { 'Accept': 'application/atom+xml, application/xml, text/xml' },
        next: { revalidate: 300 },
        signal: controller.signal,
      })
    } catch (fetchErr) {
      clearTimeout(timeoutId)
      const msg = fetchErr instanceof Error && fetchErr.name === 'AbortError'
        ? 'Tiempo de espera agotado al acceder al feed PLACSP'
        : 'No se pudo conectar con el feed PLACSP'
      return NextResponse.json({ error: msg }, { status: 502 })
    }
    clearTimeout(timeoutId)

    if (!feedRes.ok) {
      return NextResponse.json({ error: `Error al acceder al feed PLACSP: HTTP ${feedRes.status}` }, { status: 502 })
    }

    const contentLength = feedRes.headers.get('content-length')
    if (contentLength && parseInt(contentLength) > MAX_FEED_SIZE) {
      return NextResponse.json({ error: 'Feed XML demasiado grande' }, { status: 413 })
    }

    const xml = await feedRes.text()
    if (xml.length > MAX_FEED_SIZE) {
      return NextResponse.json({ error: 'Feed XML demasiado grande' }, { status: 413 })
    }

    const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' })
    const doc = parser.parse(xml)

    const feed   = doc?.feed ?? doc?.['atom:feed'] ?? {}
    const entries: unknown[] = Array.isArray(feed.entry) ? feed.entry : feed.entry ? [feed.entry] : []

    // Mapear entradas a contratos
    const nuevosItems: {
      expediente: string; org: string; obj: string;
      presupuesto: number; plazo: string | null; cpv: string; filtro: string
    }[] = []

    for (const raw of entries) {
      const entry = raw as Record<string, unknown>
      const title = String(entry.title ?? entry['atom:title'] ?? '')
      const summary = String(entry.summary ?? entry['atom:summary'] ?? entry.content ?? '')

      // Intentar extraer CPV del contenido XML embebido
      const cpvMatch = (summary + title).match(/(\d{8}-\d)/g)
      if (!cpvMatch) continue

      // Ver si algún CPV coincide con los filtros activos
      const matchedCpv = cpvMatch.find(c => cpvsActivos.has(c))
      if (!matchedCpv) continue

      // Extraer datos del entry
      const id = String(entry.id ?? entry['atom:id'] ?? `PCSP-${Date.now()}-${Math.random()}`)
      const expediente = id.split('/').pop() ?? id

      if (existingSet.has(expediente)) continue

      // Buscar el nombre del filtro que coincide
      const filtroNombre = filtros.find((f: { cpvs: string[] }) => f.cpvs.includes(matchedCpv))?.nombre ?? matchedCpv

      // Intentar extraer presupuesto del summary
      const importeMatch = summary.match(/(\d{1,3}(?:\.\d{3})*(?:,\d+)?)\s*€/)?.[1]
      const presupuesto = importeMatch
        ? parseFloat(importeMatch.replace(/\./g, '').replace(',', '.'))
        : 0

      // Intentar extraer fecha límite
      const fechaMatch = summary.match(/(\d{2})\/(\d{2})\/(\d{4})/)
      const plazo = fechaMatch
        ? `${fechaMatch[3]}-${fechaMatch[2]}-${fechaMatch[1]}`
        : null

      // Organismo: primera línea del título o del summary
      const org = title.split('\n')[0].substring(0, 120).trim() || 'Organismo desconocido'

      nuevosItems.push({ expediente, org, obj: title, presupuesto, plazo, cpv: matchedCpv, filtro: filtroNombre })
      existingSet.add(expediente)
    }

    if (nuevosItems.length === 0) {
      return NextResponse.json({ nuevas: 0, msg: 'Sin licitaciones nuevas que coincidan con tus filtros CPV' })
    }

    // Insertar en inbox con user_id explícito
    const { error: insErr } = await supabase.from('inbox').insert(
      nuevosItems.map(item => ({
        ...item,
        publicado: new Date().toISOString().slice(0, 10),
        user_id: user.id,
      }))
    )
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    // Registrar actividad con user_id explícito
    await supabase.from('activity').insert({
      quien: 'Sistema',
      txt: `Sincronización PLACSP: ${nuevosItems.length} licitaciones nuevas detectadas`,
      tone: 'ok',
      user_id: user.id,
    })

    return NextResponse.json({ nuevas: nuevosItems.length })

  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error interno'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
