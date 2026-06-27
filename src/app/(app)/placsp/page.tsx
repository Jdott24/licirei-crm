'use client'
import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, fmtDate, fmtEur } from '@/lib/utils'
import type { InboxItem, CpvFilter } from '@/lib/types'

const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }

export default function PlacspPage() {
  const supabase = createClient()
  const [inbox,   setInbox]   = useState<InboxItem[]>([])
  const [filters, setFilters] = useState<CpvFilter[]>([])
  const [inputs,  setInputs]  = useState<Record<string, string>>({})
  const [lastCheck] = useState(() => {
    const now = new Date()
    return `${now.toLocaleDateString('es-ES', { day:'2-digit', month:'short', year:'numeric' })} · ${now.toLocaleTimeString('es-ES', { hour:'2-digit', minute:'2-digit' })}`
  })

  const fetchAll = useCallback(async () => {
    const [i, f] = await Promise.all([
      supabase.from('inbox').select('*').order('created_at', { ascending: false }),
      supabase.from('cpv_filters').select('*').order('nombre'),
    ])
    if (i.data) setInbox(i.data)
    if (f.data) setFilters(f.data)
  }, [])

  useEffect(() => { fetchAll() }, [fetchAll])

  // Inbox actions
  async function decide(item: InboxItem, action: 'go' | 'no') {
    if (action === 'go') {
      // Move to pipeline
      await supabase.from('pipeline').insert({
        expediente: item.expediente,
        org: item.org,
        obj: item.obj,
        presupuesto: item.presupuesto,
        plazo: item.plazo,
        responsable: 'Sin asignar',
        docs_done: 0, docs_total: 6,
        cpv: item.cpv,
        stage: 'detectada',
      })
      await supabase.from('activity').insert({
        quien: 'Sistema',
        txt: `${item.org} añadida al pipeline`,
        tone: 'ok',
      })
    }
    await supabase.from('inbox').delete().eq('id', item.id)
    fetchAll()
  }

  // CPV filter management
  async function toggleFilter(f: CpvFilter) {
    await supabase.from('cpv_filters').update({ activo: !f.activo }).eq('id', f.id)
    fetchAll()
  }

  async function addCpv(fid: string) {
    const raw = (inputs[fid] || '').trim()
    if (!raw) return
    const fil = filters.find(f => f.id === fid)
    if (!fil || fil.cpvs.includes(raw)) return
    await supabase.from('cpv_filters').update({ cpvs: [...fil.cpvs, raw] }).eq('id', fid)
    setInputs(p => ({ ...p, [fid]: '' }))
    fetchAll()
  }

  async function removeCpv(fid: string, cpv: string) {
    const fil = filters.find(f => f.id === fid)
    if (!fil) return
    await supabase.from('cpv_filters').update({ cpvs: fil.cpvs.filter(c => c !== cpv) }).eq('id', fid)
    fetchAll()
  }

  return (
    <div className="p-7 pb-10">
      <div className="flex justify-between items-end mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Explorar PLACSP</h1>
          <p className="text-[13px] text-[#7288AE] mt-1">Licitaciones nuevas detectadas según tus filtros de CPV</p>
        </div>
        <div className="flex items-center gap-2 text-[12px] text-[#8e98c9] px-3 py-1.5 rounded-lg"
          style={{ border: '1px solid rgba(114,136,174,0.16)', background: '#141a4d' }}>
          <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#34D399', display: 'inline-block' }} />
          Última comprobación:
          <span className="font-mono text-[#EAE0CF]">{lastCheck}</span>
        </div>
      </div>

      <div className="grid gap-4" style={{ gridTemplateColumns: '1.7fr 1fr', alignItems: 'start' }}>
        {/* Inbox */}
        <div style={PANEL}>
          <div className="flex justify-between items-center px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Bandeja de entrada</h2>
            <span className="font-mono text-[11px] text-[#7288AE]">nuevas hoy</span>
          </div>
          <div>
            {inbox.map(item => (
              <div key={item.id} className="px-4 py-4" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2.5 mb-1">
                      <span className="text-[13.5px] font-semibold text-[#EAE0CF]">{item.org}</span>
                      <span className="text-[10px] text-[#7288AE] px-2 py-0.5 rounded-full"
                        style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                        {item.filtro}
                      </span>
                    </div>
                    <div className="text-[12px] text-[#8e98c9] leading-snug mb-2">{item.obj}</div>
                    <div className="flex gap-4 font-mono text-[11px] text-[#7288AE] flex-wrap">
                      <span>{item.expediente}</span>
                      <span className="text-[#EAE0CF]">{fmtEur(item.presupuesto)}</span>
                      <span>CPV {item.cpv}</span>
                      <span>Plazo {fmtDate(item.plazo)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-1.5 flex-shrink-0">
                    <button onClick={() => decide(item, 'go')}
                      className="px-4 py-1.5 rounded-lg text-[12px] font-semibold text-[#34D399]"
                      style={{ background: 'rgba(52,211,153,0.14)' }}>
                      Presentarse
                    </button>
                    <button onClick={() => decide(item, 'no')}
                      className="px-4 py-1.5 rounded-lg text-[12px] text-[#8e98c9]"
                      style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                      Descartar
                    </button>
                  </div>
                </div>
              </div>
            ))}
            {inbox.length === 0 && (
              <div className="px-4 py-8 text-center text-[13px] text-[#7288AE]">
                Bandeja vacía · no hay nuevas licitaciones
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div style={PANEL}>
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Filtros guardados</h2>
          </div>
          <div className="p-3.5 flex flex-col gap-3">
            {filters.map(f => (
              <div key={f.id} className="rounded-xl p-3.5" style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                <div className="flex justify-between items-center mb-2.5">
                  <div>
                    <div className="text-[13px] font-semibold text-[#EAE0CF]">{f.nombre}</div>
                    <div className="text-[11px] text-[#7288AE] mt-0.5">{f.cliente}</div>
                  </div>
                  <button onClick={() => toggleFilter(f)}
                    className="flex items-center gap-1.5 text-[11px]"
                    style={{ color: f.activo ? '#34D399' : '#8e98c9' }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: f.activo ? '#34D399' : '#8e98c9', display: 'inline-block' }} />
                    {f.activo ? 'Activo' : 'Pausado'}
                  </button>
                </div>

                {/* CPV chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {f.cpvs.map(cpv => (
                    <span key={cpv} className="inline-flex items-center gap-1.5 font-mono text-[11px] rounded-full px-2.5 py-1"
                      style={{ background: 'rgba(114,136,174,0.14)' }}>
                      {cpv}
                      <button onClick={() => removeCpv(f.id, cpv)}
                        className="text-[#7288AE] hover:text-[#F87171] leading-none">
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add CPV */}
                <div className="flex gap-2">
                  <input
                    value={inputs[f.id] || ''}
                    onChange={e => setInputs(p => ({ ...p, [f.id]: e.target.value }))}
                    onKeyDown={e => e.key === 'Enter' && addCpv(f.id)}
                    placeholder="Añadir CPV…"
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
        </div>
      </div>
    </div>
  )
}
