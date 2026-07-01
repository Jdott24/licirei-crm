import type { ParsedEntry, IdentityResult } from './types'

/**
 * Responsabilidad única: derivar el canonical_id de una licitación.
 *
 * Level 1 (canonical):  DIR3 + ContractFolderID → 'pcsp:{DIR3}:{folderId}'
 *   Permanece estable a través de todas las evoluciones (enmiendas, prórrogas,
 *   adjudicaciones). DIR3 es el código permanente asignado por el Ministerio de
 *   Hacienda a cada órgano contratante. ContractFolderID es único dentro del
 *   organismo. Su combinación garantiza unicidad global en el sector público español.
 *
 * Level 2 (fallback):   idEvolucion → 'evol:{idEvolucion}'
 *   Identifica una evolución concreta, no la licitación. El mismo expediente
 *   puede generar múltiples evolucionIds a lo largo de su ciclo de vida.
 *   Se usa cuando el feed no incluye Codice/UBL estructurado con DIR3 y folderId.
 *   Confidence: 'fallback'. Registrado en SyncResult.fallbackIdentities para
 *   monitorizar la calidad del parser a medida que evoluciona.
 */
export class PlacspIdentityService {
  derive(entry: ParsedEntry): IdentityResult {
    if (entry.dir3 && entry.contractFolderId) {
      return {
        canonicalId: this.level1(entry.dir3, entry.contractFolderId),
        confidence:  'canonical',
        source:      'dir3+contractFolderID',
      }
    }

    return {
      canonicalId: `evol:${entry.idEvolucion ?? this.atomSegment(entry.atomId)}`,
      confidence:  'fallback',
      source:      'idEvolucion',
    }
  }

  private level1(dir3: string, folderId: string): string {
    return `pcsp:${dir3.trim().toUpperCase()}:${folderId.trim().toUpperCase()}`
  }

  /** Extracts the most specific segment of the atom URI to use as last resort. */
  private atomSegment(atomId: string): string {
    return atomId.split('=').pop()?.split('&')[0]?.slice(0, 60) ?? atomId.slice(-40)
  }
}
