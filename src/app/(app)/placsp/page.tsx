'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, fmtEur } from '@/lib/utils'
import type { InboxItem, CpvFilter, PipelineStage } from '@/lib/types'
import PipelineStageModal from '@/components/PipelineStageModal'

const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }

type ModalState = { item: InboxItem } | null

export default function PlacspPage() {
  const supabase = createClient()
  const [inbox,      setInbox]      = useState<InboxItem[]>([])
  const [filters,    setFilters]    = useState<CpvFilter[]>([])
  const [inputs,     setInputs]     = useState<Record<string, string>>({})
  const [modal,      setModal]      = useState<ModalState>(null)
  const [syncing,    setSyncing]    = useState(false)
  const [syncMsg,    setSyncMsg]    = useState('')
  const [error,      setError]      = useState('')
  const [lastCheck,  setLastCheck]  = useState<string | null>(null)

  const fetchAll = useCallback(async () => {
    const [i, f] = await Promise.all([
      supabase.from('inbox').select('*').order('created_at', { ascending: false }),
      supabase.from('cpv_filters').select('*').order('nombre'),
    ])
    if (i.error) { setError(i.error.message); return }
    if (f.error) { setError(f.error.message); return }
    setInbox(i.data ?? [])
    setFilters(f.data ?? [])
  }, [supabase])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Sincronizar con PLACSP
  async function syncPlacsp() {
    setSyncing(true); setSyncMsg(''); setError('')
    try {
      const res = await fetch('/api/placsp/sync', { method: 'POST' })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error ?? 'Error desconocido')
      setSyncMsg(`${json.nuevas} licitaciones nuevas encontradas`)
      setLastCheck(new Date().toLocaleString('es-ES', { day:'2-digit', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' }))
      await fetchAll()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al sincronizar')
    } finally {
      setSyncing(false)
    }
  }

  // Añadir al pipeline con la etapa elegida
  async function confirmarPresentarse(stage: PipelineStage, responsable: string) {
    if (!modal) return
    const item = modal.item
    setModal(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada, recarga la página'); return }

    const { error: pErr } = await supabase.from('pipeline').insert({
      expediente:   item.expediente,
      org:          item.org,
      obj:          item.obj,
      presupuesto:  item.presupuesto,
      plazo:        item.plazo,
      responsable,
      docs_done:    0,
      docs_total:   6,
      cpv:          item.cpv,
      stage,
      user_id:      user.id,
    })
    if (pErr) { setError(pErr.message); return }

    await supabase.from('activity').insert({
      quien:   responsable,
      txt:     `${item.org} añadida al pipeline — etapa: ${stage}`,
      tone:    'ok',
      user_id: user.id,
    })
    await supabase.from('inbox').delete().eq('id', item.id)
    await fetchAll()
  }

  async function descartar(item: InboxItem) {
    const { error: dErr } = await supabase.from('inbox').delete().eq('id', item.id)
    if (dErr) { setError(dErr.message); return }
    await fetchAll()
  }

  // Filtros CPV
  async function toggleFilter(f: CpvFilter) {
    await supabase.from('cpv_filters').update({ activo: !f.activo }).eq('id', f.id)
    fetchAll()
  }

  async function addCpv(fid: string) {
    const raw = (inputs[fid] || '').trim().toUpperCase()
    if (!raw) return
    const fil = filters.find(f => f.id === fid)
    if (!fil || fil.cpvs.includes(raw)) return
    const { error: cErr } = await supabase.from('cpv_filters').update({ cpvs: [...fil.cpvs, raw] }).eq('id', fid)
    if (cErr) { setError(cErr.message); return }
    setInputs(p => ({ ...p, [fid]: '' }))
    fetchAll()
  }

  async function removeCpv(fid: string, cpv: string) {
    const fil = filters.find(f => f.id === fid)
    if (!fil) return
    await supabase.from('cpv_filters').update({ cpvs: fil.cpvs.filter(c => c !== cpv) }).eq('id', fid)
    fetchAll()
  }

  async function crearFiltro() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { error: fErr } = await supabase.from('cpv_filters').insert({
      nombre:  'Nuevo filtro',
      cliente: '',
      cpvs:    [],
      activo:  true,
      user_id: user.id,
    })
    if (fErr) { setError(fErr.message); return }
    fetchAll()
  }

  return (
    <div className="p-7 pb-10">
      {modal && (
        <PipelineStageModal
          item={modal.item}
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
      {syncMsg && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[12.5px] text-[#34D399]"
          style={{ background: 'rgba(52,211,153,0.10)', border: '1px solid rgba(52,211,153,0.20)' }}>
          {syncMsg}
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
          ) : inbox.map(item => (
            <div key={item.id} className="px-4 py-4"
              style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
              <div className="flex justify-between items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2.5 mb-1 flex-wrap">
                    <span className="text-[13.5px] font-semibold text-[#EAE0CF]">{item.org}</span>
                    {item.filtro && (
                      <span className="text-[10px] text-[#7288AE] px-2 py-0.5 rounded-full"
                        style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                        {item.filtro}
                      </span>
                    )}
                  </div>
                  <div className="text-[12px] text-[#8e98c9] leading-snug mb-2">{item.obj}</div>
                  <div className="flex gap-4 font-mono text-[11px] text-[#7288AE] flex-wrap">
                    {item.expediente && <span>{item.expediente}</span>}
                    <span className="text-[#EAE0CF]">{fmtEur(item.presupuesto)}</span>
                    {item.cpv && <span>CPV {item.cpv}</span>}
                    {item.plazo && <span>Plazo {fmtDate(item.plazo)}</span>}
                    {item.publicado && <span className="text-[#7288AE]">Pub. {fmtDate(item.publicado)}</span>}
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
            <button onClick={crearFiltro}
              className="text-[11.5px] text-[#7288AE] hover:text-[#EAE0CF] px-2 py-1 rounded-lg"
              style={{ border: '1px solid rgba(114,136,174,0.20)' }}>
              + Nuevo filtro
            </button>
          </div>

          {filters.length === 0 ? (
            <div className="px-4 py-8 text-center text-[12.5px] text-[#7288AE]">
              Sin filtros CPV. Crea uno para detectar licitaciones automáticamente.
            </div>
          ) : (
            <div className="p-3.5 flex flex-col gap-3">
              {filters.map(f => (
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
                    {f.cpvs.map(cpv => (
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
                      value={inputs[f.id] || ''}
                      onChange={e => setInputs(p => ({ ...p, [f.id]: e.target.value }))}
                      onKeyDown={e => e.key === 'Enter' && addCpv(f.id)}
                      placeholder="Código CPV (ej. 39830000-9)"
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
