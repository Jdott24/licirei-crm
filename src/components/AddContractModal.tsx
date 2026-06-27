'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface Props { onClose: () => void; onSaved: () => void }

const FIELD_STYLE = {
  width: '100%', borderRadius: 8, padding: '8px 12px', fontSize: 13,
  color: '#EAE0CF', background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)',
  outline: 'none', fontFamily: 'inherit',
}

export default function AddContractModal({ onClose, onSaved }: Props) {
  const supabase = createClient()
  const [form, setForm] = useState({
    expediente: '', org: '', obj: '', importe: '', cpv: '39830000-9',
    fecha_inicio: '', fecha_vence: '', responsable: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function save(e: React.FormEvent) {
    e.preventDefault()
    if (!form.org.trim() || !form.fecha_vence.trim()) {
      setError('Organismo y Fecha de vencimiento son obligatorios'); return
    }
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Sesión expirada, recarga la página'); setLoading(false); return }
    const { error: err } = await supabase.from('contracts').insert({
      expediente:   form.expediente.trim() || `MAN-${Date.now()}`,
      org:          form.org.trim(),
      obj:          form.obj.trim(),
      importe:      parseFloat(form.importe.replace(/\./g, '').replace(',', '.')) || 0,
      cpv:          form.cpv.trim(),
      fecha_inicio: form.fecha_inicio || null,
      fecha_vence:  form.fecha_vence,
      responsable:  form.responsable.trim() || 'Sin asignar',
      user_id:      user.id,
    })
    setLoading(false)
    if (err) { setError(err.message); return }
    onSaved(); onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl overflow-hidden"
        style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.30)' }}>

        {/* Header */}
        <div className="flex justify-between items-center px-6 py-4" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
          <h2 className="text-[15px] font-semibold text-[#EAE0CF] m-0">Añadir contrato</h2>
          <button onClick={onClose} className="text-[#7288AE] hover:text-[#EAE0CF] transition-colors">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 4l8 8M12 4l-8 8"/>
            </svg>
          </button>
        </div>

        <form onSubmit={save} className="px-6 py-5 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Organismo *</label>
              <input style={FIELD_STYLE} value={form.org} onChange={set('org')} required placeholder="Ayuntamiento de..." />
            </div>
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Objeto del contrato</label>
              <input style={FIELD_STYLE} value={form.obj} onChange={set('obj')} placeholder="Descripción del suministro..." />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Nº Expediente</label>
              <input style={FIELD_STYLE} value={form.expediente} onChange={set('expediente')} placeholder="2024/CON-001" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Importe (€)</label>
              <input style={FIELD_STYLE} value={form.importe} onChange={set('importe')} placeholder="1.200.000" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">CPV</label>
              <input style={FIELD_STYLE} value={form.cpv} onChange={set('cpv')} placeholder="39830000-9" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Responsable</label>
              <input style={FIELD_STYLE} value={form.responsable} onChange={set('responsable')} placeholder="Nombre" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Fecha de inicio</label>
              <input type="date" style={FIELD_STYLE} value={form.fecha_inicio} onChange={set('fecha_inicio')} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Fecha vencimiento *</label>
              <input type="date" style={FIELD_STYLE} value={form.fecha_vence} onChange={set('fecha_vence')} required />
            </div>
          </div>

          {error && <p className="text-[12px] text-[#F87171] bg-[#F87171]/10 rounded-lg px-3 py-2">{error}</p>}

          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-[13px] text-[#8e98c9]"
              style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={loading}
              className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-[#EAE0CF]"
              style={{ background: '#4B5694' }}>
              {loading ? 'Guardando…' : 'Guardar contrato'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
