import type { SupabaseClient } from '@supabase/supabase-js'
import type {
  CpvFilter, NormalizedContract, PlacspContract, PlacspInboxItem, ClientContractEstado,
} from './types'

/**
 * Responsabilidad única: leer y escribir en placsp_contracts y client_contracts.
 * No parsea XML, no hace llamadas HTTP, no conoce usuarios fuera de las firmas explícitas.
 */
export class PlacspRepository {

  async getActiveCpvFilters(userId: string, db: SupabaseClient): Promise<CpvFilter[]> {
    const { data, error } = await db
      .from('cpv_filters')
      .select('*')
      .eq('user_id', userId)
      .eq('activo', true)
    if (error) throw new Error(`getActiveCpvFilters: ${error.message}`)
    return data ?? []
  }

  async getExistingByCanonicalIds(
    ids: string[],
    db: SupabaseClient
  ): Promise<Map<string, PlacspContract>> {
    if (!ids.length) return new Map()
    const { data, error } = await db
      .from('placsp_contracts')
      .select('*')
      .in('canonical_id', ids)
    if (error) throw new Error(`getExistingByCanonicalIds: ${error.message}`)
    return new Map((data ?? []).map((c: PlacspContract) => [c.canonical_id, c]))
  }

  async insertContracts(contracts: NormalizedContract[], db: SupabaseClient): Promise<PlacspContract[]> {
    if (!contracts.length) return []
    const rows = contracts.map((c) => ({
      canonical_id:       c.canonicalId,
      atom_id:            c.atomId,
      id_evolucion:       c.idEvolucion,
      contract_folder_id: c.contractFolderId,
      dir3:               c.dir3,
      titulo:             c.titulo,
      organismo:          c.organismo,
      objeto:             c.objeto,
      presupuesto:        c.presupuesto,
      plazo:              c.plazo,
      fecha_publicacion:  c.fechaPublicacion,
      cpvs:               c.cpvs,
      last_seen_at:       new Date().toISOString(),
      raw_data:           c.rawData,
    }))
    const { data, error } = await db.from('placsp_contracts').insert(rows).select()
    if (error) throw new Error(`insertContracts: ${error.message}`)
    return (data ?? []) as PlacspContract[]
  }

  async updateContract(id: string, c: NormalizedContract, db: SupabaseClient): Promise<void> {
    const { error } = await db
      .from('placsp_contracts')
      .update({
        atom_id:      c.atomId,
        id_evolucion: c.idEvolucion,
        titulo:       c.titulo,
        organismo:    c.organismo,
        objeto:       c.objeto,
        presupuesto:  c.presupuesto,
        plazo:        c.plazo,
        cpvs:         c.cpvs,
        raw_data:     c.rawData,
        last_seen_at: new Date().toISOString(),
      })
      .eq('id', id)
    if (error) throw new Error(`updateContract: ${error.message}`)
    // version_count and updated_at are managed by DB triggers
  }

  /** Idempotent: ON CONFLICT (user_id, contract_id) DO NOTHING */
  async insertClientContracts(
    userId: string,
    relations: { contractId: string; matchedCpvs: string[] }[],
    db: SupabaseClient
  ): Promise<void> {
    if (!relations.length) return
    const rows = relations.map((r) => ({
      user_id:      userId,
      contract_id:  r.contractId,
      matched_cpvs: r.matchedCpvs,
      estado:       'descubierta' as ClientContractEstado,
    }))
    const { error } = await db
      .from('client_contracts')
      .upsert(rows, { onConflict: 'user_id,contract_id', ignoreDuplicates: true })
    if (error) throw new Error(`insertClientContracts: ${error.message}`)
  }

  async getInbox(userId: string, db: SupabaseClient): Promise<PlacspInboxItem[]> {
    const { data, error } = await db
      .from('client_contracts')
      .select(`
        id, contract_id, estado, matched_cpvs, created_at,
        placsp_contracts!inner(
          canonical_id, titulo, organismo, objeto,
          presupuesto, plazo, fecha_publicacion, cpvs
        )
      `)
      .eq('user_id', userId)
      .eq('estado', 'descubierta')
      .order('created_at', { ascending: false })
    if (error) throw new Error(`getInbox: ${error.message}`)

    return (data ?? []).map((row) => {
      const pc = (row as Record<string, unknown>).placsp_contracts as Record<string, unknown>
      return {
        client_contract_id: row.id as string,
        contract_id:        row.contract_id as string,
        estado:             row.estado as ClientContractEstado,
        matched_cpvs:       (row.matched_cpvs as string[]) ?? [],
        discovered_at:      row.created_at as string,
        canonical_id:       pc.canonical_id as string,
        titulo:             pc.titulo as string,
        organismo:          pc.organismo as string,
        objeto:             (pc.objeto as string) ?? null,
        presupuesto:        (pc.presupuesto as number) ?? 0,
        plazo:              (pc.plazo as string) ?? null,
        fecha_publicacion:  (pc.fecha_publicacion as string) ?? null,
        cpvs:               (pc.cpvs as string[]) ?? [],
      } satisfies PlacspInboxItem
    })
  }
}
