'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, fmtDate, fmtEur, statusOf, dotColor, statusLabel } from '@/lib/utils'
import type { Contract, ContractEstado } from '@/lib/types'
import { CONTRACT_ESTADO_LABELS, CONTRACT_ESTADO_COLORS } from '@/lib/types'
import AddContractModal from '@/components/AddContractModal'

const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }
const TH    = { padding: '11px 18px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#7288AE', fontWeight: 500 }
const TH_R  = { ...TH, textAlign: 'right' as const }

type Filter = 'todos' | 'crit' | 'aten' | 'plazo'
const ESTADOS: ContractEstado[] = ['activo', 'prorrogado', 'finalizado', 'rescindido']

function EstadoPicker({ contractId, current, onChanged }: {
  contractId: string
  current: ContractEstado
  onChanged: () => void
}) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  async function cambiar(e: ContractEstado) {
    setSaving(true)
    await supabase.from('contracts').update({ estado: e }).eq('id', contractId)
    setSaving(false)
    setOpen(false)
    onChanged()
  }

  return (
    <div className="relative">
      <button
        onClick={e => { e.stopPropagation(); e.preventDefault(); setOpen(v => !v) }}
        disabled={saving}
        className="inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-full transition-opacity"
        style={{ border: '1px solid rgba(114,136,174,0.30)', color: CONTRACT_ESTADO_COLORS[current] }}>
        <span style={{ width: 6, height: 6, borderRadius: '50%', background: CONTRACT_ESTADO_COLORS[current], display: 'inline-block' }} />
        {CONTRACT_ESTADO_LABELS[current]}
        <svg width="9" height="9" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M2 4l3 3 3-3"/>
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 top-7 z-20 rounded-lg py-1 min-w-[140px]"
          style={{ background: '#1a2160', border: '1px solid rgba(114,136,174,0.40)', boxShadow: '0 8px 24px rgba(0,0,0,0.4)' }}>
          {ESTADOS.map(e => (
            <button key={e} onClick={() => cambiar(e)}
              className="w-full text-left px-3 py-2 text-[12px] flex items-center gap-2 hover:bg-[rgba(114,136,174,0.12)]"
              style={{ color: e === current ? CONTRACT_ESTADO_COLORS[e] : '#8e98c9', fontWeight: e === current ? 600 : 400 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: CONTRACT_ESTADO_COLORS[e], display: 'inline-block', flexShrink: 0 }} />
              {CONTRACT_ESTADO_LABELS[e]}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default function CarteraPage() {
  const supabase = createClient()
  const [rows,   setRows]   = useState<Contract[]>([])
  const [query,  setQuery]  = useState('')
  const [filter, setFilter] = useState<Filter>('todos')
  const [modal,  setModal]  = useState(false)
  const [error,  setError]  = useState('')

  const fetchRows = useCallback(async () => {
    const { data, error: err } = await supabase
      .from('contracts')
      .select('*')
      .order('fecha_vence')
    if (err) { setError(err.message); return }
    setRows(data ?? [])
  }, [supabase])

  useEffect(() => { fetchRows() }, [fetchRows])

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este contrato? Esta acción no se puede deshacer.')) return
    const { error: err } = await supabase.from('contracts').delete().eq('id', id)
    if (err) { setError(err.message); return }
    fetchRows()
  }

  const filtered = rows.filter(c => {
    const dias = daysUntil(c.fecha_vence)
    const st   = statusOf(dias)
    const okQ  = !query || [c.org, c.obj, c.expediente].join(' ').toLowerCase().includes(query.toLowerCase())
    const okF  = filter === 'todos'
      || (filter === 'crit'  && (st === 'danger' || st === 'venc'))
      || (filter === 'aten'  && st === 'warn')
      || (filter === 'plazo' && st === 'ok')
    return okQ && okF
  })

  const FILTERS: { k: Filter; l: string }[] = [
    { k: 'todos', l: 'Todos' },
    { k: 'crit',  l: 'Crítico' },
    { k: 'aten',  l: 'Atención' },
    { k: 'plazo', l: 'En plazo' },
  ]

  return (
    <div className="p-7 pb-10">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Cartera activa</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Contratos adjudicados y en ejecución · semáforo de vencimiento</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[12.5px] text-[#F87171]"
          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
          {error}
        </div>
      )}

      {/* Barra de herramientas */}
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
          <div className="flex gap-1 p-1 rounded-lg"
            style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)' }}>
            {FILTERS.map(f => (
              <button key={f.k} onClick={() => setFilter(f.k)}
                className="rounded-md px-3.5 py-1.5 text-[12.5px] transition-colors"
                style={{
                  background: filter === f.k ? 'rgba(114,136,174,0.22)' : 'transparent',
                  color:      filter === f.k ? '#EAE0CF' : '#8e98c9',
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
        {rows.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="text-[36px] mb-3">📋</div>
            <div className="text-[15px] font-semibold text-[#EAE0CF] mb-2">Sin contratos todavía</div>
            <div className="text-[13px] text-[#7288AE] mb-5 max-w-xs mx-auto">
              Añade tu primer contrato adjudicado para hacer seguimiento de vencimientos y alertas.
            </div>
            <button onClick={() => setModal(true)}
              className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-[#EAE0CF]"
              style={{ background: '#4B5694' }}>
              Añadir primer contrato
            </button>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'rgba(114,136,174,0.05)' }}>
                <th style={TH}  className="text-left">Expediente / Organismo</th>
                <th style={TH}  className="text-left">CPV</th>
                <th style={TH_R}>Importe</th>
                <th style={TH_R}>Vencimiento</th>
                <th style={TH_R}>Estado contrato</th>
                <th style={{ ...TH_R, paddingRight: 18 }}>Días</th>
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
                  <tr key={c.id} style={{ borderTop: '1px solid rgba(114,136,174,0.16)' }}>
                    <td className="px-4 py-3" style={{ maxWidth: 360 }}>
                      <Link href={`/cartera/${c.id}`} className="block">
                        <div className="text-[13px] font-medium text-[#EAE0CF]">{c.org}</div>
                        <div className="text-[11.5px] text-[#8e98c9] mt-0.5 truncate">{c.obj}</div>
                        <div className="font-mono text-[10.5px] text-[#7288AE] mt-0.5">{c.expediente}</div>
                      </Link>
                    </td>
                    <td className="px-3 py-3 font-mono text-[12px] text-[#8e98c9]">{c.cpv || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-[13px] text-[#EAE0CF]">{fmtEur(c.importe)}</td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-[#8e98c9]">{fmtDate(c.fecha_vence)}</td>
                    <td className="px-3 py-3 text-right">
                      <EstadoPicker
                        contractId={c.id}
                        current={c.estado ?? 'activo'}
                        onChanged={fetchRows}
                      />
                    </td>
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
                        <button onClick={() => eliminar(c.id)} title="Eliminar contrato"
                          className="text-[#7288AE] hover:text-[#F87171] ml-1 flex-shrink-0">
                          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 4l8 8M12 4l-8 8"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtered.length === 0 && rows.length > 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-6 text-center text-[13px] text-[#7288AE]">
                    Sin resultados para la búsqueda actual
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {modal && <AddContractModal onClose={() => setModal(false)} onSaved={fetchRows} />}
    </div>
  )
}
