'use client'
import { useDraggable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import Link from 'next/link'
import { daysUntil, fmtEur, statusOf, dotColor } from '@/lib/utils'
import type { PipelineItem } from '@/lib/types'

export default function KanbanCard({ item }: { item: PipelineItem }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: item.id })

  const dias = item.plazo ? daysUntil(item.plazo) : 999
  const st   = statusOf(dias)
  const col  = dotColor(st)
  const pct  = Math.round((item.docs_done / Math.max(item.docs_total, 1)) * 100)
  const ini  = item.responsable.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase()

  const containerStyle: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.45 : 1,
    zIndex: isDragging ? 50 : undefined,
    cursor: 'grab',
  }

  const cardStyle: React.CSSProperties = {
    background: '#141a4d',
    border: '1px solid rgba(114,136,174,0.30)',
    borderRadius: 10,
    padding: 12,
  }

  return (
    <div ref={setNodeRef} style={containerStyle} {...listeners} {...attributes}>
      <div style={cardStyle}>
        <div className="text-[12.5px] font-semibold text-[#EAE0CF] mb-1 leading-snug">{item.org}</div>
        <div className="text-[11px] text-[#8e98c9] leading-snug mb-2.5 line-clamp-2">{item.obj}</div>

        <div className="flex justify-between font-mono text-[11px] mb-2">
          <span className="text-[#EAE0CF]">{fmtEur(item.presupuesto)}</span>
          <span className="flex items-center gap-1.5 text-[#8e98c9]">
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: col, display: 'inline-block' }} />
            {dias < 0 ? 'cerrado' : `${dias} d`}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-1 rounded-full mb-2.5" style={{ background: 'rgba(114,136,174,0.18)' }}>
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: '#7288AE' }} />
        </div>

        <div className="flex justify-between items-center text-[10.5px] text-[#7288AE]">
          <span className="w-5 h-5 rounded-full flex items-center justify-center text-[8.5px] font-semibold text-[#EAE0CF]"
            style={{ background: '#4B5694' }}>
            {ini}
          </span>
          <Link href={`/pipeline/${item.id}`}
            className="font-mono hover:text-[#EAE0CF] transition-colors"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}>
            doc {item.docs_done}/{item.docs_total}
          </Link>
        </div>
      </div>
    </div>
  )
}
