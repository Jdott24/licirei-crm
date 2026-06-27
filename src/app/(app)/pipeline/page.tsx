'use client'
import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  DndContext, DragEndEvent, DragOverlay, DragStartEvent,
  PointerSensor, useSensor, useSensors, closestCenter,
} from '@dnd-kit/core'
import { createClient } from '@/lib/supabase/client'
import { STAGES, STAGE_LABELS } from '@/lib/types'
import type { PipelineItem, PipelineStage } from '@/lib/types'
import KanbanColumn from '@/components/kanban/KanbanColumn'
import KanbanCard from '@/components/kanban/KanbanCard'

export default function PipelinePage() {
  const supabase = createClient()
  const [items,   setItems]   = useState<PipelineItem[]>([])
  const [active,  setActive]  = useState<PipelineItem | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    const { data, error } = await supabase.from('pipeline').select('*').order('created_at')
    if (!error) setItems(data ?? [])
    setLoading(false)
  }, [supabase])

  useEffect(() => { fetchItems() }, [fetchItems])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragStart(e: DragStartEvent) {
    const item = items.find(i => i.id === e.active.id)
    setActive(item ?? null)
  }

  async function onDragEnd(e: DragEndEvent) {
    setActive(null)
    const { active: act, over } = e
    if (!over || act.id === over.id) return
    const newStage = over.id as PipelineStage
    if (!STAGES.includes(newStage)) return
    setItems(prev => prev.map(i => i.id === act.id ? { ...i, stage: newStage } : i))
    await supabase.from('pipeline').update({ stage: newStage }).eq('id', String(act.id))
  }

  const byStage = (stage: PipelineStage) => items.filter(i => i.stage === stage)

  if (loading) return <div className="p-7 text-[#7288AE] text-[13px]">Cargando pipeline…</div>

  if (items.length === 0) {
    return (
      <div className="p-7 flex flex-col items-center justify-center" style={{ minHeight: '70vh' }}>
        <div className="text-[44px] mb-4">📊</div>
        <h1 className="text-[20px] font-semibold text-[#EAE0CF] mb-2 text-center">Pipeline vacío</h1>
        <p className="text-[13px] text-[#7288AE] text-center mb-6 max-w-sm">
          Añade licitaciones desde PLACSP o directamente aquí para hacer seguimiento del ciclo completo.
        </p>
        <Link href="/placsp" className="px-5 py-2.5 rounded-lg text-[13px] font-semibold text-[#EAE0CF]"
          style={{ background: '#4B5694' }}>
          Explorar licitaciones en PLACSP
        </Link>
      </div>
    )
  }

  return (
    <div className="flex flex-col p-7" style={{ height: 'calc(100vh - 0px)' }}>
      <div className="mb-5 flex-shrink-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Pipeline</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Ciclo de vida de cada licitación · arrastra las tarjetas entre columnas</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3.5 overflow-x-auto flex-1 pb-4 items-start">
          {STAGES.map(stage => (
            <KanbanColumn key={stage} stage={stage} label={STAGE_LABELS[stage]} items={byStage(stage)} />
          ))}
        </div>
        <DragOverlay>
          {active && (
            <div style={{ transform: 'rotate(2deg)', opacity: 0.9 }}>
              <KanbanCard item={active} />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
