'use client'
import { useState } from 'react'
import { STAGES, STAGE_LABELS, type PipelineStage } from '@/lib/types'

interface Props {
  item: { org: string; obj: string; expediente: string }
  onConfirm: (stage: PipelineStage, responsable: string) => void
  onCancel: () => void
}

export default function PipelineStageModal({ item, onConfirm, onCancel }: Props) {
  const [stage, setStage]           = useState<PipelineStage>('detectada')
  const [responsable, setResponsable] = useState('')

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(10,14,42,0.85)', backdropFilter: 'blur(6px)' }}>
      <div className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#141a4d', border: '1px solid rgba(114,136,174,0.30)' }}>

        <h2 className="text-[17px] font-semibold text-[#EAE0CF] mb-1">
          Añadir al pipeline
        </h2>
        <p className="text-[12.5px] text-[#7288AE] mb-5 leading-snug">
          {item.org} — {item.expediente}
        </p>

        {/* Objeto */}
        <div className="text-[12px] text-[#8e98c9] rounded-lg p-3 mb-5 leading-snug"
          style={{ background: 'rgba(114,136,174,0.08)', border: '1px solid rgba(114,136,174,0.16)' }}>
          {item.obj}
        </div>

        {/* Seleccionar etapa */}
        <div className="mb-4">
          <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mb-2">
            Etapa inicial
          </div>
          <div className="grid grid-cols-2 gap-2">
            {STAGES.map(s => (
              <button key={s} onClick={() => setStage(s)}
                className="px-3 py-2.5 rounded-lg text-[12.5px] text-left transition-all"
                style={{
                  background:  stage === s ? 'rgba(114,136,174,0.20)' : 'rgba(114,136,174,0.06)',
                  border:      `1px solid ${stage === s ? 'rgba(114,136,174,0.60)' : 'rgba(114,136,174,0.20)'}`,
                  color:       stage === s ? '#EAE0CF' : '#7288AE',
                  fontWeight:  stage === s ? 600 : 400,
                }}>
                {STAGE_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Responsable */}
        <div className="mb-6">
          <div className="text-[10px] uppercase tracking-widest text-[#7288AE] mb-1.5">
            Responsable
          </div>
          <input
            value={responsable}
            onChange={e => setResponsable(e.target.value)}
            placeholder="Nombre del responsable"
            className="w-full rounded-lg px-3 py-2.5 text-[13px] text-[#EAE0CF] outline-none"
            style={{ background: '#0d1238', border: '1px solid rgba(114,136,174,0.30)' }}
          />
        </div>

        <div className="flex gap-2.5">
          <button onClick={onCancel}
            className="flex-1 py-2.5 rounded-lg text-[13px] text-[#8e98c9]"
            style={{ border: '1px solid rgba(114,136,174,0.30)' }}>
            Cancelar
          </button>
          <button
            onClick={() => onConfirm(stage, responsable || 'Sin asignar')}
            className="flex-1 py-2.5 rounded-lg text-[13px] font-semibold text-[#0a0e2a]"
            style={{ background: '#34D399' }}>
            Añadir al pipeline
          </button>
        </div>
      </div>
    </div>
  )
}
