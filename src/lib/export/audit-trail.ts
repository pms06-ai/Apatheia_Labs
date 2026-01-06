/**
 * Audit Trail Generation Logic
 *
 * Generates audit trails that document the analytical reasoning process
 * from source documents to conclusions. Shows evidence → analysis → conclusion flow.
 *
 * Based on patterns from scripts/export-analysis.js and export type definitions.
 */

import type {
  Document,
  Entity,
  Finding,
  Contradiction,
  Engine,
} from '@/CONTRACT'
import type {
  AuditTrail,
  AuditTrailStep,
  AuditStepType,
  DocumentQuote,
  Citation,
} from '@/lib/types/export'
import {
  formatCitation,
  formatQuote,
  createPlaceholderCitation,
} from '@/lib/export/citation-formatter'

// ============================================
// CONSTANTS
// ============================================

/**
 * Human-readable labels for audit step types
 */
export const AUDIT_STEP_LABELS: Record<AuditStepType, string> = {
  source_identification: 'Source Identification',
  evidence_extraction: 'Evidence Extraction',
  analysis_performed: 'Analysis Performed',
  contradiction_detected: 'Contradiction Detected',
  conclusion_reached: 'Conclusion Reached',
  verification_step: 'Verification Step',
}

/**
 * Human-readable labels for analysis engines
 */
export const ENGINE_LABELS: Record<Engine, string> = {
  entity_resolution: 'Entity Resolution',
  temporal_parser: 'Temporal Analysis',
  argumentation: 'Argumentation Analysis',
  bias_detection: 'Bias Detection',
  contradiction: 'Contradiction Detection',
  accountability: 'Accountability Analysis',
  professional_tracker: 'Professional Tracker',
  omission: 'Omission Detection',
  expert_witness: 'Expert Witness Analysis',
  documentary: 'Documentary Analysis',
  narrative: 'Narrative Analysis',
  coordination: 'Coordination Analysis',
  evidence_chain: 'Evidence Chain Analysis',
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Generate a unique step ID for the audit trail
 */
export function generateStepId(prefix: string = 'step'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `${prefix}-${timestamp}-${random}`
}

/**
 * Get the current ISO timestamp
 */
export function getCurrentTimestamp(): string {
  return new Date().toISOString()
}

/**
 * Parse evidence JSON from a finding safely
 */
export function parseEvidenceJson(
  evidence: Record<string, unknown> | string | null | undefined
): {
  quotes: string[]
  documentReferences: Array<{ documentId: string; page?: number }>
  metadata: Record<string, unknown>
} {
  const result = {
    quotes: [] as string[],
    documentReferences: [] as Array<{ documentId: string; page?: number }>,
    metadata: {} as Record<string, unknown>,
  }

  if (!evidence) {
    return result
  }

  let parsed: Record<string, unknown>

  if (typeof evidence === 'string') {
    try {
      parsed = JSON.parse(evidence)
    } catch {
      return result
    }
  } else {
    parsed = evidence
  }

  // Extract quotes
  if (Array.isArray(parsed.quotes)) {
    result.quotes = parsed.quotes.filter(
      (q): q is string => typeof q === 'string'
    )
  }

  // Extract document references
  if (Array.isArray(parsed.documents)) {
    result.documentReferences = parsed.documents
      .filter((d): d is { documentId: string; page?: number } => {
        return (
          d !== null &&
          typeof d === 'object' &&
          typeof (d as Record<string, unknown>).documentId === 'string'
        )
      })
      .map((d) => ({
        documentId: d.documentId,
        page: typeof d.page === 'number' ? d.page : undefined,
      }))
  }

  // Extract single document reference if present
  if (typeof parsed.document_id === 'string') {
    result.documentReferences.push({
      documentId: parsed.document_id,
      page: typeof parsed.page === 'number' ? parsed.page : undefined,
    })
  }

  // Store remaining metadata
  const { quotes, documents, document_id, page, ...rest } = parsed
  result.metadata = rest

  return result
}

/**
 * Calculate overall confidence from multiple steps
 */
export function calculateOverallConfidence(steps: AuditTrailStep[]): number {
  const confidenceValues = steps
    .map((step) => step.confidence)
    .filter((c): c is number => c !== null && c !== undefined)

  if (confidenceValues.length === 0) {
    return 0
  }

  // Use weighted average, giving more weight to conclusion steps
  let weightedSum = 0
  let totalWeight = 0

  for (const step of steps) {
    if (step.confidence === null || step.confidence === undefined) {
      continue
    }

    const weight = step.stepType === 'conclusion_reached' ? 2 : 1
    weightedSum += step.confidence * weight
    totalWeight += weight
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0
}

// ============================================
// AUDIT TRAIL STEP CREATION
// ============================================

/**
 * Create a source identification step
 */
export function createSourceIdentificationStep(
  document: Document,
  description?: string
): AuditTrailStep {
  const citation = formatCitation(document, null)

  return {
    id: generateStepId('src'),
    stepType: 'source_identification',
    timestamp: getCurrentTimestamp(),
    description:
      description ??
      `Source document identified: ${citation.documentName}`,
    sourceDocumentIds: [document.id],
    entityIds: [],
    engine: null,
    confidence: 1.0,
    evidence: [],
    previousStepIds: [],
  }
}

/**
 * Create an evidence extraction step
 */
export function createEvidenceExtractionStep(
  document: Document,
  quotes: string[],
  pageNumber?: number | null,
  previousStepIds: string[] = []
): AuditTrailStep {
  const citation = formatCitation(document, pageNumber ?? null)
  const evidence: DocumentQuote[] = quotes.map((text) =>
    formatQuote(text, citation, { pageNumber })
  )

  return {
    id: generateStepId('evd'),
    stepType: 'evidence_extraction',
    timestamp: getCurrentTimestamp(),
    description: `Extracted ${quotes.length} evidence quote(s) from ${citation.documentName}`,
    sourceDocumentIds: [document.id],
    entityIds: [],
    engine: null,
    confidence: 1.0,
    evidence,
    previousStepIds,
  }
}

/**
 * Create an analysis step
 */
export function createAnalysisStep(
  engine: Engine,
  finding: Finding,
  previousStepIds: string[] = []
): AuditTrailStep {
  const engineLabel = ENGINE_LABELS[engine] ?? engine

  return {
    id: generateStepId('ana'),
    stepType: 'analysis_performed',
    timestamp: getCurrentTimestamp(),
    description: `${engineLabel} engine analyzed evidence: ${finding.title}`,
    sourceDocumentIds: finding.document_ids ?? [],
    entityIds: finding.entity_ids ?? [],
    engine,
    confidence: finding.confidence ?? null,
    evidence: [],
    previousStepIds,
  }
}

/**
 * Create a contradiction detection step
 */
export function createContradictionStep(
  contradiction: Contradiction,
  sourceADocument?: Document | null,
  sourceBDocument?: Document | null,
  previousStepIds: string[] = []
): AuditTrailStep {
  const sourceDocIds: string[] = []
  if (contradiction.source_a_document_id) {
    sourceDocIds.push(contradiction.source_a_document_id)
  }
  if (contradiction.source_b_document_id) {
    sourceDocIds.push(contradiction.source_b_document_id)
  }

  const entityIds: string[] = []
  if (contradiction.source_a_entity_id) {
    entityIds.push(contradiction.source_a_entity_id)
  }
  if (contradiction.source_b_entity_id) {
    entityIds.push(contradiction.source_b_entity_id)
  }

  // Create evidence quotes from contradiction texts
  const evidence: DocumentQuote[] = []

  if (contradiction.source_a_text) {
    const citationA = sourceADocument
      ? formatCitation(sourceADocument, contradiction.source_a_page)
      : createPlaceholderCitation(
          contradiction.source_a_document_id ?? 'unknown',
          'Source A'
        )
    evidence.push(
      formatQuote(contradiction.source_a_text, citationA, {
        pageNumber: contradiction.source_a_page,
      })
    )
  }

  if (contradiction.source_b_text) {
    const citationB = sourceBDocument
      ? formatCitation(sourceBDocument, contradiction.source_b_page)
      : createPlaceholderCitation(
          contradiction.source_b_document_id ?? 'unknown',
          'Source B'
        )
    evidence.push(
      formatQuote(contradiction.source_b_text, citationB, {
        pageNumber: contradiction.source_b_page,
      })
    )
  }

  return {
    id: generateStepId('ctr'),
    stepType: 'contradiction_detected',
    timestamp: getCurrentTimestamp(),
    description: `Contradiction detected: ${contradiction.title}`,
    sourceDocumentIds: sourceDocIds,
    entityIds,
    engine: 'contradiction',
    confidence: 0.85, // Default confidence for contradictions
    evidence,
    previousStepIds,
  }
}

/**
 * Create a conclusion step
 */
export function createConclusionStep(
  finding: Finding,
  summary: string,
  previousStepIds: string[] = []
): AuditTrailStep {
  return {
    id: generateStepId('con'),
    stepType: 'conclusion_reached',
    timestamp: getCurrentTimestamp(),
    description: summary,
    sourceDocumentIds: finding.document_ids ?? [],
    entityIds: finding.entity_ids ?? [],
    engine: finding.engine,
    confidence: finding.confidence ?? null,
    evidence: [],
    previousStepIds,
  }
}

/**
 * Create a verification step
 */
export function createVerificationStep(
  description: string,
  confidence: number,
  previousStepIds: string[] = []
): AuditTrailStep {
  return {
    id: generateStepId('ver'),
    stepType: 'verification_step',
    timestamp: getCurrentTimestamp(),
    description,
    sourceDocumentIds: [],
    entityIds: [],
    engine: null,
    confidence,
    evidence: [],
    previousStepIds,
  }
}

// ============================================
// MAIN AUDIT TRAIL GENERATION
// ============================================

/**
 * Context for building audit trails with document/entity lookups
 */
export interface AuditTrailContext {
  documents: Map<string, Document>
  entities: Map<string, Entity>
}

/**
 * Create an empty audit trail context
 */
export function createAuditTrailContext(
  documents: Document[] = [],
  entities: Entity[] = []
): AuditTrailContext {
  return {
    documents: new Map(documents.map((d) => [d.id, d])),
    entities: new Map(entities.map((e) => [e.id, e])),
  }
}

/**
 * Trace the evidence chain for a single finding.
 * Builds audit trail steps from source documents to the finding conclusion.
 *
 * @param finding - The finding to trace
 * @param context - Document and entity lookup context
 * @returns Array of audit trail steps
 */
export function traceEvidence(
  finding: Finding,
  context: AuditTrailContext
): AuditTrailStep[] {
  const steps: AuditTrailStep[] = []
  const previousStepIds: string[] = []

  // Step 1: Source identification for each document
  const documentIds = finding.document_ids ?? []
  for (const docId of documentIds) {
    const document = context.documents.get(docId)
    if (document) {
      const step = createSourceIdentificationStep(document)
      steps.push(step)
      previousStepIds.push(step.id)
    }
  }

  // Step 2: Evidence extraction from finding evidence
  const evidenceData = parseEvidenceJson(finding.evidence)

  if (evidenceData.quotes.length > 0 && documentIds.length > 0) {
    const primaryDocId = documentIds[0]
    const primaryDoc = context.documents.get(primaryDocId)

    if (primaryDoc) {
      const extractionStep = createEvidenceExtractionStep(
        primaryDoc,
        evidenceData.quotes,
        null,
        previousStepIds
      )
      steps.push(extractionStep)
      previousStepIds.length = 0 // Reset for next chain
      previousStepIds.push(extractionStep.id)
    }
  }

  // Step 3: Analysis step
  const analysisStep = createAnalysisStep(
    finding.engine,
    finding,
    previousStepIds
  )
  steps.push(analysisStep)
  previousStepIds.length = 0
  previousStepIds.push(analysisStep.id)

  // Step 4: Conclusion step
  const conclusionSummary = finding.description
    ? `${finding.title}: ${finding.description}`
    : finding.title

  const conclusionStep = createConclusionStep(
    finding,
    conclusionSummary,
    previousStepIds
  )
  steps.push(conclusionStep)

  return steps
}

/**
 * Build a reasoning chain for a contradiction.
 * Shows how two conflicting sources lead to a detected contradiction.
 *
 * @param contradiction - The contradiction to analyze
 * @param context - Document and entity lookup context
 * @returns Array of audit trail steps
 */
export function buildReasoningChain(
  contradiction: Contradiction,
  context: AuditTrailContext
): AuditTrailStep[] {
  const steps: AuditTrailStep[] = []
  const sourceStepIds: string[] = []

  // Step 1: Source A identification
  if (contradiction.source_a_document_id) {
    const docA = context.documents.get(contradiction.source_a_document_id)
    if (docA) {
      const stepA = createSourceIdentificationStep(
        docA,
        `Source A: ${docA.filename}`
      )
      steps.push(stepA)
      sourceStepIds.push(stepA.id)
    }
  }

  // Step 2: Source B identification
  if (contradiction.source_b_document_id) {
    const docB = context.documents.get(contradiction.source_b_document_id)
    if (docB) {
      const stepB = createSourceIdentificationStep(
        docB,
        `Source B: ${docB.filename}`
      )
      steps.push(stepB)
      sourceStepIds.push(stepB.id)
    }
  }

  // Step 3: Evidence extraction from Source A
  if (contradiction.source_a_text && contradiction.source_a_document_id) {
    const docA = context.documents.get(contradiction.source_a_document_id)
    if (docA) {
      const extractionA = createEvidenceExtractionStep(
        docA,
        [contradiction.source_a_text],
        contradiction.source_a_page,
        [sourceStepIds[0]]
      )
      steps.push(extractionA)
      sourceStepIds[0] = extractionA.id // Update to extraction step
    }
  }

  // Step 4: Evidence extraction from Source B
  if (contradiction.source_b_text && contradiction.source_b_document_id) {
    const docB = context.documents.get(contradiction.source_b_document_id)
    if (docB) {
      const extractionB = createEvidenceExtractionStep(
        docB,
        [contradiction.source_b_text],
        contradiction.source_b_page,
        [sourceStepIds.length > 1 ? sourceStepIds[1] : sourceStepIds[0]]
      )
      steps.push(extractionB)
      if (sourceStepIds.length > 1) {
        sourceStepIds[1] = extractionB.id
      } else {
        sourceStepIds.push(extractionB.id)
      }
    }
  }

  // Step 5: Contradiction detection step
  const docA = contradiction.source_a_document_id
    ? context.documents.get(contradiction.source_a_document_id)
    : null
  const docB = contradiction.source_b_document_id
    ? context.documents.get(contradiction.source_b_document_id)
    : null

  const contradictionStep = createContradictionStep(
    contradiction,
    docA,
    docB,
    sourceStepIds
  )
  steps.push(contradictionStep)

  // Step 6: Verification/conclusion step
  const severityLabel = contradiction.severity
    ? `[${contradiction.severity.toUpperCase()}]`
    : ''
  const typeLabel = contradiction.contradiction_type
    ? ` (${contradiction.contradiction_type})`
    : ''

  const verificationStep = createVerificationStep(
    `Contradiction verified ${severityLabel}${typeLabel}: ${contradiction.description ?? contradiction.title}`,
    0.85,
    [contradictionStep.id]
  )
  steps.push(verificationStep)

  return steps
}

/**
 * Generate a complete audit trail for a finding.
 * Combines evidence tracing with a summary.
 *
 * @param finding - The finding to generate audit trail for
 * @param context - Document and entity lookup context
 * @returns Complete AuditTrail object
 */
export function generateAuditTrail(
  finding: Finding,
  context: AuditTrailContext
): AuditTrail {
  const steps = traceEvidence(finding, context)
  const overallConfidence = calculateOverallConfidence(steps)

  // Generate summary
  const engineLabel = ENGINE_LABELS[finding.engine] ?? finding.engine
  const severityLabel = finding.severity
    ? ` [${finding.severity.toUpperCase()}]`
    : ''

  const summary = `${engineLabel} analysis identified: ${finding.title}${severityLabel}. ` +
    `Evidence traced from ${steps.filter((s) => s.stepType === 'source_identification').length} source document(s) ` +
    `through ${steps.filter((s) => s.stepType === 'evidence_extraction').length} extraction(s) ` +
    `to conclusion with ${(overallConfidence * 100).toFixed(0)}% confidence.`

  return {
    findingId: finding.id,
    steps,
    summary,
    overallConfidence,
  }
}

/**
 * Generate audit trails for multiple findings
 *
 * @param findings - Array of findings
 * @param context - Document and entity lookup context
 * @returns Array of AuditTrail objects
 */
export function generateAuditTrails(
  findings: Finding[],
  context: AuditTrailContext
): AuditTrail[] {
  return findings.map((finding) => generateAuditTrail(finding, context))
}

/**
 * Generate an audit trail for a contradiction
 *
 * @param contradiction - The contradiction to generate audit trail for
 * @param context - Document and entity lookup context
 * @returns AuditTrail object for the contradiction
 */
export function generateContradictionAuditTrail(
  contradiction: Contradiction,
  context: AuditTrailContext
): AuditTrail {
  const steps = buildReasoningChain(contradiction, context)
  const overallConfidence = calculateOverallConfidence(steps)

  const typeLabel = contradiction.contradiction_type ?? 'direct'
  const severityLabel = contradiction.severity
    ? ` [${contradiction.severity.toUpperCase()}]`
    : ''

  const summary = `${typeLabel.charAt(0).toUpperCase() + typeLabel.slice(1)} contradiction${severityLabel} detected: ` +
    `${contradiction.title}. Reasoning chain from ${steps.filter((s) => s.stepType === 'source_identification').length} source(s) ` +
    `established with ${(overallConfidence * 100).toFixed(0)}% confidence.`

  return {
    findingId: contradiction.id, // Using contradiction ID as finding reference
    steps,
    summary,
    overallConfidence,
  }
}

// ============================================
// SUMMARY GENERATION
// ============================================

/**
 * Generate a textual summary of an audit trail for display
 */
export function summarizeAuditTrail(auditTrail: AuditTrail): string {
  const stepSummaries = auditTrail.steps.map((step, index) => {
    const stepLabel = AUDIT_STEP_LABELS[step.stepType]
    return `${index + 1}. ${stepLabel}: ${step.description}`
  })

  return [
    `Audit Trail for Finding: ${auditTrail.findingId}`,
    '',
    'Reasoning Chain:',
    ...stepSummaries,
    '',
    `Overall Confidence: ${(auditTrail.overallConfidence * 100).toFixed(0)}%`,
    '',
    auditTrail.summary,
  ].join('\n')
}

/**
 * Format audit trail for markdown export
 */
export function formatAuditTrailAsMarkdown(auditTrail: AuditTrail): string {
  const lines: string[] = []

  lines.push(`### Audit Trail`)
  lines.push('')
  lines.push(`**Finding ID:** ${auditTrail.findingId}`)
  lines.push(`**Confidence:** ${(auditTrail.overallConfidence * 100).toFixed(0)}%`)
  lines.push('')
  lines.push('#### Reasoning Chain')
  lines.push('')

  for (const step of auditTrail.steps) {
    const stepLabel = AUDIT_STEP_LABELS[step.stepType]
    const confidenceStr = step.confidence !== null
      ? ` (${(step.confidence * 100).toFixed(0)}% confidence)`
      : ''

    lines.push(`**${stepLabel}**${confidenceStr}`)
    lines.push(`- ${step.description}`)

    if (step.evidence.length > 0) {
      lines.push('- Evidence:')
      for (const quote of step.evidence) {
        lines.push(`  > "${quote.text.substring(0, 100)}${quote.text.length > 100 ? '...' : ''}"`)
        lines.push(`  > — ${quote.citation.formatted}`)
      }
    }

    lines.push('')
  }

  lines.push('#### Summary')
  lines.push('')
  lines.push(auditTrail.summary)

  return lines.join('\n')
}
