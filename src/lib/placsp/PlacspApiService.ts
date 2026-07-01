import { XMLParser } from 'fast-xml-parser'
import type { FetchResult, ParsedEntry, PlacspSearchParams } from './types'

const FEED_URL  = 'https://contrataciondelestado.es/sindicacion/sindicacion_1016/licitacionesPerfilesContratanteCompleto3.atom'
const MAX_BYTES = 5 * 1024 * 1024
const TIMEOUT   = 15_000

// Outer ATOM parser — keeps namespace prefixes intact
const atomParser = new XMLParser({
  ignoreAttributes:   false,
  attributeNamePrefix:'@_',
  isArray:            (n) => n === 'entry',
  parseTagValue:      false,
})

// Inner Codice/UBL parser — strips namespace prefixes (cbc:, cac:, etc.)
// so elements are addressable without prefix: ContractFolderID, Name, etc.
const codiceParser = new XMLParser({
  ignoreAttributes:   false,
  attributeNamePrefix:'@_',
  removeNSPrefix:     true,
  isArray:            (n) => ['RequiredCommodityClassification', 'PartyIdentification'].includes(n),
  parseTagValue:      false,
})

/**
 * Responsabilidad única: hablar con PLACSP.
 * No conoce usuarios, Supabase ni estados del sistema.
 *
 * NOTA SOBRE ESTRUCTURA XML:
 * El feed sindicacion_1016 (ATOM 1.0) puede incluir el XML Codice/UBL dentro
 * de <summary type="text/xml"> o <content>, o bien texto plano/HTML.
 * El parser intenta primero extracción Codice y cae back a texto.
 * El campo rawData siempre guarda la entrada cruda para depurar los paths
 * cuando se tenga acceso directo al feed desde una IP española.
 */
export const PLACSP_FEED_URL = FEED_URL

export class PlacspApiService {
  /** feedXml: XML pre-fetched by the browser (bypasses geo-restriction). */
  async search(params: PlacspSearchParams, feedXml?: string): Promise<FetchResult> {
    const xml      = feedXml ?? await this.fetchFeed()
    const atomRows = this.parseAtom(xml)

    let parseErrors = 0
    const entries: ParsedEntry[] = []
    for (const raw of atomRows) {
      try {
        const e = this.parseEntry(raw as Record<string, unknown>)
        e ? entries.push(e) : parseErrors++
      } catch { parseErrors++ }
    }

    // Client-side CPV filter (future: pass to PLACSP API natively when supported)
    const cpvSet  = new Set(params.cpvs)
    const filtered = cpvSet.size > 0
      ? entries.filter((e) => e.cpvs.some((c) => cpvSet.has(c)))
      : entries

    return { entries: filtered, downloaded: atomRows.length, parseErrors }
  }

  // ── HTTP ─────────────────────────────────────────────────────────────────────

  private async fetchFeed(): Promise<string> {
    const ctrl    = new AbortController()
    const timerId = setTimeout(() => ctrl.abort(), TIMEOUT)
    try {
      const res = await fetch(FEED_URL, {
        headers: { Accept: 'application/atom+xml, application/xml, text/xml' },
        signal:  ctrl.signal,
        next:    { revalidate: 300 },
      })
      if (!res.ok) throw new Error(`PLACSP HTTP ${res.status}`)
      const cl = res.headers.get('content-length')
      if (cl && +cl > MAX_BYTES) throw new Error('Feed PLACSP demasiado grande')
      const text = await res.text()
      if (text.length > MAX_BYTES) throw new Error('Feed PLACSP demasiado grande')
      return text
    } catch (err) {
      throw new Error(
        err instanceof Error && err.name === 'AbortError'
          ? `Timeout PLACSP (${TIMEOUT / 1000}s)`
          : String(err)
      )
    } finally {
      clearTimeout(timerId)
    }
  }

  // ── ATOM parsing ──────────────────────────────────────────────────────────────

  private parseAtom(xml: string): unknown[] {
    const doc  = atomParser.parse(xml)
    const feed = doc?.feed ?? doc?.['atom:feed'] ?? doc ?? {}
    const raw  = feed?.entry ?? feed?.['atom:entry'] ?? []
    return Array.isArray(raw) ? raw : raw ? [raw] : []
  }

  private parseEntry(e: Record<string, unknown>): ParsedEntry | null {
    const atomId = this.str(e.id ?? e['atom:id'])
    if (!atomId) return null

    const idEvolucion = this.extractIdEvolucion(atomId)
    const summaryRaw  = e.summary ?? e['atom:summary'] ?? e.content ?? e['atom:content']
    const rawData     = e as Record<string, unknown>

    // Path 1: try Codice/UBL XML embedded in summary/content
    const codice = this.tryParseCodice(summaryRaw)
    if (codice) return this.fromCodice(atomId, idEvolucion, codice, rawData)

    // Path 2: extract from title + summary text
    const title   = this.str(e.title ?? e['atom:title']) ?? ''
    const summary = this.str(summaryRaw) ?? ''
    return this.fromText(atomId, idEvolucion, title, summary, rawData)
  }

  // ── Codice/UBL path ───────────────────────────────────────────────────────────

  private tryParseCodice(raw: unknown): Record<string, unknown> | null {
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
      return raw as Record<string, unknown>   // already parsed by outer atomParser
    }
    if (typeof raw === 'string') {
      const decoded = raw
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&')
        .replace(/&quot;/g, '"').replace(/&apos;/g, "'").trim()
      if (!decoded.startsWith('<')) return null
      try { return codiceParser.parse(decoded) as Record<string, unknown> } catch { return null }
    }
    return null
  }

  private fromCodice(
    atomId: string, idEvolucion: string | null,
    doc: Record<string, unknown>, rawData: Record<string, unknown>
  ): ParsedEntry {
    const root   = this.findRoot(doc)
    const project = this.nested(root, 'ProcurementProject')
    return {
      atomId, idEvolucion, rawData,
      contractFolderId:  this.str(root?.ContractFolderID) ?? null,
      dir3:              this.extractDir3(root),
      organismo:         this.extractOrganismo(root),
      titulo:            this.str(project?.Name) ?? this.str(root?.Name) ?? 'Sin título',
      objeto:            this.str(project?.Description) ?? null,
      presupuesto:       this.extractAmount(project ?? root),
      plazo:             this.toDate(this.str(this.nested(root, 'TenderSubmissionDeadlinePeriod')?.EndDate)),
      fechaPublicacion:  this.toDate(this.str(root?.IssueDate)),
      cpvs:              this.extractCpvsCodice(root),
    }
  }

  private findRoot(doc: Record<string, unknown>): Record<string, unknown> {
    for (const k of ['ContractNotice','ContractAwardNotice','PriorInformationNotice','ContractFolderStatus']) {
      if (doc[k] && typeof doc[k] === 'object') return doc[k] as Record<string, unknown>
    }
    return doc
  }

  private extractDir3(root: Record<string, unknown> | null): string | null {
    const party = this.nested(this.nested(root, 'ContractingParty'), 'Party')
    for (const pid of this.list(party, 'PartyIdentification')) {
      const idF = (pid as Record<string, unknown>)?.ID
      if (!idF) continue
      if (typeof idF === 'string') return idF
      const o = idF as Record<string, unknown>
      const v = this.str(o['#text'] ?? o._)
      if (v) return v
    }
    return null
  }

  private extractOrganismo(root: Record<string, unknown> | null): string {
    const name = this.nested(
      this.nested(this.nested(root, 'ContractingParty'), 'Party'), 'PartyName'
    )
    return this.str(name?.Name) ?? 'Organismo desconocido'
  }

  private extractAmount(node: Record<string, unknown> | null): number {
    if (!node) return 0
    for (const k of ['BudgetAmount.TotalAmount', 'EstimatedOverallContractAmount', 'TotalAmount']) {
      const val = k.split('.').reduce<unknown>((a, p) => (a as Record<string,unknown>)?.[p], node)
      const n   = parseFloat(String(val ?? '').replace(/[^\d.,]/g, '').replace(',', '.'))
      if (!isNaN(n) && n > 0) return n
    }
    return 0
  }

  private extractCpvsCodice(root: Record<string, unknown> | null): string[] {
    const items = this.list(root, 'RequiredCommodityClassification')
    const codes = items
      .map((i) => this.str((i as Record<string, unknown>)?.ItemClassificationCode))
      .filter((c): c is string => !!c && /^\d{8}-\d$/.test(c))
    return Array.from(new Set(codes))
  }

  // ── Text fallback path ────────────────────────────────────────────────────────
  // Used when the feed does not embed Codice/UBL XML (plain text or HTML summary).
  // Regex is acceptable here because the input is free text, not XML.

  private fromText(
    atomId: string, idEvolucion: string | null,
    title: string, summary: string, rawData: Record<string, unknown>
  ): ParsedEntry {
    const full = `${title}\n${summary}`
    const cpvMatches = full.match(/\b\d{8}-\d\b/g) ?? []
    return {
      atomId, idEvolucion, rawData,
      contractFolderId: this.textField(full, ['Expediente:', 'Nº expediente:', 'Número de expediente:']),
      dir3:             null,
      titulo:           title || 'Sin título',
      organismo:        this.textField(full, ['Nombre del órgano de contratación:', 'Organismo:', 'Entidad:']) ?? 'Organismo desconocido',
      objeto:           this.textField(full, ['Objeto del contrato:', 'Descripción:', 'Objeto:']),
      presupuesto:      this.amountFromText(full),
      plazo:            this.dateFromText(full),
      fechaPublicacion: null,
      cpvs:             Array.from(new Set(cpvMatches)),
    }
  }

  private textField(text: string, markers: string[]): string | null {
    for (const m of markers) {
      const idx = text.indexOf(m)
      if (idx === -1) continue
      const line = text.slice(idx + m.length, idx + m.length + 200).split('\n')[0].trim()
      if (line) return line.slice(0, 150)
    }
    return null
  }

  private amountFromText(text: string): number {
    const m = text.match(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?)\s*€/)
    return m ? parseFloat(m[1].replace(/\./g, '').replace(',', '.')) || 0 : 0
  }

  private dateFromText(text: string): string | null {
    const m = text.match(/(\d{2})\/(\d{2})\/(\d{4})/)
    return m ? `${m[3]}-${m[2]}-${m[1]}` : null
  }

  // ── Utilities ─────────────────────────────────────────────────────────────────

  private extractIdEvolucion(atomId: string): string | null {
    try { return new URL(atomId).searchParams.get('idEvolucion') } catch { /**/ }
    return atomId.split('idEvolucion=')[1]?.split('&')[0] ?? null
  }

  /** Safely coerce an unknown value to a trimmed non-empty string. */
  private str(v: unknown): string | null {
    if (typeof v === 'string') return v.trim() || null
    if (typeof v === 'number') return String(v)
    if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>
      return this.str(o['#text'] ?? o._ ?? o['@_value'])
    }
    return null
  }

  /** Get a single nested object by key (arrays yield first element). */
  private nested(p: Record<string, unknown> | null | undefined, k: string): Record<string, unknown> | null {
    if (!p) return null
    const v = p[k]
    if (!v || typeof v !== 'object') return null
    return Array.isArray(v) ? (v[0] as Record<string, unknown>) ?? null : v as Record<string, unknown>
  }

  /** Get an array value, normalising single objects to [object]. */
  private list(p: Record<string, unknown> | null | undefined, k: string): unknown[] {
    if (!p) return []
    const v = p[k]
    if (Array.isArray(v)) return v
    return v && typeof v === 'object' ? [v] : []
  }

  private toDate(s: string | null | undefined): string | null {
    if (!s) return null
    const t = s.trim()
    if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t
    if (t.length >= 10 && t[4] === '-') return t.slice(0, 10)
    return null
  }
}
