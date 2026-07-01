// ── Raw / parsed from feed ────────────────────────────────────────────────────

export interface ParsedEntry {
  atomId: string
  idEvolucion: string | null
  contractFolderId: string | null   // Expediente number extracted from Codice XML
  dir3: string | null               // DIR3 authority code extracted from Codice XML
  titulo: string
  organismo: string
  objeto: string | null
  presupuesto: number
  plazo: string | null              // ISO date YYYY-MM-DD
  fechaPublicacion: string | null
  cpvs: string[]                    // e.g. ['39830000-9']
  rawData: Record<string, unknown>  // Full raw entry stored for parser debugging
}

// ── Identity ──────────────────────────────────────────────────────────────────

export type IdentityConfidence = 'canonical' | 'fallback'
export type IdentitySource    = 'dir3+contractFolderID' | 'idEvolucion'

export interface IdentityResult {
  canonicalId: string
  confidence:  IdentityConfidence
  source:      IdentitySource
}

// ── Normalized (ParsedEntry + identity) ──────────────────────────────────────

export interface NormalizedContract extends ParsedEntry {
  canonicalId: string
  identity:    IdentityResult
}

// ── Database row types ────────────────────────────────────────────────────────

export interface PlacspContract {
  id:                 string
  canonical_id:       string
  atom_id:            string
  id_evolucion:       string | null
  contract_folder_id: string | null
  dir3:               string | null
  titulo:             string
  organismo:          string
  objeto:             string | null
  presupuesto:        number
  plazo:              string | null
  fecha_publicacion:  string | null
  cpvs:               string[]
  version_count:      number
  last_seen_at:       string
  created_at:         string
  updated_at:         string
  raw_data:           Record<string, unknown>
}

export type ClientContractEstado = 'descubierta' | 'favorita' | 'descartada' | 'presentada'

// ── Inbox view (client_contracts JOIN placsp_contracts) ───────────────────────

export interface PlacspInboxItem {
  client_contract_id: string
  contract_id:        string
  estado:             ClientContractEstado
  matched_cpvs:       string[]
  discovered_at:      string
  canonical_id:       string
  titulo:             string
  organismo:          string
  objeto:             string | null
  presupuesto:        number
  plazo:              string | null
  fecha_publicacion:  string | null
  cpvs:               string[]
}

// ── Service params / results ──────────────────────────────────────────────────

export interface PlacspSearchParams {
  cpvs:      string[]
  fromDate?: string
  toDate?:   string
}

export interface FetchResult {
  entries:     ParsedEntry[]
  downloaded:  number
  parseErrors: number
}

export interface CpvFilter {
  id:      string
  user_id: string
  nombre:  string
  cliente: string
  cpvs:    string[]
  activo:  boolean
}

export interface SyncResult {
  status:             'success' | 'error' | 'no_filters'
  downloaded:         number
  validated:          number
  matched:            number
  inserted:           number
  updated:            number
  duplicates:         number
  duration:           number
  fallbackIdentities: number
  error?:             string
}
