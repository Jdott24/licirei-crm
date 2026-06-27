'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { initials } from '@/lib/utils'
import type { Profile } from '@/lib/types'

interface Props { profile: Profile | null }

const NAV = [
  { section: 'Dashboard', items: [
    { key: 'dashboard',  href: '/dashboard',   label: 'Dashboard',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="5" height="5" rx="1"/><rect x="9" y="2" width="5" height="5" rx="1"/><rect x="2" y="9" width="5" height="5" rx="1"/><rect x="9" y="9" width="5" height="5" rx="1"/></svg> },
  ]},
  { section: 'Contratos', items: [
    { key: 'cartera',    href: '/cartera',      label: 'Cartera activa',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="5" width="12" height="8" rx="1"/><path d="M6 5V3h4v2"/></svg> },
  ]},
  { section: 'Licitaciones', items: [
    { key: 'pipeline',   href: '/pipeline',     label: 'Pipeline',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="2" width="3.5" height="12" rx="1"/><rect x="6.5" y="2" width="3.5" height="9" rx="1"/><rect x="11" y="2" width="3.5" height="6" rx="1"/></svg> },
    { key: 'placsp',     href: '/placsp',       label: 'Explorar PLACSP',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 9l2-6h8l2 6v4H2z"/><path d="M2 9h3l1 2h4l1-2h3"/></svg> },
  ]},
  { section: 'Empresa', items: [
    { key: 'organismos', href: '/organismos',   label: 'Organismos',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="2" width="10" height="12" rx="1"/><path d="M6 5h.5M9.5 5h.5M6 8h.5M9.5 8h.5M7 13v-2h2v2"/></svg> },
    { key: 'solvencia',  href: '/solvencia',    label: 'Solvencia',
      icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 2l5 2v4c0 3-2 5-5 6-3-1-5-3-5-6V4z"/></svg> },
  ]},
]

const BOTTOM = [
  { key: 'ajustes', href: '/ajustes', label: 'Ajustes',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="8" cy="8" r="2.4"/><path d="M8 1.5v1.6M8 12.9v1.6M1.5 8h1.6M12.9 8h1.6M3.4 3.4l1.1 1.1M11.5 11.5l1.1 1.1M12.6 3.4l-1.1 1.1M4.5 11.5l-1.1 1.1"/></svg> },
  { key: 'plan',    href: '/plan',    label: 'Plan & Facturación',
    icon: <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="2" y="4" width="12" height="8" rx="1.5"/><path d="M2 7h12"/></svg> },
]

export default function Sidebar({ profile }: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const supabase = createClient()

  const active = (href: string) => pathname.startsWith(href)

  const navBtn = (href: string, label: string, icon: React.ReactNode) => {
    const on = active(href)
    return (
      <Link key={href} href={href}
        className="flex items-center gap-2.5 w-full rounded-lg px-2.5 py-2 text-[13.5px] transition-colors"
        style={{
          background: on ? 'rgba(114,136,174,0.16)' : 'transparent',
          color: on ? '#EAE0CF' : '#8e98c9',
          fontWeight: on ? 600 : 500,
          borderLeft: `2px solid ${on ? '#7288AE' : 'transparent'}`,
        }}
      >
        {icon}
        {label}
      </Link>
    )
  }

  async function signOut() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  const empresa = profile?.empresa || 'Mi Empresa'
  const nombre  = profile?.nombre  || 'Usuario'
  const cargo   = profile?.cargo   || 'Responsable de licitaciones'
  const ini     = initials(nombre)

  return (
    <aside className="w-[252px] flex-shrink-0 flex flex-col h-screen fixed left-0 top-0"
      style={{ background: '#0c1138', borderRight: '1px solid rgba(114,136,174,0.16)' }}>

      {/* Header */}
      <div className="px-4 py-4 flex flex-col gap-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
        <div className="flex items-center gap-2.5">
          <div className="w-[26px] h-[26px] rounded-lg flex items-center justify-center font-bold text-[15px]"
            style={{ background: 'linear-gradient(135deg,#7288AE,#4B5694)', color: '#0a0e2a' }}>
            L
          </div>
          <span className="text-[17px] font-semibold tracking-tight text-[#EAE0CF]">Licirei</span>
        </div>

        {/* Company selector */}
        <button className="w-full flex items-center justify-between rounded-lg px-3 py-2 text-left"
          style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.30)' }}>
          <span className="flex flex-col leading-tight overflow-hidden">
            <span className="text-[9.5px] tracking-widest uppercase text-[#7288AE]">Empresa</span>
            <span className="text-[12.5px] font-medium text-[#EAE0CF] truncate">{empresa}</span>
          </span>
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#8e98c9" strokeWidth="1.6"><path d="M4 6l4 4 4-4"/></svg>
        </button>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-3 px-3 flex flex-col gap-0.5">
        {NAV.map(({ section, items }) => (
          <div key={section}>
            <p className="text-[9.5px] tracking-widest uppercase text-[#5d68a0] px-2.5 py-1.5 mt-2 mb-1">{section}</p>
            {items.map(({ href, label, icon }) => navBtn(href, label, icon))}
          </div>
        ))}

        <div className="my-3" style={{ height: 1, background: 'rgba(114,136,174,0.16)' }} />

        {BOTTOM.map(({ href, label, icon }) => navBtn(href, label, icon))}
      </nav>

      {/* User */}
      <div className="px-4 py-3 flex items-center gap-2.5" style={{ borderTop: '1px solid rgba(114,136,174,0.16)' }}>
        <button onClick={signOut} title="Cerrar sesión" className="flex items-center gap-2.5 w-full text-left">
          <div className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[11px] font-bold text-[#EAE0CF] flex-shrink-0"
            style={{ background: 'linear-gradient(135deg,#4B5694,#7288AE)' }}>
            {ini}
          </div>
          <div className="leading-tight overflow-hidden">
            <div className="text-[12.5px] font-medium text-[#EAE0CF] truncate">{nombre}</div>
            <div className="text-[11px] text-[#7288AE] truncate">{cargo}</div>
          </div>
        </button>
      </div>
    </aside>
  )
}
