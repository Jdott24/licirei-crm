'use client'
import { useEffect, useState, useCallback } from 'react'
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
  const [items,  setItems]  = useState<PipelineItem[]>([])
  const [active, setActive] = useState<PipelineItem | null>(null)

  const fetch = useCallback(async () => {
    const { data } = await supabase.from('pipeline').select('*').order('created_at')
    if (data) setItems(data)
  }, [])

  useEffect(() => { fetch() }, [fetch])

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
  )

  function onDragStart(e: DragStartEvent) {
    const item = items.find(i => i.id === e.active.id)
    setActive(item || null)
  }

  async function onDragEnd(e: DragEndEvent) {
    setActive(null)
    const { active: act, over } = e
    if (!over || act.id === over.id) return
    const newStage = over.id as PipelineStage
    if (!STAGES.includes(newStage)) return

    // Optimistic update
    setItems(prev => prev.map(i => i.id === act.id ? { ...i, stage: newStage } : i))

    await supabase.from('pipeline').update({ stage: newStage }).eq('id', act.id)
  }

  const byStage = (stage: PipelineStage) => items.filter(i => i.stage === stage)

  return (
    <div className="flex flex-col h-full p-7" style={{ height: 'calc(100vh - 0px)' }}>
      <div className="mb-5 flex-shrink-0">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#EAE0CF] m-0">Pipeline</h1>
        <p className="text-[13px] text-[#7288AE] mt-1">Ciclo de vida de cada licitación · arrastra las tarjetas entre columnas</p>
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter}
        onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div className="flex gap-3.5 overflow-x-auto flex-1 pb-4 items-start">
          {STAGES.map(stage => (
            <KanbanColumn
              key={stage}
              stage={stage}
              label={STAGE_LABELS[stage]}
              items={byStage(stage)}
            />
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
