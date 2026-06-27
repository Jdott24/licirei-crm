export interface Profile {
  id: string
  nombre: string
  cargo: string
  empresa: string
  telefono: string
  nif: string
  email: string
  updated_at: string
}

export interface Contract {
  id: string
  expediente: string
  org: string
  obj: string
  importe: number
  cpv: string
  fecha_inicio: string | null
  fecha_vence: string
  responsable: string
  user_id: string
  created_at: string
}

export type PipelineStage =
  | 'detectada'
  | 'analisis'
  | 'gonogo'
  | 'preparacion'
  | 'presentada'
  | 'adjudicada'

export const STAGE_LABELS: Record<PipelineStage, string> = {
  detectada:   'Detectada',
  analisis:    'En análisis',
  gonogo:      'Go / No-Go',
  preparacion: 'En preparación',
  presentada:  'Presentada',
  adjudicada:  'Adjudicada',
}

export const STAGES: PipelineStage[] = [
  'detectada', 'analisis', 'gonogo', 'preparacion', 'presentada', 'adjudicada',
]

export interface PipelineItem {
  id: string
  expediente: string
  org: string
  obj: string
  presupuesto: number
  plazo: string | null
  responsable: string
  docs_done: number
  docs_total: number
  cpv: string
  stage: PipelineStage
  user_id: string
  created_at: string
}

export interface InboxItem {
  id: string
  expediente: string
  org: string
  obj: string
  presupuesto: number
  plazo: string | null
  cpv: string
  filtro: string
  publicado: string | null
  user_id: string
  created_at: string
}

export interface Organismo {
  id: string
  org: string
  tipo: string
  region: string
  contratos: number
  importe: number
  licitaciones: number
  tasa_exito: number
  contacto: string
  ultimo_contacto: string | null
  user_id: string
}

export interface SolvenciaDoc {
  id: string
  nombre: string
  tipo: string
  emisor: string
  fecha_ini: string | null
  fecha_cad: string
  user_id: string
}

export interface CpvFilter {
  id: string
  nombre: string
  cliente: string
  cpvs: string[]
  activo: boolean
  user_id: string
}

export interface ActivityItem {
  id: string
  quien: string
  txt: string
  tone: string
  user_id: string
  created_at: string
}

export type DotStatus = 'ok' | 'warn' | 'danger' | 'venc'
