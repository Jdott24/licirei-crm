'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import type { Profile } from '@/lib/types'

const INPUT_STYLE = {
  display: 'flex', alignItems: 'center', gap: 8,
  background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)',
  borderRadius: 8, padding: '9px 12px',
}

export default function AjustesPage() {
  const supabase = createClient()
  const [profile, setProfile]   = useState<Profile | null>(null)
  const [notifs, setNotifs]     = useState({ contratos: true, placsp: true, solvencia: false })
  const [saving, setSaving]     = useState(false)
  const [saved,  setSaved]      = useState(false)
  const [edit, setEdit]         = useState({ nombre: '', cargo: '', empresa: '', telefono: '' })

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('profiles').select('*').eq('id', user.id).single()
        .then(({ data }) => {
          if (data) {
            setProfile(data)
            setEdit({ nombre: data.nombre, cargo: data.cargo, empresa: data.empresa, telefono: data.telefono })
          }
        })
    })
  }, [])

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!profile) return
    setSaving(true)
    await supabase.from('profiles').update({
      nombre: edit.nombre, cargo: edit.cargo, empresa: edit.empresa, telefono: edit.telefono,
    }).eq('id', profile.id)
    setSaving(false); setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const ini  = profile ? initials(profile.nombre) : '??'
  const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }

  return (
    <div className="p-7 pb-10" style={{ maxWidth: 760 }}>
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Ajustes</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Preferencias de la cuenta y notificaciones</p>
      </div>

      {/* Profile */}
      <div className="mb-4" style={PANEL}>
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
          <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Información de la cuenta</h2>
        </div>
        <form onSubmit={saveProfile} className="p-5">
          <div className="flex gap-5 items-start">
            <div className="w-[54px] h-[54px] rounded-full flex items-center justify-center text-[20px] font-bold text-[#EAE0CF] flex-shrink-0"
              style={{ background: 'linear-gradient(135deg,#4B5694,#7288AE)' }}>
              {ini}
            </div>
            <div className="flex-1">
              <div className="text-[16px] font-semibold text-[#EAE0CF] mb-1">{profile?.nombre || 'Usuario'}</div>
              <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2.5 py-0.5 rounded-full text-[#7288AE]"
                style={{ background: 'rgba(114,136,174,0.14)' }}>
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <rect x="2" y="5" width="12" height="8" rx="1"/><path d="M6 5V3h4v2"/>
                </svg>
                {profile?.cargo}
              </span>

              <div className="grid grid-cols-2 gap-3 mt-4">
                {[
                  { k: 'nombre', label: 'Nombre completo' },
                  { k: 'cargo', label: 'Cargo' },
                  { k: 'empresa', label: 'Empresa' },
                  { k: 'telefono', label: 'Teléfono' },
                ].map(f => (
                  <div key={f.k}>
                    <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">{f.label}</div>
                    <input
                      value={edit[f.k as keyof typeof edit]}
                      onChange={e => setEdit(p => ({ ...p, [f.k]: e.target.value }))}
                      className="w-full rounded-lg px-3 py-2.5 text-[13px] text-[#EAE0CF] outline-none"
                      style={{ background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)' }}
                    />
                  </div>
                ))}
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Correo electrónico</div>
                  <div style={INPUT_STYLE}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7288AE" strokeWidth="1.5">
                      <rect x="2" y="4" width="12" height="9" rx="1"/><path d="M2 5l6 5 6-5"/>
                    </svg>
                    <span className="text-[13px] text-[#EAE0CF]">{profile?.email}</span>
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">NIF empresa</div>
                  <div style={INPUT_STYLE}>
                    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#7288AE" strokeWidth="1.5">
                      <rect x="2" y="3" width="12" height="10" rx="1"/><path d="M5 7h6M5 10h4"/>
                    </svg>
                    <span className="font-mono text-[13px] text-[#EAE0CF]">{profile?.nif || '—'}</span>
                  </div>
                </div>
              </div>

              <div className="flex gap-2.5 mt-4">
                <button type="submit" disabled={saving}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-[12.5px] text-[#EAE0CF]"
                  style={{ background: saving ? '#4B5694' : '#4B5694', opacity: saving ? 0.7 : 1 }}>
                  {saved ? '✓ Guardado' : saving ? 'Guardando…' : 'Guardar cambios'}
                </button>
              </div>
            </div>
          </div>
        </form>
      </div>

      {/* Notifications */}
      <div style={PANEL}>
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
          <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Notificaciones</h2>
        </div>
        <div className="px-4">
          {[
            { k: 'contratos', title: 'Alertas de vencimiento de contrato', sub: 'Aviso a 90, 30 y 7 días' },
            { k: 'placsp',    title: 'Nuevas licitaciones PLACSP',          sub: 'Resumen diario por correo' },
            { k: 'solvencia', title: 'Caducidad de documentos de solvencia', sub: 'Aviso a 30 días' },
          ].map((n, i, arr) => (
            <div key={n.k}
              className="flex justify-between items-center py-3.5"
              style={{ borderBottom: i < arr.length - 1 ? '1px solid rgba(114,136,174,0.16)' : 'none' }}>
              <div>
                <div className="text-[13px] text-[#EAE0CF]">{n.title}</div>
                <div className="text-[11.5px] text-[#7288AE] mt-0.5">{n.sub}</div>
              </div>
              <button
                onClick={() => setNotifs(p => ({ ...p, [n.k]: !p[n.k as keyof typeof p] }))}
                className="w-[38px] h-[21px] rounded-full relative flex-shrink-0"
                style={{ background: notifs[n.k as keyof typeof notifs] ? '#34D399' : 'rgba(114,136,174,0.3)' }}>
                <span className="absolute top-[3px] w-[15px] h-[15px] rounded-full transition-all"
                  style={{
                    background: notifs[n.k as keyof typeof notifs] ? '#0a0e2a' : '#8e98c9',
                    left: notifs[n.k as keyof typeof notifs] ? 'auto' : 3,
                    right: notifs[n.k as keyof typeof notifs] ? 3 : 'auto',
                  }} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
