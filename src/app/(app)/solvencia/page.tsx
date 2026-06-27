'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, fmtDate, dotColor, statusOf } from '@/lib/utils'
import type { SolvenciaDoc } from '@/lib/types'

const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }
const TH    = { padding: '11px 18px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#7288AE', fontWeight: 500 }
const TH_R  = { ...TH, textAlign: 'right' as const }

export default function SolvenciaPage() {
  const supabase = createClient()
  const [docs, setDocs] = useState<SolvenciaDoc[]>([])

  useEffect(() => {
    supabase.from('solvencia').select('*').order('fecha_cad').then(({ data }) => {
      if (data) setDocs(data)
    })
  }, [])

  return (
    <div className="p-7 pb-10">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Solvencia</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Documentación de solvencia técnica, económica y administrativa</p>
      </div>

      <div style={PANEL}>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'rgba(114,136,174,0.05)' }}>
              <th style={TH} className="text-left">Documento</th>
              <th style={TH} className="text-left">Emisor</th>
              <th style={TH_R}>Caducidad</th>
              <th style={{ ...TH_R, paddingRight: 18 }}>Estado</th>
            </tr>
          </thead>
          <tbody>
            {docs.map(d => {
              const dias   = daysUntil(d.fecha_cad)
              const st     = statusOf(dias)
              const col    = dotColor(st)
              const estado = dias < 0 ? 'Caducado' : dias < 30 ? 'Por caducar' : 'Vigente'
              const diasStr = dias < 0 ? 'caducado' : `en ${dias} d`
              return (
                <tr key={d.id} style={{ borderTop: '1px solid rgba(114,136,174,0.16)' }}>
                  <td className="px-4 py-3">
                    <div className="text-[13px] font-medium text-[#EAE0CF]">{d.nombre}</div>
                    <div className="text-[11px] text-[#7288AE] mt-0.5">{d.tipo}</div>
                  </td>
                  <td className="px-3 py-3 text-[12.5px] text-[#8e98c9]">{d.emisor}</td>
                  <td className="px-3 py-3 text-right font-mono text-[12px] text-[#8e98c9]">{fmtDate(d.fecha_cad)}</td>
                  <td className="pr-4 py-3 text-right">
                    <span className="inline-flex items-center gap-2 justify-end">
                      <span className="font-mono text-[12px] text-[#7288AE] whitespace-nowrap">{diasStr}</span>
                      <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-0.5 rounded-full"
                        style={{ border: '1px solid rgba(114,136,174,0.30)', color: '#8e98c9' }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, display: 'inline-block' }} />
                        {estado}
                      </span>
                    </span>
                  </td>
                </tr>
              )
            })}
            {docs.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-[13px] text-[#7288AE]">Sin documentos registrados</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
