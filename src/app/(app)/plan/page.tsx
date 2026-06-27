'use client'

const FEATURES_PRO = [
  'Contratos ilimitados',
  'Pipeline Kanban',
  'Explorador PLACSP',
  'Directorio de Organismos',
  'Alertas en tiempo real',
  'Soporte prioritario',
  'Exportación a Excel',
  'Integración con PLACSP API',
]

const PLANS = [
  {
    name: 'Básico',    price: '49 €',  period: '/mes',  featured: false,
    features: ['5 contratos', 'Pipeline básico', 'Soporte por email'],
  },
  {
    name: 'Profesional', price: '149 €', period: '/mes', featured: true,
    features: FEATURES_PRO,
  },
  {
    name: 'Empresa',   price: 'A medida', period: '', featured: false,
    features: ['Todo en Pro', 'Multi-usuario', 'SLA garantizado', 'Onboarding personalizado'],
  },
]

export default function PlanPage() {
  const PANEL = { background: '#141a4d', border: '1px solid rgba(114,136,174,0.16)', borderRadius: 12, overflow: 'hidden' }

  return (
    <div className="p-7 pb-10" style={{ maxWidth: 820 }}>
      <div className="mb-5">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Plan &amp; Facturación</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Tu suscripción y método de pago</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        {/* Current plan card */}
        <div className="rounded-xl p-5" style={{ background: 'linear-gradient(150deg,#1a2160,#141a4d)', border: '1px solid rgba(114,136,174,0.30)' }}>
          <div className="flex justify-between items-start mb-4">
            <div>
              <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mb-1">Plan actual</div>
              <div className="text-[22px] font-semibold text-[#EAE0CF]">Profesional</div>
            </div>
            <span className="text-[11px] px-2.5 py-1 rounded-full font-semibold"
              style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
              Activo
            </span>
          </div>
          <div className="flex items-baseline gap-1 mb-4">
            <span className="font-mono text-[32px] font-semibold tracking-tight text-[#EAE0CF]">149 €</span>
            <span className="text-[13px] text-[#8e98c9]">/mes</span>
          </div>
          <div className="text-[12px] text-[#7288AE] mb-4">Próxima factura: 27 jul 2026</div>
          <button className="w-full py-2.5 rounded-lg text-[13px] font-semibold text-[#EAE0CF]"
            style={{ background: '#4B5694' }}>
            Gestionar suscripción
          </button>
        </div>

        {/* Payment method */}
        <div style={PANEL}>
          <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
            <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Método de pago</h2>
          </div>
          <div className="p-4 flex flex-col gap-3">
            <div className="flex items-center gap-3 p-3 rounded-lg"
              style={{ border: '1px solid rgba(114,136,174,0.30)', background: '#0d1238' }}>
              <div className="w-10 h-7 rounded flex items-center justify-center text-[11px] font-bold"
                style={{ background: '#1a2160', color: '#7288AE' }}>
                VISA
              </div>
              <div>
                <div className="text-[13px] font-medium text-[#EAE0CF]">•••• •••• •••• 4242</div>
                <div className="text-[11px] text-[#7288AE]">Caduca 12/27</div>
              </div>
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full"
                style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
                Principal
              </span>
            </div>
            <button className="text-[12.5px] text-[#7288AE] hover:text-[#EAE0CF] py-1">
              + Añadir método de pago
            </button>
          </div>
        </div>
      </div>

      {/* Plans comparison */}
      <div style={PANEL} className="mb-6">
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
          <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Comparativa de planes</h2>
        </div>
        <div className="p-4 grid grid-cols-3 gap-4">
          {PLANS.map(p => (
            <div key={p.name}
              className="rounded-xl p-4 flex flex-col gap-3"
              style={{
                border: p.featured ? '1px solid rgba(114,136,174,0.50)' : '1px solid rgba(114,136,174,0.20)',
                background: p.featured ? 'rgba(74,86,148,0.15)' : 'transparent',
              }}>
              <div>
                {p.featured && (
                  <div className="text-[10px] uppercase tracking-widest text-[#34D399] mb-1.5">Actual</div>
                )}
                <div className="text-[15px] font-semibold text-[#EAE0CF]">{p.name}</div>
                <div className="mt-1">
                  <span className="font-mono text-[22px] font-semibold text-[#EAE0CF]">{p.price}</span>
                  <span className="text-[12px] text-[#7288AE]">{p.period}</span>
                </div>
              </div>
              <ul className="flex flex-col gap-1.5">
                {p.features.map(f => (
                  <li key={f} className="flex items-start gap-2 text-[12px] text-[#8e98c9]">
                    <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#34D399" strokeWidth="2.2" className="mt-0.5 flex-shrink-0">
                      <path d="M3 8l3.5 3.5L13 5"/>
                    </svg>
                    {f}
                  </li>
                ))}
              </ul>
              {!p.featured && (
                <button className="mt-auto py-2 rounded-lg text-[12px] text-[#8e98c9]"
                  style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
                  {p.name === 'Empresa' ? 'Contactar' : 'Cambiar a ' + p.name}
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Invoice history */}
      <div style={PANEL}>
        <div className="px-4 py-3.5" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
          <h2 className="text-[14px] font-semibold text-[#EAE0CF] m-0">Historial de facturas</h2>
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr style={{ background: 'rgba(114,136,174,0.05)' }}>
              {['Fecha', 'Descripción', 'Importe', 'Estado'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-[10px] uppercase tracking-widest text-[#7288AE] font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[
              { fecha: '27 jun 2026', desc: 'Plan Profesional – jun 2026', imp: '149,00 €', est: 'Pagada' },
              { fecha: '27 may 2026', desc: 'Plan Profesional – may 2026', imp: '149,00 €', est: 'Pagada' },
              { fecha: '27 abr 2026', desc: 'Plan Profesional – abr 2026', imp: '149,00 €', est: 'Pagada' },
            ].map((row, i) => (
              <tr key={i} style={{ borderTop: '1px solid rgba(114,136,174,0.16)' }}>
                <td className="px-4 py-3 font-mono text-[12px] text-[#8e98c9]">{row.fecha}</td>
                <td className="px-4 py-3 text-[13px] text-[#EAE0CF]">{row.desc}</td>
                <td className="px-4 py-3 font-mono text-[13px] text-[#EAE0CF]">{row.imp}</td>
                <td className="px-4 py-3">
                  <span className="text-[11px] px-2 py-0.5 rounded-full"
                    style={{ background: 'rgba(52,211,153,0.15)', color: '#34D399' }}>
                    {row.est}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
