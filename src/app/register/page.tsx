'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function RegisterPage() {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm]     = useState({ email: '', password: '', nombre: '', empresa: '' })
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true); setError('')

    const { data, error: signUpErr } = await supabase.auth.signUp({
      email: form.email,
      password: form.password,
    })

    if (signUpErr || !data.user) {
      setError(signUpErr?.message || 'Error al registrarse')
      setLoading(false); return
    }

    // Update profile with provided info
    await supabase.from('profiles').upsert({
      id: data.user.id,
      nombre: form.nombre || 'Usuario',
      empresa: form.empresa || 'Mi Empresa',
      email: form.email,
    })

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e2a' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg"
            style={{ background: 'linear-gradient(135deg,#7288AE,#4B5694)', color: '#0a0e2a' }}>
            L
          </div>
          <span className="text-xl font-semibold tracking-tight text-[#EAE0CF]">Licirei CRM</span>
        </div>

        <div className="rounded-xl border p-8" style={{ background: '#141a4d', borderColor: 'rgba(114,136,174,0.30)' }}>
          <h1 className="text-lg font-semibold text-[#EAE0CF] mb-1">Crear cuenta</h1>
          <p className="text-sm text-[#8e98c9] mb-6">Empieza a gestionar tus licitaciones</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {[
              { key: 'nombre',   label: 'Nombre completo',      type: 'text',     placeholder: 'Ana García' },
              { key: 'empresa',  label: 'Empresa',              type: 'text',     placeholder: 'Mi Empresa S.L.' },
              { key: 'email',    label: 'Correo electrónico',   type: 'email',    placeholder: 'ana@empresa.es' },
              { key: 'password', label: 'Contraseña',           type: 'password', placeholder: '••••••••' },
            ].map(f => (
              <div key={f.key}>
                <label className="block text-xs uppercase tracking-widest text-[#7288AE] mb-1.5">{f.label}</label>
                <input
                  type={f.type} required
                  value={form[f.key as keyof typeof form]}
                  onChange={set(f.key as keyof typeof form)}
                  placeholder={f.placeholder}
                  className="w-full rounded-lg px-3 py-2.5 text-sm text-[#EAE0CF] outline-none"
                  style={{ background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)' }}
                />
              </div>
            ))}

            {error && (
              <p className="text-xs text-[#F87171] bg-[#F87171]/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="mt-1 py-2.5 rounded-lg font-semibold text-sm"
              style={{ background: '#4B5694', color: '#EAE0CF' }}
            >
              {loading ? 'Creando cuenta…' : 'Crear cuenta'}
            </button>
          </form>

          <p className="text-center text-xs text-[#7288AE] mt-5">
            ¿Ya tienes cuenta?{' '}
            <Link href="/login" className="underline hover:text-[#EAE0CF]">Iniciar sesión</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
