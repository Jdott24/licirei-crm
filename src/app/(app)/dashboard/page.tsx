'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, fmtDate, fmtEur, fmtEurM, statusOf, dotColor, statusLabel } from '@/lib/utils'
import type { Contract, PipelineItem, SolvenciaDoc, ActivityItem } from '@/lib/types'

const PANEL  = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12 }
const TH     = { padding: '9px 18px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#7288AE', fontWeight: 500 }
const TH_R   = { ...TH, textAlign: 'right' as const }

export default function DashboardPage() {
  const supabase = createClient()
  const [contracts, setContracts] = useState<Contract[]>([])
  const [pipeline,  setPipeline]  = useState<PipelineItem[]>([])
  const [sol,       setSol]       = useState<SolvenciaDoc[]>([])
  const [activity,  setActivity]  = useState<ActivityItem[]>([])

  const fetchAll = useCallback(async () => {
    const [c, p, s, a] = await Promise.all([
      supabase.from('contracts').select('*').order('fecha_vence'),
      supabase.from('pipeline').select('*').order('plazo'),
      supabase.from('solvencia').select('*').order('fecha_cad'),
      supabase.from('activity').select('*').order('created_at', { ascending: false }).limit(5),
    ])
    if (c.data) setContracts(c.data)
    if (p.data) setPipeline(p.data)
    if (s.data) setSol(s.data)
    if (a.data) setActivity(a.data)
  }, [])

  useEffect(() => {
    fetchAll()
    const ch = supabase.channel('dashboard-rt')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'contracts' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'pipeline'  }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'solvencia' }, fetchAll)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'activity'  }, fetchAll)
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [fetchAll])

  // KPIs
  const totalValor    = contracts.reduce((s, c) => s + c.importe, 0)
  const expiringSoon  = contracts.filter(c => { const d = daysUntil(c.fecha_vence); return d >= 0 && d < 90 }).length
  const activosLic    = pipeline.filter(c => c.stage !== 'adjudicada').length
  const kpis = [
    { label: 'Contratos activos',     value: String(contracts.length),            sub: '+2 este trimestre' },
    { label: 'Valor de cartera',       value: fmtEurM(totalValor),                sub: `${contracts.length} contratos vigentes` },
    { label: 'Próximos a vencer',      value: String(expiringSoon),               sub: '< 90 días' },
    { label: 'Licitaciones activas',   value: String(activosLic),                 sub: 'en pipeline' },
    { label: 'Tasa de adjudicación',   value: '41 %',                             sub: 'histórico 24 meses' },
  ]

  // Soon contracts
  const dashSoon = [...contracts]
    .map(c => ({ ...c, dias: daysUntil(c.fecha_vence) }))
    .sort((a, b) => a.dias - b.dias).slice(0, 5)

  // Priority pipeline
  const dashOpps = pipeline
    .filter(c => c.stage !== 'adjudicada')
    .map(c => ({ ...c, dias: c.plazo ? daysUntil(c.plazo) : 999 }))
    .sort((a, b) => a.dias - b.dias).slice(0, 4)

  // Alerts
  const alerts: Array<{ tone: string; title: string; txt: string; meta: string }> = []
  dashSoon.filter(c => c.dias < 30).forEach(c =>
    alerts.push({ tone: '#F87171', title: c.org, txt: `Contrato vence en ${c.dias} días`, meta: c.expediente }))
  sol.forEach(d => {
    const dias = daysUntil(d.fecha_cad)
    if (dias < 30)
      alerts.push({ tone: dias < 0 ? '#F87171' : '#FBBF24', title: d.nombre.split('–')[0].trim(), txt: dias < 0 ? 'Documento caducado' : `Caduca en ${dias} días`, meta: d.emisor })
  })

  const todayStr = fmtDate(new Date().toISOString().slice(0, 10))

  return (
    <div className="p-7 pb-10">
      {/* Header */}
      <div className="flex justify-between items-end mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Dashboard</h1>
          <p className="text-[13px] text-[#7288AE] mt-1">Visión general de la cartera y el pipeline</p>
        </div>
        <span className="font-mono text-[11.5px] text-[#7288AE]">{todayStr}</span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-5 gap-3.5 mb-5">
        {kpis.map((k, i) => (
          <div key={i} style={PANEL} className="p-4">
            <div className="text-[10.5px] uppercase tracking-widest text-[#7288AE] mb-2.5">{k.label}</div>
            <div className="font-mono text-[26px] font-semibold tracking-tight leading-none text-[#EAE0CF]">{k.value}</div>
            <div className="text-[11.5px] text-[#8e98c9] mt-2">{k.sub}</div>
          </div>
        ))}
      </div>

      {/* Row 2 */}
      <div className="grid gap-4 mb-4" style={{ gridTemplateColumns: '1.45fr 1fr' }}>
        {/* Contracts expiring */}
        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <div className="flex justify-between items-center px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Contratos próximos a vencer</h2>
            <Link href="/cartera" className="text-[12px] text-[#7288AE] hover:text-[#EAE0CF]">Ver cartera →</Link>
          </div>
          <table className="w-full border-collapse">
            <thead>
              <tr>
                <th style={TH}   className="text-left">Organismo</th>
                <th style={TH_R}>Importe</th>
                <th style={TH_R}>Vence</th>
                <th style={{ ...TH_R, paddingRight: 18 }}>Restan</th>
              </tr>
            </thead>
            <tbody>
              {dashSoon.map(c => {
                const st = statusOf(c.dias)
                const col = dotColor(st)
                const crit = (st === 'danger' || st === 'venc')
                return (
                  <tr key={c.id} className="cursor-pointer" style={{ borderTop: '1px solid rgba(114,136,174,0.16)' }}>
                    <td className="px-4 py-2.5">
                      <div className="text-[13px] font-medium text-[#EAE0CF]">{c.org}</div>
                      <div className="font-mono text-[10.5px] text-[#7288AE] mt-0.5">{c.expediente}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12.5px] text-[#EAE0CF]">{fmtEur(c.importe)}</td>
                    <td className="px-3 py-2.5 text-right font-mono text-[12px] text-[#8e98c9]">{fmtDate(c.fecha_vence)}</td>
                    <td className="pr-4 py-2.5 text-right">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[12.5px] font-semibold text-[#EAE0CF]">
                        <span className={crit ? 'animate-lcpulse' : ''} style={{ width: 8, height: 8, borderRadius: '50%', background: col, display: 'inline-block' }} />
                        {c.dias < 0 ? 'vencido' : `${c.dias} d`}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Priority opps */}
        <div style={{ ...PANEL, overflow: 'hidden' }} className="flex flex-col">
          <div className="flex justify-between items-center px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Oportunidades prioritarias</h2>
            <Link href="/pipeline" className="text-[12px] text-[#7288AE] hover:text-[#EAE0CF]">Pipeline →</Link>
          </div>
          <div className="p-2 flex flex-col gap-1.5">
            {dashOpps.map(o => {
              const st  = statusOf(o.dias)
              const col = dotColor(st)
              return (
                <Link key={o.id} href={`/pipeline/${o.id}`}
                  className="cursor-pointer p-3 rounded-lg"
                  style={{ border: '1px solid rgba(114,136,174,0.16)' }}>
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-[12.5px] font-medium text-[#EAE0CF] truncate">{o.org}</span>
                    <span className="inline-flex items-center gap-1.5 font-mono text-[11.5px] flex-shrink-0 text-[#EAE0CF]">
                      <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, display: 'inline-block' }} />
                      {o.dias < 0 ? 'cerrado' : `${o.dias} d`}
                    </span>
                  </div>
                  <div className="flex justify-between mt-1.5 font-mono text-[11px] text-[#7288AE]">
                    <span>{fmtEur(o.presupuesto)}</span>
                    <span>doc {o.docs_done}/{o.docs_total}</span>
                  </div>
                </Link>
              )
            })}
            {dashOpps.length === 0 && (
              <p className="text-[12px] text-[#7288AE] p-3">Sin oportunidades activas</p>
            )}
          </div>
        </div>
      </div>

      {/* Row 3 */}
      <div className="grid gap-4" style={{ gridTemplateColumns: '1fr 1.45fr' }}>
        {/* Alerts */}
        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Alertas activas</h2>
          </div>
          <div className="p-2 flex flex-col gap-1">
            {alerts.length === 0 && (
              <p className="px-3 py-2.5 text-[12px] text-[#7288AE]">Sin alertas activas</p>
            )}
            {alerts.map((a, i) => (
              <div key={i} className="flex gap-3 px-3 py-2.5 rounded-lg">
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.tone, marginTop: 5, flexShrink: 0, display: 'inline-block' }} />
                <div className="leading-snug overflow-hidden">
                  <div className="text-[12.5px] font-medium text-[#EAE0CF] truncate">{a.title}</div>
                  <div className="text-[11.5px] text-[#8e98c9]">{a.txt}</div>
                  <div className="font-mono text-[10px] text-[#7288AE] mt-0.5">{a.meta}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Activity */}
        <div style={{ ...PANEL, overflow: 'hidden' }}>
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Actividad reciente</h2>
          </div>
          <div className="p-2">
            {activity.map(ev => (
              <div key={ev.id} className="flex gap-3 px-3 py-2.5 items-start">
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#7288AE', marginTop: 6, flexShrink: 0, display: 'inline-block' }} />
                <div className="leading-snug">
                  <span className="text-[12.5px] text-[#EAE0CF]">
                    <strong>{ev.quien}</strong>{' '}
                    <span className="text-[#8e98c9]">{ev.txt}</span>
                  </span>
                  <div className="font-mono text-[10.5px] text-[#7288AE] mt-0.5">
                    {new Date(ev.created_at).toLocaleString('es-ES', { day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              </div>
            ))}
            {activity.length === 0 && (
              <p className="px-3 py-2.5 text-[12px] text-[#7288AE]">Sin actividad reciente</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
