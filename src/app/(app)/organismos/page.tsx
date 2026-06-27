'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, fmtEur } from '@/lib/utils'
import type { Organismo } from '@/lib/types'

export default function OrganismosPage() {
  const supabase = createClient()
  const [orgs,    setOrgs]    = useState<Organismo[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')

  useEffect(() => {
    supabase.from('organismos').select('*').order('org')
      .then(({ data, error: err }) => {
        if (err) setError(err.message)
        else setOrgs(data ?? [])
        setLoading(false)
      })
  }, [supabase])

  if (loading) return <div className="p-7 text-[#7288AE] text-[13px]">Cargando organismos…</div>

  return (
    <div className="p-7 pb-10">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Organismos</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Directorio de entidades públicas y métricas de relación</p>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[12.5px] text-[#F87171]"
          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
          {error}
        </div>
      )}

      {orgs.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="text-[40px] mb-3">🏛️</div>
          <div className="text-[15px] font-semibold text-[#EAE0CF] mb-2">Sin organismos registrados</div>
          <div className="text-[13px] text-[#7288AE] max-w-xs">
            Los organismos con los que trabajas aparecerán aquí automáticamente cuando añadas contratos o licitaciones.
          </div>
        </div>
      ) : (
        <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {orgs.map(o => (
            <div key={o.id} className="rounded-xl p-4"
              style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)' }}>
              <div className="flex justify-between items-start mb-3.5 gap-2.5">
                <div className="min-w-0">
                  <div className="text-[14px] font-semibold text-[#EAE0CF] leading-snug">{o.org}</div>
                  <div className="text-[11.5px] text-[#7288AE] mt-0.5">{o.tipo}{o.region ? ` · ${o.region}` : ''}</div>
                </div>
                <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: '#1a2160', border: '1px solid rgba(114,136,174,0.30)' }}>
                  <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#7288AE" strokeWidth="1.5">
                    <rect x="3" y="2" width="10" height="12" rx="1"/>
                    <path d="M6 5h.5M9.5 5h.5M6 8h.5M9.5 8h.5M7 14v-2h2v2"/>
                  </svg>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2.5 mb-3.5">
                {[
                  { v: o.contratos,    l: 'Contratos' },
                  { v: o.licitaciones, l: 'Licitac.' },
                  { v: `${o.tasa_exito}%`, l: 'Éxito', color: '#34D399' },
                ].map(s => (
                  <div key={s.l}>
                    <div className="font-mono text-[17px] font-semibold" style={{ color: s.color ?? '#EAE0CF' }}>{s.v}</div>
                    <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mt-0.5">{s.l}</div>
                  </div>
                ))}
              </div>

              <div className="pt-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid rgba(114,136,174,0.16)' }}>
                {[
                  { k: 'Importe acumulado', v: fmtEur(o.importe) },
                  { k: 'Contacto', v: o.contacto || '—' },
                  { k: 'Último contacto', v: o.ultimo_contacto ? fmtDate(o.ultimo_contacto) : '—' },
                ].map(f => (
                  <div key={f.k} className="flex justify-between text-[11.5px]">
                    <span className="text-[#7288AE]">{f.k}</span>
                    <span className="font-mono text-[#8e98c9]">{f.v}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
