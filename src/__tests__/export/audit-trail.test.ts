/**
 * Audit Trail Generation Tests
 *
 * Tests for audit trail generation logic that documents
 * evidence → analysis → conclusion reasoning chains.
 */

import { describe, it, expect } from '@jest/globals'
import type { Document, Entity, Finding, Contradiction, Engine, DocType } from '@/CONTRACT'
import type { AuditTrail, AuditTrailStep, AuditStepType } from '@/lib/types/export'
import {
  // Constants
  AUDIT_STEP_LABELS,
  ENGINE_LABELS,
  // Utility functions
  generateStepId,
  getCurrentTimestamp,
  parseEvidenceJson,
  calculateOverallConfidence,
  // Step creation functions
  createSourceIdentificationStep,
  createEvidenceExtractionStep,
  createAnalysisStep,
  createContradictionStep,
  createConclusionStep,
  createVerificationStep,
  // Context
  createAuditTrailContext,
  AuditTrailContext,
  // Main functions
  traceEvidence,
  buildReasoningChain,
  generateAuditTrail,
  generateAuditTrails,
  generateContradictionAuditTrail,
  // Summary functions
  summarizeAuditTrail,
  formatAuditTrailAsMarkdown,
} from '@/lib/export/audit-trail'

// ============================================
// TEST FIXTURES
// ============================================

const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
  id: 'doc-123',
  case_id: 'case-456',
  filename: 'witness_statement.pdf',
  file_type: 'application/pdf',
  file_size: 1024,
  storage_path: '/documents/witness_statement.pdf',
  hash_sha256: 'abc123',
  acquisition_date: '2024-01-15T10:30:00Z',
  doc_type: 'witness_statement' as DocType,
  source_entity: null,
  status: 'completed',
  extracted_text: null,
  page_count: 10,
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

const createMockEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'entity-123',
  case_id: 'case-456',
  canonical_name: 'John Smith',
  entity_type: 'person',
  aliases: ['J. Smith', 'Johnny'],
  role: 'witness',
  institution: null,
  professional_registration: null,
  credibility_score: 0.85,
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

const createMockFinding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'finding-123',
  case_id: 'case-456',
  engine: 'contradiction' as Engine,
  title: 'Inconsistent Timeline',
  description: 'The witness timeline contradicts the official record.',
  finding_type: 'temporal_inconsistency',
  severity: 'high',
  confidence: 0.85,
  document_ids: ['doc-123'],
  entity_ids: ['entity-123'],
  regulatory_targets: [],
  evidence: { quotes: ['The event occurred on March 15'] },
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

const createMockContradiction = (overrides: Partial<Contradiction> = {}): Contradiction => ({
  id: 'contradiction-123',
  case_id: 'case-456',
  title: 'Date Discrepancy',
  description: 'Source A states March 15, Source B states March 20',
  source_a_document_id: 'doc-A',
  source_a_entity_id: 'entity-A',
  source_a_text: 'The incident occurred on March 15, 2024.',
  source_a_page: 5,
  source_a_date: '2024-01-10',
  source_b_document_id: 'doc-B',
  source_b_entity_id: 'entity-B',
  source_b_text: 'Records indicate the incident was on March 20, 2024.',
  source_b_page: 12,
  source_b_date: '2024-02-15',
  contradiction_type: 'temporal',
  severity: 'high',
  resolution: null,
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

const createTestContext = (): AuditTrailContext => {
  const docA = createMockDocument({ id: 'doc-A', filename: 'statement_a.pdf' })
  const docB = createMockDocument({ id: 'doc-B', filename: 'statement_b.pdf' })
  const doc123 = createMockDocument()
  const entity123 = createMockEntity()

  return createAuditTrailContext([docA, docB, doc123], [entity123])
}

// ============================================
// CONSTANTS TESTS
// ============================================

describe('AUDIT_STEP_LABELS', () => {
  it('should have labels for all step types', () => {
    const stepTypes: AuditStepType[] = [
      'source_identification',
      'evidence_extraction',
      'analysis_performed',
      'contradiction_detected',
      'conclusion_reached',
      'verification_step',
    ]

    stepTypes.forEach(stepType => {
      expect(AUDIT_STEP_LABELS[stepType]).toBeDefined()
      expect(typeof AUDIT_STEP_LABELS[stepType]).toBe('string')
    })
  })

  it('should have human-readable labels', () => {
    expect(AUDIT_STEP_LABELS.source_identification).toBe('Source Identification')
    expect(AUDIT_STEP_LABELS.evidence_extraction).toBe('Evidence Extraction')
    expect(AUDIT_STEP_LABELS.conclusion_reached).toBe('Conclusion Reached')
  })
})

describe('ENGINE_LABELS', () => {
  it('should have labels for all engines', () => {
    const engines: Engine[] = [
      'entity_resolution',
      'temporal_parser',
      'argumentation',
      'bias_detection',
      'contradiction',
      'accountability',
      'professional_tracker',
      'omission',
      'expert_witness',
      'documentary',
      'narrative',
      'coordination',
      'evidence_chain',
    ]

    engines.forEach(engine => {
      expect(ENGINE_LABELS[engine]).toBeDefined()
      expect(typeof ENGINE_LABELS[engine]).toBe('string')
    })
  })

  it('should have descriptive labels', () => {
    expect(ENGINE_LABELS.contradiction).toBe('Contradiction Detection')
    expect(ENGINE_LABELS.temporal_parser).toBe('Temporal Analysis')
  })
})

// ============================================
// UTILITY FUNCTION TESTS
// ============================================

describe('generateStepId', () => {
  it('should generate unique IDs', () => {
    const id1 = generateStepId()
    const id2 = generateStepId()
    expect(id1).not.toBe(id2)
  })

  it('should use provided prefix', () => {
    const id = generateStepId('src')
    expect(id.startsWith('src-')).toBe(true)
  })

  it('should generate string IDs', () => {
    const id = generateStepId()
    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(5)
  })
})

describe('getCurrentTimestamp', () => {
  it('should return ISO format timestamp', () => {
    const timestamp = getCurrentTimestamp()
    expect(timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)
  })

  it('should return valid date', () => {
    const timestamp = getCurrentTimestamp()
    const date = new Date(timestamp)
    expect(date.getTime()).not.toBeNaN()
  })
})

describe('parseEvidenceJson', () => {
  it('should parse quotes from object', () => {
    const evidence = { quotes: ['Quote 1', 'Quote 2'] }
    const result = parseEvidenceJson(evidence)

    expect(result.quotes).toEqual(['Quote 1', 'Quote 2'])
  })

  it('should parse quotes from string JSON', () => {
    const evidence = JSON.stringify({ quotes: ['Quote 1'] })
    const result = parseEvidenceJson(evidence)

    expect(result.quotes).toEqual(['Quote 1'])
  })

  it('should extract document references', () => {
    const evidence = {
      documents: [{ documentId: 'doc-1', page: 5 }],
    }
    const result = parseEvidenceJson(evidence)

    expect(result.documentReferences).toEqual([{ documentId: 'doc-1', page: 5 }])
  })

  it('should extract single document_id', () => {
    const evidence = { document_id: 'doc-123', page: 10 }
    const result = parseEvidenceJson(evidence)

    expect(result.documentReferences).toContainEqual({ documentId: 'doc-123', page: 10 })
  })

  it('should handle null/undefined evidence', () => {
    expect(parseEvidenceJson(null)).toEqual({
      quotes: [],
      documentReferences: [],
      metadata: {},
    })
    expect(parseEvidenceJson(undefined)).toEqual({
      quotes: [],
      documentReferences: [],
      metadata: {},
    })
  })

  it('should handle invalid JSON string', () => {
    const result = parseEvidenceJson('not valid json')
    expect(result.quotes).toEqual([])
    expect(result.documentReferences).toEqual([])
  })

  it('should preserve remaining metadata', () => {
    const evidence = {
      quotes: ['Quote 1'],
      custom_field: 'value',
      severity: 'high',
    }
    const result = parseEvidenceJson(evidence)

    expect(result.metadata.custom_field).toBe('value')
    expect(result.metadata.severity).toBe('high')
  })
})

describe('calculateOverallConfidence', () => {
  it('should calculate average confidence', () => {
    const steps: AuditTrailStep[] = [
      { ...createBaseStep(), confidence: 0.8 },
      { ...createBaseStep(), confidence: 0.6 },
    ]

    const result = calculateOverallConfidence(steps)
    expect(result).toBeCloseTo(0.7, 2)
  })

  it('should weight conclusion steps higher', () => {
    const steps: AuditTrailStep[] = [
      { ...createBaseStep(), stepType: 'source_identification', confidence: 0.5 },
      { ...createBaseStep(), stepType: 'conclusion_reached', confidence: 1.0 },
    ]

    const result = calculateOverallConfidence(steps)
    // Weighted: (0.5*1 + 1.0*2) / (1+2) = 2.5/3 = 0.833...
    expect(result).toBeCloseTo(0.833, 2)
  })

  it('should handle null confidence values', () => {
    const steps: AuditTrailStep[] = [
      { ...createBaseStep(), confidence: 0.8 },
      { ...createBaseStep(), confidence: null },
    ]

    const result = calculateOverallConfidence(steps)
    expect(result).toBe(0.8)
  })

  it('should return 0 for empty steps', () => {
    const result = calculateOverallConfidence([])
    expect(result).toBe(0)
  })

  it('should return 0 for all null confidences', () => {
    const steps: AuditTrailStep[] = [{ ...createBaseStep(), confidence: null }]

    const result = calculateOverallConfidence(steps)
    expect(result).toBe(0)
  })
})

// Helper to create base step for testing
function createBaseStep(): AuditTrailStep {
  return {
    id: 'step-1',
    stepType: 'source_identification',
    timestamp: '2024-01-15T10:30:00Z',
    description: 'Test step',
    sourceDocumentIds: [],
    entityIds: [],
    engine: null,
    confidence: 1.0,
    evidence: [],
    previousStepIds: [],
  }
}

// ============================================
// STEP CREATION TESTS
// ============================================

describe('createSourceIdentificationStep', () => {
  it('should create source identification step', () => {
    const doc = createMockDocument()
    const step = createSourceIdentificationStep(doc)

    expect(step.stepType).toBe('source_identification')
    expect(step.sourceDocumentIds).toContain('doc-123')
    expect(step.description).toContain('Witness Statement')
    expect(step.confidence).toBe(1.0)
  })

  it('should use custom description when provided', () => {
    const doc = createMockDocument()
    const step = createSourceIdentificationStep(doc, 'Custom description')

    expect(step.description).toBe('Custom description')
  })

  it('should have empty previous step IDs', () => {
    const doc = createMockDocument()
    const step = createSourceIdentificationStep(doc)

    expect(step.previousStepIds).toEqual([])
  })
})

describe('createEvidenceExtractionStep', () => {
  it('should create evidence extraction step', () => {
    const doc = createMockDocument()
    const quotes = ['Quote 1', 'Quote 2']
    const step = createEvidenceExtractionStep(doc, quotes, 5)

    expect(step.stepType).toBe('evidence_extraction')
    expect(step.description).toContain('2 evidence quote(s)')
    expect(step.evidence).toHaveLength(2)
    expect(step.evidence[0].text).toBe('Quote 1')
  })

  it('should link to previous steps', () => {
    const doc = createMockDocument()
    const step = createEvidenceExtractionStep(doc, ['Quote'], null, ['prev-1', 'prev-2'])

    expect(step.previousStepIds).toEqual(['prev-1', 'prev-2'])
  })

  it('should handle null page number', () => {
    const doc = createMockDocument()
    const step = createEvidenceExtractionStep(doc, ['Quote'], null)

    expect(step.evidence[0].pageNumber).toBeNull()
  })
})

describe('createAnalysisStep', () => {
  it('should create analysis step with engine label', () => {
    const finding = createMockFinding()
    const step = createAnalysisStep('contradiction', finding)

    expect(step.stepType).toBe('analysis_performed')
    expect(step.description).toContain('Contradiction Detection')
    expect(step.engine).toBe('contradiction')
    expect(step.confidence).toBe(0.85)
  })

  it('should include document and entity IDs from finding', () => {
    const finding = createMockFinding({
      document_ids: ['doc-1', 'doc-2'],
      entity_ids: ['entity-1'],
    })
    const step = createAnalysisStep('contradiction', finding)

    expect(step.sourceDocumentIds).toEqual(['doc-1', 'doc-2'])
    expect(step.entityIds).toEqual(['entity-1'])
  })

  it('should link to previous steps', () => {
    const finding = createMockFinding()
    const step = createAnalysisStep('contradiction', finding, ['prev-1'])

    expect(step.previousStepIds).toEqual(['prev-1'])
  })
})

describe('createContradictionStep', () => {
  it('should create contradiction detection step', () => {
    const contradiction = createMockContradiction()
    const docA = createMockDocument({ id: 'doc-A' })
    const docB = createMockDocument({ id: 'doc-B' })
    const step = createContradictionStep(contradiction, docA, docB)

    expect(step.stepType).toBe('contradiction_detected')
    expect(step.description).toContain('Date Discrepancy')
    expect(step.engine).toBe('contradiction')
    expect(step.evidence).toHaveLength(2)
  })

  it('should include source document IDs', () => {
    const contradiction = createMockContradiction()
    const step = createContradictionStep(contradiction)

    expect(step.sourceDocumentIds).toContain('doc-A')
    expect(step.sourceDocumentIds).toContain('doc-B')
  })

  it('should include entity IDs', () => {
    const contradiction = createMockContradiction()
    const step = createContradictionStep(contradiction)

    expect(step.entityIds).toContain('entity-A')
    expect(step.entityIds).toContain('entity-B')
  })

  it('should create placeholder citations when documents not provided', () => {
    const contradiction = createMockContradiction()
    const step = createContradictionStep(contradiction, null, null)

    expect(step.evidence).toHaveLength(2)
    expect(step.evidence[0].citation.formatted).toContain('Source A')
  })
})

describe('createConclusionStep', () => {
  it('should create conclusion step', () => {
    const finding = createMockFinding()
    const step = createConclusionStep(finding, 'Final conclusion summary')

    expect(step.stepType).toBe('conclusion_reached')
    expect(step.description).toBe('Final conclusion summary')
    expect(step.confidence).toBe(0.85)
    expect(step.engine).toBe('contradiction')
  })

  it('should link to previous steps', () => {
    const finding = createMockFinding()
    const step = createConclusionStep(finding, 'Summary', ['prev-1'])

    expect(step.previousStepIds).toEqual(['prev-1'])
  })
})

describe('createVerificationStep', () => {
  it('should create verification step', () => {
    const step = createVerificationStep('Verification complete', 0.9)

    expect(step.stepType).toBe('verification_step')
    expect(step.description).toBe('Verification complete')
    expect(step.confidence).toBe(0.9)
    expect(step.engine).toBeNull()
  })

  it('should link to previous steps', () => {
    const step = createVerificationStep('Verification', 0.8, ['prev-1'])

    expect(step.previousStepIds).toEqual(['prev-1'])
  })
})

// ============================================
// CONTEXT TESTS
// ============================================

describe('createAuditTrailContext', () => {
  it('should create context with documents and entities', () => {
    const docs = [createMockDocument()]
    const entities = [createMockEntity()]
    const context = createAuditTrailContext(docs, entities)

    expect(context.documents.size).toBe(1)
    expect(context.entities.size).toBe(1)
    expect(context.documents.get('doc-123')).toBeDefined()
    expect(context.entities.get('entity-123')).toBeDefined()
  })

  it('should handle empty arrays', () => {
    const context = createAuditTrailContext()

    expect(context.documents.size).toBe(0)
    expect(context.entities.size).toBe(0)
  })
})

// ============================================
// MAIN AUDIT TRAIL FUNCTION TESTS
// ============================================

describe('traceEvidence', () => {
  it('should create steps for finding evidence chain', () => {
    const finding = createMockFinding()
    const context = createTestContext()
    const steps = traceEvidence(finding, context)

    expect(steps.length).toBeGreaterThan(0)

    // Should have source identification, evidence extraction, analysis, and conclusion
    const stepTypes = steps.map(s => s.stepType)
    expect(stepTypes).toContain('source_identification')
    expect(stepTypes).toContain('analysis_performed')
    expect(stepTypes).toContain('conclusion_reached')
  })

  it('should create evidence extraction step when quotes present', () => {
    const finding = createMockFinding({
      evidence: { quotes: ['Quote from document'] },
    })
    const context = createTestContext()
    const steps = traceEvidence(finding, context)

    const extractionSteps = steps.filter(s => s.stepType === 'evidence_extraction')
    expect(extractionSteps.length).toBe(1)
  })

  it('should link steps with previous step IDs', () => {
    const finding = createMockFinding()
    const context = createTestContext()
    const steps = traceEvidence(finding, context)

    // Later steps should reference earlier steps
    const conclusionStep = steps.find(s => s.stepType === 'conclusion_reached')
    expect(conclusionStep?.previousStepIds.length).toBeGreaterThan(0)
  })

  it('should handle finding with no documents', () => {
    const finding = createMockFinding({ document_ids: [] })
    const context = createTestContext()
    const steps = traceEvidence(finding, context)

    // Should still have analysis and conclusion steps
    const stepTypes = steps.map(s => s.stepType)
    expect(stepTypes).toContain('analysis_performed')
    expect(stepTypes).toContain('conclusion_reached')
  })

  it('should handle finding with no evidence quotes', () => {
    const finding = createMockFinding({ evidence: {} })
    const context = createTestContext()
    const steps = traceEvidence(finding, context)

    const extractionSteps = steps.filter(s => s.stepType === 'evidence_extraction')
    // Should not create extraction step without quotes
    expect(extractionSteps.length).toBe(0)
  })
})

describe('buildReasoningChain', () => {
  it('should create steps for contradiction reasoning chain', () => {
    const contradiction = createMockContradiction()
    const context = createTestContext()
    const steps = buildReasoningChain(contradiction, context)

    expect(steps.length).toBeGreaterThan(0)

    const stepTypes = steps.map(s => s.stepType)
    expect(stepTypes).toContain('source_identification')
    expect(stepTypes).toContain('contradiction_detected')
    expect(stepTypes).toContain('verification_step')
  })

  it('should create two source identification steps for both sources', () => {
    const contradiction = createMockContradiction()
    const context = createTestContext()
    const steps = buildReasoningChain(contradiction, context)

    const sourceSteps = steps.filter(s => s.stepType === 'source_identification')
    expect(sourceSteps.length).toBe(2)
  })

  it('should create evidence extraction for both source texts', () => {
    const contradiction = createMockContradiction()
    const context = createTestContext()
    const steps = buildReasoningChain(contradiction, context)

    const extractionSteps = steps.filter(s => s.stepType === 'evidence_extraction')
    expect(extractionSteps.length).toBe(2)
  })

  it('should handle missing source documents in context', () => {
    const contradiction = createMockContradiction()
    const emptyContext = createAuditTrailContext()
    const steps = buildReasoningChain(contradiction, emptyContext)

    // Should still create contradiction and verification steps
    const stepTypes = steps.map(s => s.stepType)
    expect(stepTypes).toContain('contradiction_detected')
    expect(stepTypes).toContain('verification_step')
  })

  it('should include severity in verification step', () => {
    const contradiction = createMockContradiction({ severity: 'critical' })
    const context = createTestContext()
    const steps = buildReasoningChain(contradiction, context)

    const verificationStep = steps.find(s => s.stepType === 'verification_step')
    expect(verificationStep?.description).toContain('[CRITICAL]')
  })
})

describe('generateAuditTrail', () => {
  it('should generate complete audit trail for finding', () => {
    const finding = createMockFinding()
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    expect(auditTrail.findingId).toBe('finding-123')
    expect(auditTrail.steps.length).toBeGreaterThan(0)
    expect(auditTrail.summary).toBeTruthy()
    expect(auditTrail.overallConfidence).toBeGreaterThan(0)
  })

  it('should generate meaningful summary', () => {
    const finding = createMockFinding()
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    expect(auditTrail.summary).toContain('Contradiction Detection')
    expect(auditTrail.summary).toContain('Inconsistent Timeline')
    expect(auditTrail.summary).toContain('%')
  })

  it('should include severity in summary', () => {
    const finding = createMockFinding({ severity: 'critical' })
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    expect(auditTrail.summary).toContain('[CRITICAL]')
  })

  it('should calculate overall confidence from steps', () => {
    const finding = createMockFinding({ confidence: 0.9 })
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    expect(auditTrail.overallConfidence).toBeGreaterThan(0)
    expect(auditTrail.overallConfidence).toBeLessThanOrEqual(1)
  })
})

describe('generateAuditTrails', () => {
  it('should generate audit trails for multiple findings', () => {
    const findings = [
      createMockFinding({ id: 'finding-1' }),
      createMockFinding({ id: 'finding-2' }),
    ]
    const context = createTestContext()
    const auditTrails = generateAuditTrails(findings, context)

    expect(auditTrails).toHaveLength(2)
    expect(auditTrails[0].findingId).toBe('finding-1')
    expect(auditTrails[1].findingId).toBe('finding-2')
  })

  it('should handle empty findings array', () => {
    const context = createTestContext()
    const auditTrails = generateAuditTrails([], context)

    expect(auditTrails).toEqual([])
  })
})

describe('generateContradictionAuditTrail', () => {
  it('should generate audit trail for contradiction', () => {
    const contradiction = createMockContradiction()
    const context = createTestContext()
    const auditTrail = generateContradictionAuditTrail(contradiction, context)

    expect(auditTrail.findingId).toBe('contradiction-123')
    expect(auditTrail.steps.length).toBeGreaterThan(0)
    expect(auditTrail.summary).toBeTruthy()
  })

  it('should include contradiction type in summary', () => {
    const contradiction = createMockContradiction({ contradiction_type: 'temporal' })
    const context = createTestContext()
    const auditTrail = generateContradictionAuditTrail(contradiction, context)

    expect(auditTrail.summary).toContain('Temporal')
  })

  it('should include severity in summary', () => {
    const contradiction = createMockContradiction({ severity: 'high' })
    const context = createTestContext()
    const auditTrail = generateContradictionAuditTrail(contradiction, context)

    expect(auditTrail.summary).toContain('[HIGH]')
  })
})

// ============================================
// SUMMARY FUNCTION TESTS
// ============================================

describe('summarizeAuditTrail', () => {
  it('should generate text summary', () => {
    const auditTrail: AuditTrail = {
      findingId: 'finding-123',
      steps: [
        createBaseStep(),
        { ...createBaseStep(), stepType: 'conclusion_reached', description: 'Final conclusion' },
      ],
      summary: 'Test summary',
      overallConfidence: 0.85,
    }

    const summary = summarizeAuditTrail(auditTrail)

    expect(summary).toContain('finding-123')
    expect(summary).toContain('Source Identification')
    expect(summary).toContain('Final conclusion')
    expect(summary).toContain('85%')
    expect(summary).toContain('Test summary')
  })

  it('should number steps', () => {
    const auditTrail: AuditTrail = {
      findingId: 'finding-123',
      steps: [createBaseStep(), { ...createBaseStep(), stepType: 'conclusion_reached' }],
      summary: 'Summary',
      overallConfidence: 0.8,
    }

    const summary = summarizeAuditTrail(auditTrail)

    expect(summary).toContain('1.')
    expect(summary).toContain('2.')
  })
})

describe('formatAuditTrailAsMarkdown', () => {
  it('should generate markdown format', () => {
    const auditTrail: AuditTrail = {
      findingId: 'finding-123',
      steps: [createBaseStep()],
      summary: 'Test summary',
      overallConfidence: 0.85,
    }

    const markdown = formatAuditTrailAsMarkdown(auditTrail)

    expect(markdown).toContain('### Audit Trail')
    expect(markdown).toContain('**Finding ID:**')
    expect(markdown).toContain('**Confidence:**')
    expect(markdown).toContain('#### Reasoning Chain')
    expect(markdown).toContain('#### Summary')
  })

  it('should format confidence as percentage', () => {
    const auditTrail: AuditTrail = {
      findingId: 'finding-123',
      steps: [{ ...createBaseStep(), confidence: 0.75 }],
      summary: 'Summary',
      overallConfidence: 0.85,
    }

    const markdown = formatAuditTrailAsMarkdown(auditTrail)

    expect(markdown).toContain('85%')
    expect(markdown).toContain('75% confidence')
  })

  it('should include evidence quotes', () => {
    const auditTrail: AuditTrail = {
      findingId: 'finding-123',
      steps: [
        {
          ...createBaseStep(),
          evidence: [
            {
              text: 'This is quoted evidence text',
              documentId: 'doc-1',
              pageNumber: 5,
              citation: {
                formatted: 'Document A, at 5',
                documentId: 'doc-1',
                documentName: 'Document A',
                pageNumber: 5,
                docType: null,
              },
              truncated: false,
            },
          ],
        },
      ],
      summary: 'Summary',
      overallConfidence: 0.8,
    }

    const markdown = formatAuditTrailAsMarkdown(auditTrail)

    expect(markdown).toContain('This is quoted evidence')
    expect(markdown).toContain('Document A, at 5')
  })

  it('should truncate long evidence quotes in display', () => {
    const longQuote = 'A'.repeat(150)
    const auditTrail: AuditTrail = {
      findingId: 'finding-123',
      steps: [
        {
          ...createBaseStep(),
          evidence: [
            {
              text: longQuote,
              documentId: 'doc-1',
              pageNumber: null,
              citation: {
                formatted: 'Document',
                documentId: 'doc-1',
                documentName: 'Document',
                pageNumber: null,
                docType: null,
              },
              truncated: false,
            },
          ],
        },
      ],
      summary: 'Summary',
      overallConfidence: 0.8,
    }

    const markdown = formatAuditTrailAsMarkdown(auditTrail)

    // Should show truncated with ...
    expect(markdown).toContain('...')
  })
})

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  it('should handle finding with null confidence', () => {
    const finding = createMockFinding({ confidence: null })
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    expect(auditTrail.overallConfidence).toBeDefined()
  })

  it('should handle finding with no severity', () => {
    const finding = createMockFinding({ severity: null })
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    // Should not crash and should have valid summary
    expect(auditTrail.summary).toBeTruthy()
    expect(auditTrail.summary).not.toContain('[null]')
  })

  it('should handle contradiction with partial source data', () => {
    const contradiction = createMockContradiction({
      source_a_document_id: null,
      source_a_entity_id: null,
    })
    const context = createTestContext()
    const steps = buildReasoningChain(contradiction, context)

    // Should still create steps without crashing
    expect(steps.length).toBeGreaterThan(0)
  })

  it('should handle finding with empty document_ids array', () => {
    const finding = createMockFinding({ document_ids: [] })
    const context = createTestContext()
    const steps = traceEvidence(finding, context)

    // Should still create analysis and conclusion steps
    expect(steps.length).toBeGreaterThan(0)
  })

  it('should handle finding with empty entity_ids array', () => {
    const finding = createMockFinding({ entity_ids: [] })
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    expect(auditTrail.steps.length).toBeGreaterThan(0)
  })

  it('should handle unknown engine gracefully', () => {
    const finding = createMockFinding({ engine: 'unknown_engine' as Engine })
    const context = createTestContext()
    const auditTrail = generateAuditTrail(finding, context)

    // Should use engine name directly if not in labels
    expect(auditTrail.summary).toContain('unknown_engine')
  })
})
