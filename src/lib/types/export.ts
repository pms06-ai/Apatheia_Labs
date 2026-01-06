/**
 * Export System TypeScript Types
 *
 * Type definitions for evidence export functionality including
 * PDF/Word generation, legal citations, audit trails, and methodology statements.
 *
 * Based on CONTRACT.ts patterns and database schema.
 */

import type {
  Case,
  Document,
  Entity,
  Finding,
  Contradiction,
  Omission,
  Severity,
  Engine,
  DocType,
} from '@/CONTRACT'

// ============================================
// EXPORT FORMAT TYPES
// ============================================

/** Supported export file formats */
export type ExportFormat = 'pdf' | 'docx'

/** Export status tracking */
export type ExportStatus = 'idle' | 'preparing' | 'generating' | 'completed' | 'failed'

// ============================================
// CITATION TYPES
// ============================================

/** Legal citation style formats */
export type CitationStyle = 'bluebook' | 'oscola' | 'neutral'

/** A formatted legal citation reference */
export interface Citation {
  /** Full formatted citation string */
  formatted: string
  /** Document being cited */
  documentId: string
  /** Document filename/title */
  documentName: string
  /** Page number(s) referenced */
  pageNumber: number | null
  /** Specific paragraph/section reference */
  paragraph?: string
  /** Date of document */
  documentDate?: string
  /** Document type for citation formatting */
  docType: DocType | null
}

/** Citation formatting options */
export interface CitationOptions {
  /** Citation style to use */
  style: CitationStyle
  /** Include document date in citation */
  includeDate: boolean
  /** Include paragraph/section references */
  includeParagraph: boolean
  /** Use short form for repeated citations */
  useShortForm: boolean
}

// ============================================
// QUOTE TYPES
// ============================================

/** An exact quote from a source document */
export interface DocumentQuote {
  /** The exact quoted text */
  text: string
  /** Source document ID */
  documentId: string
  /** Page number of quote */
  pageNumber: number | null
  /** Formatted citation for this quote */
  citation: Citation
  /** Character offset in document (for precision) */
  charOffset?: number
  /** Character length of quote */
  charLength?: number
  /** Whether the quote was truncated */
  truncated: boolean
  /** Context before the quote */
  contextBefore?: string
  /** Context after the quote */
  contextAfter?: string
}

/** Maximum characters for a quote before truncation */
export const MAX_QUOTE_LENGTH = 2000

/** Truncation indicator */
export const TRUNCATION_INDICATOR = '[...]'

// ============================================
// AUDIT TRAIL TYPES
// ============================================

/** Types of audit trail steps */
export type AuditStepType =
  | 'source_identification'
  | 'evidence_extraction'
  | 'analysis_performed'
  | 'contradiction_detected'
  | 'conclusion_reached'
  | 'verification_step'

/** A single step in the audit trail */
export interface AuditTrailStep {
  /** Unique identifier for this step */
  id: string
  /** Type of audit step */
  stepType: AuditStepType
  /** Timestamp of the step */
  timestamp: string
  /** Description of what occurred */
  description: string
  /** Source documents involved */
  sourceDocumentIds: string[]
  /** Entities involved */
  entityIds: string[]
  /** Engine that produced this step */
  engine: Engine | null
  /** Confidence level of this step */
  confidence: number | null
  /** Evidence supporting this step */
  evidence: DocumentQuote[]
  /** Reference to previous step(s) */
  previousStepIds: string[]
}

/** Complete audit trail for a finding/conclusion */
export interface AuditTrail {
  /** The finding/conclusion this trail supports */
  findingId: string
  /** Ordered steps from source to conclusion */
  steps: AuditTrailStep[]
  /** Summary of the reasoning chain */
  summary: string
  /** Total confidence score */
  overallConfidence: number
}

// ============================================
// METHODOLOGY TYPES
// ============================================

/** Analysis methodology statement */
export interface MethodologyStatement {
  /** Title of the methodology section */
  title: string
  /** Introduction/overview */
  introduction: string
  /** Data sources used */
  dataSources: DataSourceDescription[]
  /** Analysis engines/methods applied */
  analysisMethods: AnalysisMethodDescription[]
  /** Confidence level explanation */
  confidenceExplanation: string
  /** Limitations and caveats */
  limitations: string[]
  /** Version/date of methodology */
  version: string
  /** Last updated timestamp */
  lastUpdated: string
}

/** Description of a data source */
export interface DataSourceDescription {
  /** Type of source */
  sourceType: string
  /** Description of the source */
  description: string
  /** Number of documents from this source */
  documentCount: number
  /** Date range of documents */
  dateRange?: {
    earliest: string
    latest: string
  }
}

/** Description of an analysis method */
export interface AnalysisMethodDescription {
  /** Engine/method name */
  engine: Engine
  /** Human-readable name */
  displayName: string
  /** Description of what this method does */
  description: string
  /** What this method detects/produces */
  outputTypes: string[]
}

// ============================================
// EXPORT DATA STRUCTURES
// ============================================

/** Summary statistics for the export */
export interface ExportSummary {
  /** Case reference */
  caseReference: string
  /** Case name */
  caseName: string
  /** Export generation timestamp */
  generatedAt: string
  /** Total documents analyzed */
  documentCount: number
  /** Total findings */
  findingCount: number
  /** Total contradictions */
  contradictionCount: number
  /** Total entities identified */
  entityCount: number
  /** Findings by severity */
  findingsBySeverity: Record<Severity, number>
  /** Findings by engine */
  findingsByEngine: Record<Engine, number>
}

/** A finding prepared for export */
export interface ExportFinding {
  /** Original finding data */
  finding: Finding
  /** Formatted citations for this finding */
  citations: Citation[]
  /** Supporting quotes */
  quotes: DocumentQuote[]
  /** Related entities */
  relatedEntities: Entity[]
  /** Related documents */
  relatedDocuments: Document[]
  /** Audit trail for this finding */
  auditTrail: AuditTrail | null
}

/** A contradiction prepared for export */
export interface ExportContradiction {
  /** Original contradiction data */
  contradiction: Contradiction
  /** Citation for source A */
  sourceACitation: Citation
  /** Citation for source B */
  sourceBCitation: Citation
  /** Quote from source A */
  sourceAQuote: DocumentQuote
  /** Quote from source B */
  sourceBQuote: DocumentQuote
  /** Entity from source A */
  sourceAEntity: Entity | null
  /** Entity from source B */
  sourceBEntity: Entity | null
  /** Document from source A */
  sourceADocument: Document | null
  /** Document from source B */
  sourceBDocument: Document | null
}

/** An entity prepared for export with references */
export interface ExportEntity {
  /** Original entity data */
  entity: Entity
  /** Documents referencing this entity */
  documentReferences: Array<{
    document: Document
    pageNumbers: number[]
    mentionCount: number
  }>
  /** Findings involving this entity */
  relatedFindings: Finding[]
  /** Contradictions involving this entity */
  relatedContradictions: Contradiction[]
}

/** Section of the export document */
export interface ExportSection {
  /** Section identifier */
  id: string
  /** Section title */
  title: string
  /** Whether to include this section */
  included: boolean
  /** Order in document */
  order: number
}

/** Complete export data package */
export interface ExportData {
  /** Export metadata */
  metadata: {
    exportId: string
    format: ExportFormat
    generatedAt: string
    generatedBy: string
    version: string
  }
  /** Case information */
  case: Case
  /** Summary statistics */
  summary: ExportSummary
  /** Prepared findings */
  findings: ExportFinding[]
  /** Prepared contradictions */
  contradictions: ExportContradiction[]
  /** Prepared entities */
  entities: ExportEntity[]
  /** Omissions detected */
  omissions: Omission[]
  /** All source documents */
  documents: Document[]
  /** Methodology statement */
  methodology: MethodologyStatement
  /** Complete audit trails */
  auditTrails: AuditTrail[]
}

// ============================================
// EXPORT OPTIONS
// ============================================

/** Default sections for export */
export const DEFAULT_EXPORT_SECTIONS: ExportSection[] = [
  { id: 'cover', title: 'Cover Page', included: true, order: 1 },
  { id: 'summary', title: 'Executive Summary', included: true, order: 2 },
  { id: 'methodology', title: 'Methodology', included: true, order: 3 },
  { id: 'findings', title: 'Findings', included: true, order: 4 },
  { id: 'contradictions', title: 'Contradictions', included: true, order: 5 },
  { id: 'entities', title: 'Entity Reference', included: true, order: 6 },
  { id: 'auditTrail', title: 'Audit Trail', included: true, order: 7 },
  { id: 'citations', title: 'Citations & References', included: true, order: 8 },
  { id: 'appendix', title: 'Appendix', included: false, order: 9 },
]

/** User-configurable export options */
export interface ExportOptions {
  /** Export file format */
  format: ExportFormat
  /** Sections to include */
  sections: ExportSection[]
  /** Citation formatting options */
  citationOptions: CitationOptions
  /** Filter findings by minimum severity */
  minSeverity: Severity | null
  /** Filter findings by engine */
  engines: Engine[] | null
  /** Include full audit trails */
  includeAuditTrails: boolean
  /** Include methodology statement */
  includeMethodology: boolean
  /** Maximum findings to include (null = all) */
  maxFindings: number | null
  /** Custom title for the export */
  customTitle?: string
  /** Custom subtitle */
  customSubtitle?: string
  /** Author name for cover page */
  authorName?: string
  /** Include page numbers */
  includePageNumbers: boolean
  /** Include table of contents */
  includeTableOfContents: boolean
  /** Include timestamp watermark */
  includeTimestamp: boolean
}

/** Default export options */
export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  format: 'pdf',
  sections: DEFAULT_EXPORT_SECTIONS,
  citationOptions: {
    style: 'bluebook',
    includeDate: true,
    includeParagraph: false,
    useShortForm: true,
  },
  minSeverity: null,
  engines: null,
  includeAuditTrails: true,
  includeMethodology: true,
  maxFindings: null,
  includePageNumbers: true,
  includeTableOfContents: true,
  includeTimestamp: true,
}

// ============================================
// EXPORT REQUEST/RESPONSE TYPES
// ============================================

/** Request to generate an export */
export interface ExportRequest {
  /** Case ID to export */
  caseId: string
  /** Export options */
  options: ExportOptions
}

/** Result of an export generation */
export interface ExportResult {
  /** Whether export succeeded */
  success: boolean
  /** Generated filename */
  filename: string
  /** File size in bytes */
  fileSize: number
  /** MIME type */
  mimeType: string
  /** Blob data (client-side) */
  blob?: Blob
  /** Buffer data (server-side) */
  buffer?: Uint8Array
  /** Error message if failed */
  error?: string
  /** Generation duration in ms */
  durationMs: number
}

/** Progress update during export generation */
export interface ExportProgress {
  /** Current status */
  status: ExportStatus
  /** Current step description */
  currentStep: string
  /** Progress percentage (0-100) */
  percentage: number
  /** Items processed */
  itemsProcessed: number
  /** Total items to process */
  totalItems: number
}

// ============================================
// ERROR TYPES
// ============================================

/** Export-specific error codes */
export type ExportErrorCode =
  | 'CASE_NOT_FOUND'
  | 'NO_FINDINGS'
  | 'DOCUMENT_MISSING'
  | 'GENERATION_FAILED'
  | 'MEMORY_EXCEEDED'
  | 'TIMEOUT'
  | 'INVALID_OPTIONS'

/** Structured export error */
export interface ExportError {
  /** Error code */
  code: ExportErrorCode
  /** Human-readable message */
  message: string
  /** Additional details */
  details?: Record<string, unknown>
}

// ============================================
// HELPER TYPE GUARDS
// ============================================

/** Type guard for ExportFormat */
export function isExportFormat(value: unknown): value is ExportFormat {
  return value === 'pdf' || value === 'docx'
}

/** Type guard for CitationStyle */
export function isCitationStyle(value: unknown): value is CitationStyle {
  return value === 'bluebook' || value === 'oscola' || value === 'neutral'
}

/** Type guard for ExportErrorCode */
export function isExportErrorCode(value: unknown): value is ExportErrorCode {
  const codes: ExportErrorCode[] = [
    'CASE_NOT_FOUND',
    'NO_FINDINGS',
    'DOCUMENT_MISSING',
    'GENERATION_FAILED',
    'MEMORY_EXCEEDED',
    'TIMEOUT',
    'INVALID_OPTIONS',
  ]
  return typeof value === 'string' && codes.includes(value as ExportErrorCode)
}
