'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, fmtDate, fmtEur, statusOf, dotColor, statusLabel } from '@/lib/utils'
import type { Contract, Organismo } from '@/lib/types'

const DOCS = [
  'Pliego de cláusulas administrativas',
  'Pliego de prescripciones técnicas',
  'Oferta económica',
  'Declaración responsable (DEUC)',
  'Acreditación de solvencia',
  'Garantía / aval',
]
const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 14 }

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()
  const supabase = createClient()
  const [contract, setContract]   = useState<Contract | null>(null)
  const [organismo, setOrganismo] = useState<Organismo | null>(null)

  useEffect(() => {
    supabase.from('contracts').select('*').eq('id', id).single()
      .then(({ data }) => {
        if (data) {
          setContract(data)
          supabase.from('organismos').select('*').eq('org', data.org).single()
            .then(({ data: o }) => setOrganismo(o))
        }
      })
  }, [id])

  if (!contract) return (
    <div className="p-7"><p className="text-[#7288AE]">Cargando…</p></div>
  )

  const dias   = daysUntil(contract.fecha_vence)
  const st     = statusOf(dias)
  const col    = dotColor(st)
  const lbl    = statusLabel(st)
  const crit   = (st === 'danger' || st === 'venc')

  const fields = [
    { k: 'Importe', v: fmtEur(contract.importe) },
    { k: 'Código CPV', v: contract.cpv },
    { k: 'Fecha de inicio', v: fmtDate(contract.fecha_inicio) },
    { k: 'Fecha de vencimiento', v: fmtDate(contract.fecha_vence) },
    { k: 'Organismo', v: contract.org },
    { k: 'Responsable', v: contract.responsable },
  ]

  return (
    <div className="p-6 pb-10">
      <button onClick={() => router.back()}
        className="flex items-center gap-2 text-[#7288AE] hover:text-[#EAE0CF] mb-5 text-[13px]">
        <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M10 4l-4 4 4 4"/>
        </svg>
        Volver
      </button>

      <div className="grid gap-5" style={{ gridTemplateColumns: '1.7fr 1fr', alignItems: 'start' }}>
        {/* Left */}
        <div className="flex flex-col gap-4">
          <div style={PANEL} className="p-5">
            <div className="flex justify-between items-start gap-4 flex-wrap">
              <div className="flex-1 min-w-[240px]">
                <div className="text-[11px] uppercase tracking-widest text-[#7288AE] mb-2">Contrato vigente</div>
                <h1 className="text-[20px] font-semibold text-[#EAE0CF] m-0 mb-1.5 leading-snug">{contract.org}</h1>
                <p className="text-[13px] text-[#8e98c9] leading-relaxed mb-2.5">{contract.obj}</p>
                <span className="font-mono text-[12px] text-[#7288AE]">{contract.expediente}</span>
              </div>
              {/* Countdown */}
              <div className="text-right rounded-xl p-4 min-w-[160px]"
                style={{ background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)' }}>
                <div className="flex items-baseline gap-2 justify-end">
                  <span className={crit ? 'animate-lcpulse' : ''} style={{ width: 11, height: 11, borderRadius: '50%', background: col, display: 'inline-block' }} />
                  <span className="font-mono text-[40px] font-semibold tracking-tight leading-none text-[#EAE0CF]">
                    {Math.abs(dias)}
                  </span>
                  <span className="text-[13px] text-[#8e98c9]">días</span>
                </div>
                <div className="text-[11.5px] text-[#7288AE] mt-2">
                  {dias < 0 ? 'vencido' : 'restantes'} hasta el vencimiento
                </div>
                <div className="mt-2.5 inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full"
                  style={{ border: '1px solid rgba(114,136,174,0.30)', color: '#8e98c9' }}>
                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, display: 'inline-block' }} />
                  {lbl}
                </div>
              </div>
            </div>

            {/* Fields grid */}
            <div className="grid grid-cols-3 gap-px mt-5 rounded-xl overflow-hidden"
              style={{ background: 'rgba(114,136,174,0.16)' }}>
              {fields.map(fl => (
                <div key={fl.k} className="p-3.5" style={{ background: '#141a4d' }}>
                  <div className="text-[10.5px] uppercase tracking-widest text-[#7288AE] mb-1.5">{fl.k}</div>
                  <div className="font-mono text-[13px] text-[#EAE0CF]">{fl.v}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Docs */}
          <div style={{ ...PANEL, overflow: 'hidden' }}>
            <div className="flex justify-between items-center px-5 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
              <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Documentación requerida</h2>
              <span className="font-mono text-[12px] text-[#7288AE]">{DOCS.length}/{DOCS.length}</span>
            </div>
            <div className="px-3 py-2">
              {DOCS.map((d, i) => (
                <div key={i} className="flex items-center gap-3 px-2 py-2.5">
                  <span className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center"
                    style={{ background: 'rgba(52,211,153,0.18)' }}>
                    <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="#34D399" strokeWidth="2.2">
                      <path d="M3 8l3.5 3.5L13 5"/>
                    </svg>
                  </span>
                  <span className="text-[13px] text-[#EAE0CF]">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right */}
        <div className="flex flex-col gap-4">
          {organismo && (
            <div style={{ ...PANEL, overflow: 'hidden' }}>
              <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
                <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Organismo</h2>
              </div>
              <div className="p-5">
                <div className="text-[14px] font-semibold text-[#EAE0CF] mb-3">{organismo.org}</div>
                {[
                  { k: 'Tipo', v: organismo.tipo },
                  { k: 'Región', v: organismo.region },
                  { k: 'Contratos', v: String(organismo.contratos) },
                  { k: 'Importe acumulado', v: fmtEur(organismo.importe) },
                  { k: 'Tasa de éxito', v: `${organismo.tasa_exito} %` },
                ].map(f => (
                  <div key={f.k} className="flex justify-between text-[12px] mb-2">
                    <span className="text-[#7288AE]">{f.k}</span>
                    <span className="font-mono text-[#8e98c9]">{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div style={{ ...PANEL, overflow: 'hidden' }}>
            <div className="px-5 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
              <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Actividad</h2>
            </div>
            <div className="p-5 flex flex-col gap-4">
              {[
                { txt: 'Contrato formalizado y en ejecución', when: 'estado actual', col: '#7288AE' },
                { txt: 'Adjudicación publicada en PLACSP', when: '', col: '#4B5694' },
                { txt: 'Oferta presentada y valorada', when: '', col: '#4B5694' },
              ].map((t, i) => (
                <div key={i} className="flex gap-3">
                  <span style={{ width: 9, height: 9, borderRadius: '50%', background: t.col, marginTop: 4, flexShrink: 0, display: 'inline-block' }} />
                  <div>
                    <div className="text-[12.5px] text-[#EAE0CF] leading-snug">{t.txt}</div>
                    {t.when && <div className="font-mono text-[10.5px] text-[#7288AE] mt-0.5">{t.when}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
