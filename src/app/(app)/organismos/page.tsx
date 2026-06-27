'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { fmtDate, fmtEur } from '@/lib/utils'
import type { Organismo } from '@/lib/types'

export default function OrganismosPage() {
  const supabase = createClient()
  const [orgs, setOrgs] = useState<Organismo[]>([])

  useEffect(() => {
    supabase.from('organismos').select('*').order('org').then(({ data }) => {
      if (data) setOrgs(data)
    })
  }, [])

  return (
    <div className="p-7 pb-10">
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Organismos</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Directorio de entidades públicas y métricas de relación</p>
      </div>

      <div className="grid gap-3.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(330px, 1fr))' }}>
        {orgs.map(o => (
          <div key={o.id} className="rounded-xl p-4"
            style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)' }}>
            <div className="flex justify-between items-start mb-3.5 gap-2.5">
              <div>
                <div className="text-[14px] font-semibold text-[#EAE0CF] leading-snug">{o.org}</div>
                <div className="text-[11.5px] text-[#7288AE] mt-0.5">{o.tipo} · {o.region}</div>
              </div>
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: '#1a2160', border: '1px solid rgba(114,136,174,0.30)' }}>
                <svg width="17" height="17" viewBox="0 0 16 16" fill="none" stroke="#7288AE" strokeWidth="1.5">
                  <rect x="3" y="2" width="10" height="12" rx="1"/>
                  <path d="M6 5h.5M9.5 5h.5M6 8h.5M9.5 8h.5M7 13v-2h2v2"/>
                </svg>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2.5 mb-3.5">
              <div>
                <div className="font-mono text-[17px] font-semibold text-[#EAE0CF]">{o.contratos}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mt-0.5">Contratos</div>
              </div>
              <div>
                <div className="font-mono text-[17px] font-semibold text-[#EAE0CF]">{o.licitaciones}</div>
                <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mt-0.5">Licit.</div>
              </div>
              <div>
                <div className="font-mono text-[17px] font-semibold text-[#34D399]">{o.tasa_exito}%</div>
                <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mt-0.5">Éxito</div>
              </div>
            </div>

            <div className="pt-3 flex flex-col gap-1.5" style={{ borderTop: '1px solid rgba(114,136,174,0.16)' }}>
              {[
                { k: 'Importe acumulado', v: fmtEur(o.importe) },
                { k: 'Contacto', v: o.contacto },
                { k: 'Último contacto', v: fmtDate(o.ultimo_contacto) },
              ].map(f => (
                <div key={f.k} className="flex justify-between text-[11.5px]">
                  <span className="text-[#7288AE]">{f.k}</span>
                  <span className="font-mono text-[#8e98c9]">{f.v}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
        {orgs.length === 0 && (
          <div className="col-span-full py-10 text-center text-[13px] text-[#7288AE]">Sin organismos registrados</div>
        )}
      </div>
    </div>
  )
}
