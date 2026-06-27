'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { daysUntil, fmtDate, dotColor, statusOf } from '@/lib/utils'
import type { SolvenciaDoc } from '@/lib/types'

const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }
const TH    = { padding: '11px 18px', fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase' as const, color: '#7288AE', fontWeight: 500 }
const TH_R  = { ...TH, textAlign: 'right' as const }

interface AddDocForm {
  nombre: string; tipo: string; emisor: string; fecha_ini: string; fecha_cad: string
}

export default function SolvenciaPage() {
  const supabase  = createClient()
  const [docs,    setDocs]    = useState<SolvenciaDoc[]>([])
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState('')
  const [adding,  setAdding]  = useState(false)
  const [saving,  setSaving]  = useState(false)
  const [form,    setForm]    = useState<AddDocForm>({ nombre: '', tipo: '', emisor: '', fecha_ini: '', fecha_cad: '' })

  const fetchDocs = async () => {
    const { data, error: err } = await supabase.from('solvencia').select('*').order('fecha_cad')
    if (err) setError(err.message)
    else setDocs(data ?? [])
    setLoading(false)
  }

  useEffect(() => { fetchDocs() }, [])

  const set = (k: keyof AddDocForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function guardar(e: React.FormEvent) {
    e.preventDefault()
    if (!form.nombre.trim() || !form.fecha_cad) { setError('Nombre y fecha de caducidad son obligatorios'); return }
    setSaving(true)
    const { error: err } = await supabase.from('solvencia').insert({
      nombre:    form.nombre.trim(),
      tipo:      form.tipo.trim(),
      emisor:    form.emisor.trim(),
      fecha_ini: form.fecha_ini || null,
      fecha_cad: form.fecha_cad,
    })
    setSaving(false)
    if (err) { setError(err.message); return }
    setAdding(false)
    setForm({ nombre: '', tipo: '', emisor: '', fecha_ini: '', fecha_cad: '' })
    fetchDocs()
  }

  async function eliminar(id: string) {
    if (!confirm('¿Eliminar este documento?')) return
    await supabase.from('solvencia').delete().eq('id', id)
    fetchDocs()
  }

  if (loading) return <div className="p-7 text-[#7288AE] text-[13px]">Cargando documentos…</div>

  const FIELD = { background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)', borderRadius: 8, padding: '8px 12px', fontSize: 13, color: '#EAE0CF', outline: 'none', width: '100%', fontFamily: 'inherit' }

  return (
    <div className="p-7 pb-10">
      <div className="flex justify-between items-end mb-5">
        <div>
          <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Solvencia</h1>
          <p className="text-[13px] text-[#7288AE] mt-1">Documentación de solvencia técnica, económica y administrativa</p>
        </div>
        <button onClick={() => setAdding(v => !v)}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-[13px] font-semibold text-[#EAE0CF]"
          style={{ background: '#4B5694' }}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3v10M3 8h10"/>
          </svg>
          Añadir documento
        </button>
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg text-[12.5px] text-[#F87171]"
          style={{ background: 'rgba(248,113,113,0.10)', border: '1px solid rgba(248,113,113,0.20)' }}>
          {error}
        </div>
      )}

      {/* Formulario de añadir */}
      {adding && (
        <form onSubmit={guardar} className="mb-4 p-5 rounded-xl"
          style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.30)' }}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Nombre del documento *</label>
              <input style={FIELD} value={form.nombre} onChange={set('nombre')} required placeholder="Clasificación empresarial, ISO 9001…" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Tipo</label>
              <select style={FIELD} value={form.tipo} onChange={set('tipo')}>
                <option value="">Seleccionar tipo</option>
                {['Clasificación', 'Certificación', 'Seguro', 'Certificado', 'Financiero', 'Otro'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Emisor</label>
              <input style={FIELD} value={form.emisor} onChange={set('emisor')} placeholder="AENOR, Agencia Tributaria…" />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Fecha de emisión</label>
              <input type="date" style={FIELD} value={form.fecha_ini} onChange={set('fecha_ini')} />
            </div>
            <div>
              <label className="block text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">Fecha de caducidad *</label>
              <input type="date" style={FIELD} value={form.fecha_cad} onChange={set('fecha_cad')} required />
            </div>
          </div>
          <div className="flex gap-2.5">
            <button type="button" onClick={() => setAdding(false)}
              className="px-4 py-2 rounded-lg text-[12.5px] text-[#8e98c9]"
              style={{ border: '1px solid rgba(114,136,174,0.30)' }}>Cancelar</button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 rounded-lg text-[12.5px] font-semibold text-[#EAE0CF]"
              style={{ background: '#4B5694', opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Guardando…' : 'Guardar documento'}
            </button>
          </div>
        </form>
      )}

      <div style={PANEL}>
        {docs.length === 0 ? (
          <div className="px-6 py-14 text-center">
            <div className="text-[36px] mb-3">📄</div>
            <div className="text-[15px] font-semibold text-[#EAE0CF] mb-2">Sin documentos de solvencia</div>
            <div className="text-[13px] text-[#7288AE] max-w-xs mx-auto">
              Añade tu clasificación empresarial, seguros, certificaciones ISO y certificados de la AEAT y la TGSS.
            </div>
          </div>
        ) : (
          <table className="w-full border-collapse">
            <thead>
              <tr style={{ background: 'rgba(114,136,174,0.05)' }}>
                <th style={TH}  className="text-left">Documento</th>
                <th style={TH}  className="text-left">Emisor</th>
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
                      {d.tipo && <div className="text-[11px] text-[#7288AE] mt-0.5">{d.tipo}</div>}
                    </td>
                    <td className="px-3 py-3 text-[12.5px] text-[#8e98c9]">{d.emisor || '—'}</td>
                    <td className="px-3 py-3 text-right font-mono text-[12px] text-[#8e98c9]">{fmtDate(d.fecha_cad)}</td>
                    <td className="pr-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <span className="font-mono text-[12px] text-[#7288AE] whitespace-nowrap">{diasStr}</span>
                        <span className="inline-flex items-center gap-1.5 text-[11.5px] px-2 py-0.5 rounded-full"
                          style={{ border: '1px solid rgba(114,136,174,0.30)', color: '#8e98c9' }}>
                          <span style={{ width: 7, height: 7, borderRadius: '50%', background: col, display: 'inline-block' }} />
                          {estado}
                        </span>
                        <button onClick={() => eliminar(d.id)} title="Eliminar"
                          className="text-[#7288AE] hover:text-[#F87171]">
                          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8">
                            <path d="M4 4l8 8M12 4l-8 8"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
