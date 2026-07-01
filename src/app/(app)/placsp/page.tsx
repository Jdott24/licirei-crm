'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient }         from '@/lib/supabase/client'
import { fmtDate, fmtEur }      from '@/lib/utils'
import type { CpvFilter, PipelineStage } from '@/lib/types'
import type { PlacspInboxItem, SyncResult } from '@/lib/placsp/types'
import PipelineStageModal        from '@/components/PipelineStageModal'

const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }

type ModalState = { item: PlacspInboxItem } | null

export default function PlacspPage() {
  const supabase = createClient()
  const [inbox,     setInbox]     = useState<PlacspInboxItem[]>([])
  const [filters,   setFilters]   = useState<CpvFilter[]>([])
  const [inputs,    setInputs]    = useState<Record<string, string>>({})
  const [modal,     setModal]     = useState<ModalState>(null)
  const [syncing,   setSyncing]   = useState(false)
  const [creating,  setCreating]  = useState(false)
  const [syncResult,setSyncResult]= useState<SyncResult | null>(null)
  const [error,     setError]     = useState('')
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  const fetchInbox = useCallback(async () => {
    const res = await fetch('/api/placsp/inbox')
    if (!res.ok) { setError('Error al cargar la bandeja'); return }
    setInbox(await res.json())
  }, [])

  const fetchFilters = useCallback(async () => {
    const { data, error: fErr } = await supabase
      .from('cpv_filters').select('*').order('nombre')
    if (fErr) { setError(fErr.message); return }
    setFilters(data ?? [])
  }, [supabase])

  useEffect(() => { fetchInbox(); fetchFilters() }, [fetchInbox, fetchFilters])

  async function syncPlacsp() {
    setSyncing(true); setSyncResult(null); setError('')
    try {
      const res  = await fetch('/api/placsp/sync', { method: 'POST' })
      const json = await res.json() as SyncResult
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setSyncResult(json)
      setLastCheck(new Date().toLocaleString('es-ES', {
        day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
      }))
      await fetchInbox()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  async function confirmarPresentarse(stage: PipelineStage, responsable: string) {
    if (!modal) return
    const item = modal.item
    setModal(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada, recarga la página'); return }

    const { error: pErr } = await supabase.from('pipeline').insert({
      expediente:  item.canonical_id,
      org:         item.organismo,
      obj:         item.titulo,
      presupuesto: item.presupuesto,
      plazo:       item.plazo,
      responsable,
      docs_done:   0,
      docs_total:  6,
      cpv:         item.matched_cpvs[0] ?? item.cpvs[0] ?? '',
      stage,
      user_id:     user.id,
    })
    if (pErr) { setError(pErr.message); return }

    // Mark as presentada in client_contracts
    await supabase
      .from('client_contracts')
      .update({ estado: 'presentada' })
      .eq('id', item.client_contract_id)

    await supabase.from('activity').insert({
      quien:   responsable,
      txt:     `${item.organismo} añadida al pipeline — etapa: ${stage}`,
      tone:    'ok',
      user_id: user.id,
    })
    await fetchInbox()
  }

  async function descartar(item: PlacspInboxItem) {
    const { error: dErr } = await supabase
      .from('client_contracts')
      .update({ estado: 'descartada' })
      .eq('id', item.client_contract_id)
    if (dErr) { setError(dErr.message); return }
    await fetchInbox()
  }

  async function toggleFilter(f: CpvFilter) {
    const { error: err } = await supabase
      .from('cpv_filters').update({ activo: !f.activo }).eq('id', f.id)
    if (err) { setError(err.message); return }
    await fetchFilters()
  }

  async function addCpv(fid: string) {
    const raw = (inputs[fid] ?? '').trim().toUpperCase()
    if (!raw) return
    const fil = filters.find((f) => f.id === fid)
    if (!fil || fil.cpvs.includes(raw)) return
    const { error: cErr } = await supabase
      .from('cpv_filters').update({ cpvs: [...fil.cpvs, raw] }).eq('id', fid)
    if (cErr) { setError(cErr.message); return }
    setInputs((p) => ({ ...p, [fid]: '' }))
    await fetchFilters()
  }

  async function removeCpv(fid: string, cpv: string) {
    const fil = filters.find((f) => f.id === fid)
    if (!fil) return
    const { error: err } = await supabase
      .from('cpv_filters').update({ cpvs: fil.cpvs.filter((c) => c !== cpv) }).eq('id', fid)
    if (err) { setError(err.message); return }
    await fetchFilters()
  }

  async function crearFiltro() {
    setCreating(true); setError('')
    try {
      const { data: { user }, error: authErr } = await supabase.auth.getUser()
      if (authErr || !user) { setError('Sesión expirada, recarga la página'); return }
      const { error: fErr } = await supabase.from('cpv_filters').insert({
        nombre: 'Nuevo filtro', cliente: '', cpvs: [], activo: true, user_id: user.id,
      })
      if (fErr) { setError(fErr.message); return }
      await fetchFilters()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear filtro')
    } finally {
      setCreating(false)
    }
  }

  const syncStatusMsg = syncResult
    ? syncResult.status === 'no_filters'
      ? 'Sin filtros CPV activos'
      : syncResult.status === 'error'
      ? syncResult.error ?? 'Error al sincronizar'
      : `${syncResult.inserted} nuevas · ${syncResult.updated} actualizadas · ${syncResult.matched} coincidencias · ${syncResult.duration}ms`
    : null

  return (
    <div className="p-7 pb-10">
      {modal && (
        <PipelineStageModal
          item={{ org: modal.item.organismo, obj: modal.item.titulo, expediente: modal.item.canonical_id }}
          onConfirm={confirmarPresentarse}
          onCancel={() => setModal(null)}
        />
      )}

      <div className="flex justify-between items-end mb-5 gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Explorar PLACSP</h1>
          <p className="text-[13px] text-[#7288AE] mt-1">Licitaciones nuevas detectadas según tus filtros CPV</p>
        </div>
        <div className="flex items-center gap-3">
          {lastCheck && (
            <span className="text-[11.5px] text-[#7288AE]">
              Última sync: <span className="font-mono text-[#8e98c9]">{lastCheck}</span>
            </span>
          )}
          <button onClick={syncPlacsp} disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] font-semibold text-[#EAE0CF] transition-opacity"
            style={{ background: '#4B5694', opacity: syncing ? 0.6 : 1 }}>
            <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8"
              className={syncing ? 'animate-spin' : ''}>
              <path d="M13.5 8A5.5 5.5 0 1 1 8 2.5M13.5 2.5v3h-3"/>
            </svg>
            {syncing ? 'Buscando…' : 'Sincronizar PLACSP'}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[12.5px] text-[#F87171]"
          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
          {error}
        </div>
      )}

      {syncStatusMsg && !error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[12.5px]"
          style={{
            color:      syncResult?.status === 'error' ? '#F87171' : '#34D399',
            background: syncResult?.status === 'error' ? 'rgba(248,113,113,0.10)' : 'rgba(52,211,153,0.10)',
            border:     syncResult?.status === 'error' ? '1px solid rgba(248,113,113,0.20)' : '1px solid rgba(52,211,153,0.20)',
          }}>
          {syncStatusMsg}
          {syncResult && syncResult.fallbackIdentities > 0 && (
            <span className="ml-3 text-[#FBBF24]">
              · {syncResult.fallbackIdentities} sin ID canónico (XML Codice no detectado)
            </span>
          )}
        </div>
      )}

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.7fr 1fr', alignItems: 'start' }}>
        {/* Bandeja */}
        <div style={PANEL}>
          <div className="flex justify-between items-center px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Bandeja de entrada</h2>
            <span className="font-mono text-[11px] px-2.5 py-1 rounded-full text-[#7288AE]"
              style={{ background: 'rgba(114,136,174,0.10)' }}>
              {inbox.length} licitaciones
            </span>
          </div>

          {inbox.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <div className="text-[32px] mb-3">📭</div>
              <div className="text-[14px] font-medium text-[#EAE0CF] mb-1">Bandeja vacía</div>
              <div className="text-[12.5px] text-[#7288AE]">
                Pulsa «Sincronizar PLACSP» para buscar licitaciones nuevas según tus filtros CPV activos.
              </div>
            </div>
          ) : inbox.map((item) => (
            <div key={item.client_contract_id} className="px-4 py-4"
              style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <span className="text-[13.5px] font-semibold text-[#EAE0CF]">{item.organismo}</span>
                    {item.matched_cpvs.length > 0 && (
                      <span className="text-[10px] text-[#7288AE] px-2 py-0.5 rounded-full font-mono"
                        style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                        {item.matched_cpvs[0]}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#8e98c9] leading-snug mb-2">{item.titulo}</div>
                  {item.objeto && item.objeto !== item.titulo && (
                    <div className="text-[11.5px] text-[#7288AE] leading-snug mb-2">{item.objeto}</div>
                  )}
                  <div className="flex gap-4 font-mono text-[11px] text-[#7288AE] flex-wrap">
                    <span>{item.canonical_id}</span>
                    <span className="text-[#EAE0CF]">{fmtEur(item.presupuesto)}</span>
                    {item.plazo && <span>Plazo {fmtDate(item.plazo)}</span>}
                    {item.fecha_publicacion && (
                      <span className="text-[#7288AE]">Pub. {fmtDate(item.fecha_publicacion)}</span>
                    )}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5 flex-shrink-0">
                  <button onClick={() => setModal({ item })}
                    className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-[#34D399]"
                    style={{ background: 'rgba(52,211,153,0.14)' }}>
                    Presentarse
                  </button>
                  <button onClick={() => descartar(item)}
                    className="px-4 py-1.5 rounded-lg text-[12px] text-[#8e98c9]"
                    style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                    Descartar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filtros CPV */}
        <div style={PANEL}>
          <div className="flex justify-between items-center px-4 py-3.5"
            style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Filtros CPV</h2>
            <button onClick={crearFiltro} disabled={creating}
              className="text-[11.5px] text-[#7288AE] hover:text-[#EAE0CF] px-2 py-1 rounded-lg transition-opacity"
              style={{ border: '1px solid rgba(114,136,174,0.20)', opacity: creating ? 0.5 : 1 }}>
              {creating ? 'Creando…' : '+ Nuevo filtro'}
            </button>
          </div>

          {filters.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-[#7288AE]">
              Sin filtros CPV. Crea uno para detectar licitaciones automáticamente.
            </div>
          ) : (
            <div className="p-3.5 flex flex-col gap-3">
              {filters.map((f) => (
                <div key={f.id} className="rounded-xl p-3.5"
                  style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                  <div className="flex justify-between items-center mb-2.5">
                    <div>
                      <div className="text-[13px] font-semibold text-[#EAE0CF]">{f.nombre}</div>
                      {f.cliente && <div className="text-[11px] text-[#7288AE] mt-0.5">{f.cliente}</div>}
                    </div>
                    <button onClick={() => toggleFilter(f)}
                      className="flex items-center gap-1.5 text-[11px]"
                      style={{ color: f.activo ? '#34D399' : '#8e98c9' }}>
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.activo ? '#34D399' : '#8e98c9', display: 'inline-block' }} />
                      {f.activo ? 'Activo' : 'Pausado'}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2.5">
                    {f.cpvs.map((cpv) => (
                      <span key={cpv} className="inline-flex items-center gap-1.5 font-mono text-[11px] rounded-full px-2.5 py-1"
                        style={{ background: 'rgba(114,136,174,0.14)' }}>
                        {cpv}
                        <button onClick={() => removeCpv(f.id, cpv)}
                          className="text-[#7288AE] hover:text-[#F87171] leading-none">×</button>
                      </span>
                    ))}
                    {f.cpvs.length === 0 && (
                      <span className="text-[11px] text-[#7288AE] italic">Sin CPV — añade uno</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <input
                      value={inputs[f.id] ?? ''}
                      onChange={(e) => setInputs((p) => ({ ...p, [f.id]: e.target.value }))}
                      onKeyDown={(e) => e.key === 'Enter' && addCpv(f.id)}
                      placeholder="Código CPV (ej. 39830000-9)"
                      maxLength={20}
                      className="flex-1 rounded-lg px-2.5 py-1.5 font-mono text-[11.5px] text-[#EAE0CF] outline-none"
                      style={{ background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)' }}
                    />
                    <button onClick={() => addCpv(f.id)}
                      className="px-3 rounded-lg text-[13px] text-[#EAE0CF]"
                      style={{ background: '#1a2160', border: '1px solid rgba(114,136,174,0.30)' }}>
                      +
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
