'use client'
import { useDroppable } from '@dnd-kit/core'
import type { PipelineItem, PipelineStage } from '@/lib/types'
import KanbanCard from './KanbanCard'

interface Props {
  stage:  PipelineStage
  label:  string
  items:  PipelineItem[]
}

export default function KanbanColumn({ stage, label, items }: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div ref={setNodeRef}
      className="w-[262px] flex-shrink-0 flex flex-col rounded-xl"
      style={{
        background: isOver ? 'rgba(74,86,148,0.12)' : '#0d1238',
        border: `1px solid ${isOver ? 'rgba(114,136,174,0.40)' : 'rgba(114,136,174,0.16)'}`,
        maxHeight: '100%',
        transition: 'border-color 0.15s, background 0.15s',
      }}>

      {/* Column header */}
      <div className="flex justify-between items-center px-3.5 py-3" style={{ borderBottom: '1px solid rgba(114,136,174,0.16)' }}>
        <span className="text-[12.5px] font-semibold text-[#EAE0CF]">{label}</span>
        <span className="font-mono text-[11px] text-[#7288AE] px-2 py-0.5 rounded-full"
          style={{ background: '#141a4d' }}>
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="p-2.5 flex flex-col gap-2.5 overflow-y-auto flex-1">
        {items.map(item => (
          <KanbanCard key={item.id} item={item} />
        ))}
        {items.length === 0 && (
          <div className="flex-1 min-h-[80px] rounded-lg flex items-center justify-center"
            style={{ border: '1px dashed rgba(114,136,174,0.20)' }}>
            <span className="text-[11px] text-[#5d68a0]">Arrastra aquí</span>
          </div>
        )}
      </div>
    </div>
  )
}
