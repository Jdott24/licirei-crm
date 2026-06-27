'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, fmtDate, fmtEur, statusOf, dotColor, statusLabel } from '@/lib/utils'
import type { Contract } from '@/lib/types'
import AddContractModal from '@/components/AddContractModal'

const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }
const TH    = { padding: '11px 18px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#7288AE', fontWeight: 500 }
const TH_R  = { ...TH, textAlign: 'right' as const }

type Filter = 'todos' | 'crit' | 'aten' | 'plazo'

export default function CarteraPage() {
  const supabase = createClient()
  const [rows,   setRows]   = useState<Contract[]>([])
  const [query,  setQuery]  = useState('')
  const [status, setStatus] = useState<Filter>('todos')
  const [modal,  setModal]  = useState(false)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('contracts').select('*').order('fecha_vence')
    if (data) setRows(data)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  async function del(id: string) {
    if (!confirm('¿Eliminar este contrato?')) return
    await supabase.from('contracts').delete().eq('id', id)
    fetch()
  }

  const filtered = rows.filter(c => {
    const dias = daysUntil(c.fecha_vence)
    const st   = statusOf(dias)
    const okQ  = !query || [c.org, c.obj, c.expediente].join(' ').toLowerCase().includes(query.toLowerCase())
    const okS  = status === 'todos'
      || (status === 'crit'  && (st === 'danger' || st === 'venc'))
      || (status === 'aten'  && st === 'warn')
      || (status === 'plazo' && st === 'ok')
    return okQ && okS
  })

  const FILTERS: { k: Filter; l: string }[] = [
    { k: 'todos', l: 'Todos' }, { k: 'crit', l: 'Crítico' }, { k: 'aten', l: 'Atención' }, { k: 'plazo', l: 'En plazo' },
  ]

  return (
    <div className="p-7 pb-10">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Cartera activa</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Contratos adjudicados y en ejecución · semáforo de vencimiento</p>
      </div>

      {/* Toolbar */}
      <div className="flex justify-between items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 max-w-sm rounded-lg px-3 py-2"
          style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.30)' }}>
          <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="#8e98c9" strokeWidth="1.6">
            <circle cx="7" cy="7" r="5"/><path d="M11 11l3 3"/>
          </svg>
          <input
            value={query} onChange={e => setQuery(e.target.value)}
            placeholder="Buscar por organismo, objeto o expediente…"
            className="flex-1 bg-transparent text-[#EAE0CF] text-[13px] outline-none"
          />
        </div>
        <div className="flex items-center gap-2.5">
          <div className="flex gap-1 p-1 rounded-lg" style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)' }}>
            {FILTERS.map(f => (
              <button key={f.k} onClick={() => setStatus(f.k)}
                className="rounded-md px-3.5 py-1.5 text-[12.5px] transition-colors"
                style={{
                  background: status === f.k ? 'rgba(114,136,174,0.22)' : 'transparent',
                  color: status === f.k ? '#EAE0CF' : '#8e98c9',
                }}>
                {f.l}
              </button>
            ))}
          </div>
          <button onClick={() => setModal(true)}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13px] font-semibold text-[#EAE0CF]"
            style={{ background: '#4B5694' }}>
            <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M8 3v10M3 8h10"/>
            </svg>
            Añadir contrato
          </button>
        </div>
      </div>

      <div style={PANEL}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'rgba(114,136,174,0.05)' }}>
              <th style={TH}   className="text-left">Expediente / Organismo</th>
              <th style={TH}   className="text-left">CPV</th>
              <th style={TH_R}>Importe</th>
              <th style={TH_R}>Vencimiento</th>
              <th style={{ ...TH_R, paddingRight: 18 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => {
              const dias = daysUntil(c.fecha_vence)
              const st   = statusOf(dias)
              const col  = dotColor(st)
              const lbl  = statusLabel(st)
              const crit = (st === 'danger' || st === 'venc')
              return (
                <tr key={c.id} style={{ borderTop: '1px solid rgba(114,136,174,0.16)', cursor: 'pointer' }}>
                  <td className="px-4 py-3" style={{ maxWidth: 380 }}>
                    <Link href={`/cartera/${c.id}`} className="block">
                      <div className="text-[13px] font-medium text-[#EAE0CF]">{c.org}</div>
                      <div className="text-[11.5px] text-[#8e98c9] mt-0.5 truncate">{c.obj}</div>
                      <div className="font-mono text-[10.5px] text-[#7288AE] mt-0.5">{c.expediente}</div>
                    </Link>
                  </td>
                  <td className="px-3 py-3 font-mono text-[12px] text-[#EAE0CF]">{c.cpv}</td>
                  <td className="px-3 py-3 text-right font-mono text-[13px] text-[#EAE0CF]">{fmtEur(c.importe)}</td>
                  <td className="px-3 py-3 text-right font-mono text-[12px] text-[#8e98c9]">{fmtDate(c.fecha_vence)}</td>
                  <td className="pr-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-[#EAE0CF]">
                        <span className={crit ? 'animate-lcpulse' : ''}
                          style={{ width: 8, height: 8, borderRadius: '50%', background: col, display: 'inline-block' }} />
                        {dias < 0 ? 'vencido' : `${dias} d`}
                      </span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full"
                        style={{ border: '1px solid rgba(114,136,174,0.30)', color: '#8e98c9' }}>
                        {lbl}
                      </span>
                      <button onClick={() => del(c.id)} title="Eliminar"
                        className="text-[#7288AE] hover:text-[#F87171] ml-1">
                        <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                          <path d="M4 4l8 8M12 4l-8 8"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {filtered.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-[13px] text-[#7288AE]">Sin resultados</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {modal && <AddContractModal onClose={() => setModal(false)} onSaved={fetch} />}
    </div>
  )
}
