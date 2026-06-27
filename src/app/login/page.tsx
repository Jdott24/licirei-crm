'use client'
export const dynamic = 'force-dynamic'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) { setError(err.message); setLoading(false); return }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#0a0e2a' }}>
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 justify-center">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-lg"
            style={{ background: 'linear-gradient(135deg,#7288AE,#4B5694)', color: '#0a0e2a' }}>
            L
          </div>
          <span className="text-xl font-semibold tracking-tight text-[#EAE0CF]">Licirei CRM</span>
        </div>

        <div className="rounded-xl border p-8" style={{ background: '#141a4d', borderColor: 'rgba(114,136,174,0.30)' }}>
          <h1 className="text-lg font-semibold text-[#EAE0CF] mb-1">Iniciar sesión</h1>
          <p className="text-sm text-[#8e98c9] mb-6">Accede a tu cuenta de Licirei</p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#7288AE] mb-1.5">
                Correo electrónico
              </label>
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[#EAE0CF] outline-none"
                style={{ background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)' }}
                placeholder="usuario@empresa.es"
              />
            </div>
            <div>
              <label className="block text-xs uppercase tracking-widest text-[#7288AE] mb-1.5">
                Contraseña
              </label>
              <input
                type="password" required value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full rounded-lg px-3 py-2.5 text-sm text-[#EAE0CF] outline-none"
                style={{ background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)' }}
                placeholder="••••••••"
              />
            </div>

            {error && (
              <p className="text-xs text-[#F87171] bg-[#F87171]/10 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="submit" disabled={loading}
              className="mt-1 py-2.5 rounded-lg font-semibold text-sm transition-colors"
              style={{ background: '#4B5694', color: '#EAE0CF' }}
            >
              {loading ? 'Entrando…' : 'Iniciar sesión'}
            </button>
          </form>

          <p className="text-center text-xs text-[#7288AE] mt-5">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-[#7288AE] underline hover:text-[#EAE0CF]">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
