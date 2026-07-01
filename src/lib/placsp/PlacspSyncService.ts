import type { SupabaseClient } from '@supabase/supabase-js'
import type { NormalizedContract, PlacspContract, SyncResult } from './types'
import { PlacspApiService }      from './PlacspApiService'
import { PlacspIdentityService } from './PlacspIdentityService'
import { PlacspRepository }      from './PlacspRepository'

/**
 * Responsabilidad única: orquestar la sincronización PLACSP para un usuario.
 * Desacoplado de HTTP y de Supabase directamente — recibe ambas dependencias.
 * Puede invocarse desde: API route, cron job, queue worker o tests.
 *
 * Pipeline:
 *   FETCH → IDENTITY → VALIDATE → FILTER → DEDUPLICATE →
 *   UPDATE EXISTING → CREATE NEW → CREATE USER RELATIONS → RETURN SyncResult
 */
export class PlacspSyncService {
  private readonly api      = new PlacspApiService()
  private readonly identity = new PlacspIdentityService()
  private readonly repo     = new PlacspRepository()

  async syncForUser(userId: string, db: SupabaseClient): Promise<SyncResult> {
    const start = Date.now()
    try {
      return await this.run(userId, db, start)
    } catch (err) {
      return this.build('error', start, { error: err instanceof Error ? err.message : String(err) })
    }
  }

  private async run(userId: string, db: SupabaseClient, start: number): Promise<SyncResult> {
    // ── FETCH ─────────────────────────────────────────────────────────────────
    const filters = await this.repo.getActiveCpvFilters(userId, db)
    if (!filters.length) return this.build('no_filters', start, {})

    const userCpvs = Array.from(new Set(filters.flatMap((f) => f.cpvs)))
    const { entries, downloaded } = await this.api.search({ cpvs: userCpvs })

    // ── IDENTITY ──────────────────────────────────────────────────────────────
    const withIdentity: NormalizedContract[] = entries.map((e) => {
      const id = this.identity.derive(e)
      return { ...e, canonicalId: id.canonicalId, identity: id }
    })

    // ── VALIDATE ──────────────────────────────────────────────────────────────
    const validated = withIdentity.filter(this.isValid)

    // ── FILTER by user CPVs ───────────────────────────────────────────────────
    const cpvSet  = new Set(userCpvs)
    const matched = validated.filter((c) => c.cpvs.some((cpv) => cpvSet.has(cpv)))
    if (!matched.length) {
      return this.build('success', start, { downloaded, validated: validated.length, matched: 0 })
    }

    // ── DEDUPLICATE ───────────────────────────────────────────────────────────
    const existingMap = await this.repo.getExistingByCanonicalIds(
      matched.map((c) => c.canonicalId),
      db
    )
    const toInsert = matched.filter((c) => !existingMap.has(c.canonicalId))
    const toUpdate = matched.filter((c) =>  existingMap.has(c.canonicalId))

    // ── UPDATE EXISTING ───────────────────────────────────────────────────────
    let updated = 0
    for (const c of toUpdate) {
      if (this.hasChanges(existingMap.get(c.canonicalId)!, c)) {
        await this.repo.updateContract(existingMap.get(c.canonicalId)!.id, c, db)
        updated++
      }
    }

    // ── CREATE NEW ────────────────────────────────────────────────────────────
    const inserted = await this.repo.insertContracts(toInsert, db)

    // ── CREATE USER RELATIONS ─────────────────────────────────────────────────
    const insertedById = new Map(inserted.map((c) => [c.canonical_id, c.id]))
    const relations = matched.map((c) => ({
      contractId:  insertedById.get(c.canonicalId) ?? existingMap.get(c.canonicalId)!.id,
      matchedCpvs: c.cpvs.filter((cpv) => cpvSet.has(cpv)),
    }))
    await this.repo.insertClientContracts(userId, relations, db)

    return this.build('success', start, {
      downloaded,
      validated:          validated.length,
      matched:            matched.length,
      inserted:           inserted.length,
      updated,
      duplicates:         toUpdate.length - updated,
      fallbackIdentities: withIdentity.filter((c) => c.identity.confidence === 'fallback').length,
    })
  }

  private isValid(c: NormalizedContract): boolean {
    return !!(c.atomId && c.titulo && c.titulo !== 'Sin título' && c.canonicalId && c.cpvs.length > 0)
  }

  private hasChanges(existing: PlacspContract, incoming: NormalizedContract): boolean {
    return (
      existing.id_evolucion !== incoming.idEvolucion ||
      existing.presupuesto  !== incoming.presupuesto  ||
      existing.plazo        !== incoming.plazo         ||
      existing.organismo    !== incoming.organismo     ||
      existing.objeto       !== incoming.objeto        ||
      existing.titulo       !== incoming.titulo
    )
  }

  private build(status: SyncResult['status'], start: number, fields: Partial<SyncResult>): SyncResult {
    return {
      status,
      downloaded:         0,
      validated:          0,
      matched:            0,
      inserted:           0,
      updated:            0,
      duplicates:         0,
      duration:           Date.now() - start,
      fallbackIdentities: 0,
      ...fields,
    }
  }
}
