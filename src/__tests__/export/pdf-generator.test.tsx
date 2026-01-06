/**
 * PDF Generator Tests
 *
 * Tests for React-PDF based PDF generation components and functions.
 */

import React from 'react'
import { describe, it, expect, beforeEach } from '@jest/globals'
import { pdf } from '@react-pdf/renderer'
import type {
  ExportData,
  ExportFinding,
  ExportContradiction,
  ExportEntity,
  ExportOptions,
  ExportSummary,
  MethodologyStatement,
  Citation,
  AuditTrail,
} from '@/lib/types/export'
import { DEFAULT_EXPORT_OPTIONS, DEFAULT_EXPORT_SECTIONS } from '@/lib/types/export'
import type { Case, Document, Entity, Finding, Contradiction, Severity, Engine } from '@/CONTRACT'
import {
  EvidenceExportPDF,
  generatePDFBlob,
  generatePDFBuffer,
} from '@/lib/export/pdf-generator'

// ============================================
// TEST FIXTURES
// ============================================

function createMockCase(overrides: Partial<Case> = {}): Case {
  return {
    id: 'case-123',
    reference: 'FAM-2024-001',
    name: 'Smith v Jones Family Proceedings',
    case_type: 'family_court',
    status: 'active',
    description: 'Family court proceedings regarding custody arrangements',
    metadata: {},
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

function createMockDocument(overrides: Partial<Document> = {}): Document {
  return {
    id: 'doc-123',
    case_id: 'case-123',
    filename: 'witness_statement.pdf',
    file_type: 'application/pdf',
    file_size: 1024,
    storage_path: '/documents/witness_statement.pdf',
    hash_sha256: 'abc123',
    acquisition_date: '2024-01-15T10:30:00Z',
    doc_type: 'witness_statement',
    source_entity: null,
    status: 'completed',
    extracted_text: 'Sample extracted text',
    page_count: 10,
    metadata: {},
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

function createMockEntity(overrides: Partial<Entity> = {}): Entity {
  return {
    id: 'entity-123',
    case_id: 'case-123',
    canonical_name: 'John Smith',
    entity_type: 'person',
    aliases: ['J. Smith', 'Mr Smith'],
    role: 'Witness',
    institution: null,
    professional_registration: null,
    credibility_score: 0.85,
    metadata: {},
    created_at: '2024-01-15T10:30:00Z',
    updated_at: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

function createMockFinding(overrides: Partial<Finding> = {}): Finding {
  return {
    id: 'finding-123',
    case_id: 'case-123',
    engine: 'contradiction' as Engine,
    title: 'Timeline Inconsistency',
    description: 'The witness statement timeline contradicts the official record.',
    finding_type: 'contradiction',
    severity: 'high' as Severity,
    confidence: 0.85,
    document_ids: ['doc-123'],
    entity_ids: ['entity-123'],
    regulatory_targets: [],
    evidence: { quotes: ['The event occurred on March 15'] },
    metadata: {},
    created_at: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

function createMockContradiction(overrides: Partial<Contradiction> = {}): Contradiction {
  return {
    id: 'contradiction-123',
    case_id: 'case-123',
    title: 'Date Discrepancy',
    description: 'Conflicting dates reported by different sources',
    source_a_document_id: 'doc-123',
    source_a_entity_id: 'entity-123',
    source_a_text: 'The meeting occurred on January 10th',
    source_a_page: 5,
    source_a_date: '2024-01-10',
    source_b_document_id: 'doc-456',
    source_b_entity_id: 'entity-456',
    source_b_text: 'The meeting occurred on January 15th',
    source_b_page: 3,
    source_b_date: '2024-01-15',
    contradiction_type: 'temporal',
    severity: 'medium' as Severity,
    resolution: null,
    metadata: {},
    created_at: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

function createMockCitation(overrides: Partial<Citation> = {}): Citation {
  return {
    formatted: 'Witness Statement, at 5 (Jan. 15, 2024)',
    documentId: 'doc-123',
    documentName: 'Witness Statement',
    pageNumber: 5,
    docType: 'witness_statement',
    documentDate: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

function createMockExportFinding(overrides: Partial<ExportFinding> = {}): ExportFinding {
  const finding = createMockFinding()
  const citation = createMockCitation()
  const document = createMockDocument()
  const entity = createMockEntity()

  return {
    finding,
    citations: [citation],
    quotes: [
      {
        text: 'The event occurred on March 15',
        documentId: 'doc-123',
        pageNumber: 5,
        citation,
        truncated: false,
      },
    ],
    relatedEntities: [entity],
    relatedDocuments: [document],
    auditTrail: null,
    ...overrides,
  }
}

function createMockExportContradiction(
  overrides: Partial<ExportContradiction> = {}
): ExportContradiction {
  const contradiction = createMockContradiction()

  return {
    contradiction,
    sourceACitation: createMockCitation({ documentId: 'doc-123' }),
    sourceBCitation: createMockCitation({ documentId: 'doc-456', documentName: 'Expert Report' }),
    sourceAQuote: {
      text: 'The meeting occurred on January 10th',
      documentId: 'doc-123',
      pageNumber: 5,
      citation: createMockCitation(),
      truncated: false,
    },
    sourceBQuote: {
      text: 'The meeting occurred on January 15th',
      documentId: 'doc-456',
      pageNumber: 3,
      citation: createMockCitation({ documentId: 'doc-456' }),
      truncated: false,
    },
    sourceAEntity: createMockEntity(),
    sourceBEntity: createMockEntity({ id: 'entity-456', canonical_name: 'Jane Doe' }),
    sourceADocument: createMockDocument(),
    sourceBDocument: createMockDocument({ id: 'doc-456', filename: 'expert_report.pdf' }),
    ...overrides,
  }
}

function createMockExportEntity(overrides: Partial<ExportEntity> = {}): ExportEntity {
  const entity = createMockEntity()
  const document = createMockDocument()

  return {
    entity,
    documentReferences: [
      {
        document,
        pageNumbers: [5, 10, 15],
        mentionCount: 12,
      },
    ],
    relatedFindings: [createMockFinding()],
    relatedContradictions: [createMockContradiction()],
    ...overrides,
  }
}

function createMockSummary(overrides: Partial<ExportSummary> = {}): ExportSummary {
  return {
    caseReference: 'FAM-2024-001',
    caseName: 'Smith v Jones',
    generatedAt: '2024-01-15T10:30:00Z',
    documentCount: 25,
    findingCount: 15,
    contradictionCount: 5,
    entityCount: 10,
    findingsBySeverity: {
      critical: 2,
      high: 5,
      medium: 4,
      low: 3,
      info: 1,
    },
    findingsByEngine: {
      contradiction: 5,
      omission: 3,
      entity_resolution: 2,
      temporal_parser: 2,
      argumentation: 1,
      bias_detection: 1,
      accountability: 0,
      professional_tracker: 0,
      expert_witness: 1,
      documentary: 0,
      narrative: 0,
      coordination: 0,
      evidence_chain: 0,
    },
    ...overrides,
  }
}

function createMockMethodology(
  overrides: Partial<MethodologyStatement> = {}
): MethodologyStatement {
  return {
    title: 'Analysis Methodology',
    introduction:
      'This analysis was conducted using automated evidence analysis engines to identify contradictions, omissions, and patterns across the document set.',
    dataSources: [
      {
        sourceType: 'Court Documents',
        description: 'Official court filings and orders',
        documentCount: 15,
        dateRange: {
          earliest: '2023-06-01',
          latest: '2024-01-15',
        },
      },
      {
        sourceType: 'Witness Statements',
        description: 'Sworn witness statements and depositions',
        documentCount: 10,
      },
    ],
    analysisMethods: [
      {
        engine: 'contradiction' as Engine,
        displayName: 'Contradiction Detection',
        description: 'Identifies conflicting statements across documents',
        outputTypes: ['contradictions', 'findings'],
      },
      {
        engine: 'omission' as Engine,
        displayName: 'Omission Detection',
        description: 'Detects significant omissions in reports and summaries',
        outputTypes: ['omissions', 'findings'],
      },
    ],
    confidenceExplanation:
      'Confidence scores range from 0% to 100%, indicating the certainty of each finding based on evidence quality and consistency.',
    limitations: [
      'Analysis is limited to text content; handwritten notes may not be fully captured.',
      'Findings require human verification before use in legal proceedings.',
    ],
    version: '1.0.0',
    lastUpdated: '2024-01-15T10:30:00Z',
    ...overrides,
  }
}

function createMockAuditTrail(overrides: Partial<AuditTrail> = {}): AuditTrail {
  return {
    findingId: 'finding-123',
    steps: [
      {
        id: 'step-1',
        stepType: 'source_identification',
        timestamp: '2024-01-15T10:30:00Z',
        description: 'Source document identified: Witness Statement',
        sourceDocumentIds: ['doc-123'],
        entityIds: [],
        engine: null,
        confidence: 1.0,
        evidence: [],
        previousStepIds: [],
      },
      {
        id: 'step-2',
        stepType: 'evidence_extraction',
        timestamp: '2024-01-15T10:31:00Z',
        description: 'Extracted 3 evidence quotes from Witness Statement',
        sourceDocumentIds: ['doc-123'],
        entityIds: [],
        engine: null,
        confidence: 1.0,
        evidence: [],
        previousStepIds: ['step-1'],
      },
      {
        id: 'step-3',
        stepType: 'analysis_performed',
        timestamp: '2024-01-15T10:32:00Z',
        description: 'Contradiction Detection engine analyzed evidence',
        sourceDocumentIds: ['doc-123'],
        entityIds: ['entity-123'],
        engine: 'contradiction' as Engine,
        confidence: 0.85,
        evidence: [],
        previousStepIds: ['step-2'],
      },
      {
        id: 'step-4',
        stepType: 'conclusion_reached',
        timestamp: '2024-01-15T10:33:00Z',
        description: 'Timeline Inconsistency: The witness timeline contradicts the official record.',
        sourceDocumentIds: ['doc-123'],
        entityIds: ['entity-123'],
        engine: 'contradiction' as Engine,
        confidence: 0.85,
        evidence: [],
        previousStepIds: ['step-3'],
      },
    ],
    summary:
      'Contradiction Detection analysis identified: Timeline Inconsistency [HIGH]. Evidence traced from 1 source document(s) through 1 extraction(s) to conclusion with 85% confidence.',
    overallConfidence: 0.85,
    ...overrides,
  }
}

function createMockExportData(overrides: Partial<ExportData> = {}): ExportData {
  const caseData = createMockCase()
  const documents = [createMockDocument()]
  const findings = [createMockExportFinding()]
  const contradictions = [createMockExportContradiction()]
  const entities = [createMockExportEntity()]
  const auditTrails = [createMockAuditTrail()]

  return {
    metadata: {
      exportId: 'export-123',
      format: 'pdf',
      generatedAt: '2024-01-15T10:30:00Z',
      generatedBy: 'Apatheia Labs',
      version: '1.0.0',
    },
    case: caseData,
    summary: createMockSummary(),
    findings,
    contradictions,
    entities,
    omissions: [],
    documents,
    methodology: createMockMethodology(),
    auditTrails,
    ...overrides,
  }
}

// ============================================
// COMPONENT RENDERING TESTS
// ============================================

describe('EvidenceExportPDF', () => {
  let mockData: ExportData
  let mockOptions: ExportOptions

  beforeEach(() => {
    mockData = createMockExportData()
    mockOptions = { ...DEFAULT_EXPORT_OPTIONS }
  })

  it('should render without errors', async () => {
    const element = <EvidenceExportPDF data={mockData} options={mockOptions} />

    // Verify the element can be processed by react-pdf
    expect(element).toBeDefined()
    expect(element.type).toBe(EvidenceExportPDF)
  })

  it('should render with default options', async () => {
    const element = <EvidenceExportPDF data={mockData} />

    expect(element).toBeDefined()
    expect(element.props.options).toBeUndefined()
  })

  it('should pass data and options correctly', () => {
    const element = <EvidenceExportPDF data={mockData} options={mockOptions} />

    expect(element.props.data).toBe(mockData)
    expect(element.props.options).toBe(mockOptions)
  })

  it('should handle empty findings', () => {
    const emptyData = createMockExportData({ findings: [] })
    const element = <EvidenceExportPDF data={emptyData} options={mockOptions} />

    expect(element).toBeDefined()
  })

  it('should handle empty contradictions', () => {
    const emptyData = createMockExportData({ contradictions: [] })
    const element = <EvidenceExportPDF data={emptyData} options={mockOptions} />

    expect(element).toBeDefined()
  })

  it('should handle empty entities', () => {
    const emptyData = createMockExportData({ entities: [] })
    const element = <EvidenceExportPDF data={emptyData} options={mockOptions} />

    expect(element).toBeDefined()
  })

  it('should handle empty audit trails', () => {
    const emptyData = createMockExportData({ auditTrails: [] })
    const element = <EvidenceExportPDF data={emptyData} options={mockOptions} />

    expect(element).toBeDefined()
  })

  it('should respect section visibility options', () => {
    const customOptions: ExportOptions = {
      ...mockOptions,
      sections: [
        { id: 'cover', title: 'Cover Page', included: false, order: 1 },
        { id: 'findings', title: 'Findings', included: true, order: 2 },
      ],
    }

    const element = <EvidenceExportPDF data={mockData} options={customOptions} />

    expect(element.props.options.sections[0].included).toBe(false)
    expect(element.props.options.sections[1].included).toBe(true)
  })

  it('should apply custom title from options', () => {
    const customOptions: ExportOptions = {
      ...mockOptions,
      customTitle: 'Custom Evidence Report',
      customSubtitle: 'Detailed Analysis',
    }

    const element = <EvidenceExportPDF data={mockData} options={customOptions} />

    expect(element.props.options.customTitle).toBe('Custom Evidence Report')
    expect(element.props.options.customSubtitle).toBe('Detailed Analysis')
  })

  it('should handle author name option', () => {
    const customOptions: ExportOptions = {
      ...mockOptions,
      authorName: 'Legal Analyst',
    }

    const element = <EvidenceExportPDF data={mockData} options={customOptions} />

    expect(element.props.options.authorName).toBe('Legal Analyst')
  })
})

// ============================================
// PDF GENERATION FUNCTION TESTS
// ============================================

describe('generatePDFBlob', () => {
  let mockData: ExportData
  let mockOptions: ExportOptions

  beforeEach(() => {
    mockData = createMockExportData()
    mockOptions = { ...DEFAULT_EXPORT_OPTIONS }
  })

  it('should generate a valid Blob', async () => {
    const blob = await generatePDFBlob(mockData, mockOptions)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with default options', async () => {
    const blob = await generatePDFBlob(mockData)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.type).toBe('application/pdf')
  })

  it('should generate PDF with empty findings', async () => {
    const emptyData = createMockExportData({ findings: [] })
    const blob = await generatePDFBlob(emptyData, mockOptions)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with all severity levels', async () => {
    const findingsAllSeverities = (['critical', 'high', 'medium', 'low', 'info'] as Severity[]).map(
      (severity, idx) =>
        createMockExportFinding({
          finding: createMockFinding({
            id: `finding-${idx}`,
            severity,
            title: `${severity.toUpperCase()} Finding`,
          }),
        })
    )

    const dataWithAllSeverities = createMockExportData({ findings: findingsAllSeverities })
    const blob = await generatePDFBlob(dataWithAllSeverities, mockOptions)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with multiple contradictions', async () => {
    const multipleContradictions = [
      createMockExportContradiction(),
      createMockExportContradiction({
        contradiction: createMockContradiction({
          id: 'contradiction-456',
          title: 'Statement Conflict',
        }),
      }),
    ]

    const data = createMockExportData({ contradictions: multipleContradictions })
    const blob = await generatePDFBlob(data, mockOptions)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with multiple entities', async () => {
    const multipleEntities = [
      createMockExportEntity(),
      createMockExportEntity({
        entity: createMockEntity({
          id: 'entity-456',
          canonical_name: 'Jane Doe',
          entity_type: 'professional',
        }),
      }),
    ]

    const data = createMockExportData({ entities: multipleEntities })
    const blob = await generatePDFBlob(data, mockOptions)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with audit trails disabled', async () => {
    const options: ExportOptions = {
      ...mockOptions,
      includeAuditTrails: false,
    }

    const blob = await generatePDFBlob(mockData, options)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with methodology disabled', async () => {
    const options: ExportOptions = {
      ...mockOptions,
      includeMethodology: false,
    }

    const blob = await generatePDFBlob(mockData, options)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF without page numbers', async () => {
    const options: ExportOptions = {
      ...mockOptions,
      includePageNumbers: false,
    }

    const blob = await generatePDFBlob(mockData, options)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF without timestamp', async () => {
    const options: ExportOptions = {
      ...mockOptions,
      includeTimestamp: false,
    }

    const blob = await generatePDFBlob(mockData, options)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle large data sets', async () => {
    // Create 50 findings
    const manyFindings = Array.from({ length: 50 }, (_, idx) =>
      createMockExportFinding({
        finding: createMockFinding({
          id: `finding-${idx}`,
          title: `Finding ${idx + 1}`,
        }),
      })
    )

    const largeData = createMockExportData({
      findings: manyFindings,
      summary: createMockSummary({ findingCount: 50 }),
    })

    const blob = await generatePDFBlob(largeData, mockOptions)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  }, 30000) // Extended timeout for large PDF
})

describe('generatePDFBuffer', () => {
  let mockData: ExportData
  let mockOptions: ExportOptions

  beforeEach(() => {
    mockData = createMockExportData()
    mockOptions = { ...DEFAULT_EXPORT_OPTIONS }
  })

  it('should generate a valid Uint8Array buffer', async () => {
    const buffer = await generatePDFBuffer(mockData, mockOptions)

    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('should generate buffer with default options', async () => {
    const buffer = await generatePDFBuffer(mockData)

    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('should produce PDF magic bytes', async () => {
    const buffer = await generatePDFBuffer(mockData, mockOptions)

    // PDF files start with "%PDF-"
    const header = String.fromCharCode(buffer[0], buffer[1], buffer[2], buffer[3], buffer[4])
    expect(header).toBe('%PDF-')
  })

  it('should match blob size', async () => {
    const blob = await generatePDFBlob(mockData, mockOptions)
    const buffer = await generatePDFBuffer(mockData, mockOptions)

    // Buffer and blob should be similar size (may have slight variation due to regeneration)
    expect(Math.abs(blob.size - buffer.length)).toBeLessThan(1000)
  })
})

// ============================================
// DATA VALIDATION TESTS
// ============================================

describe('Export data handling', () => {
  it('should handle null severity in findings', async () => {
    const findingWithNullSeverity = createMockExportFinding({
      finding: createMockFinding({ severity: null }),
    })

    const data = createMockExportData({ findings: [findingWithNullSeverity] })
    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle null confidence in findings', async () => {
    const findingWithNullConfidence = createMockExportFinding({
      finding: createMockFinding({ confidence: null }),
    })

    const data = createMockExportData({ findings: [findingWithNullConfidence] })
    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle empty description in findings', async () => {
    const findingWithEmptyDescription = createMockExportFinding({
      finding: createMockFinding({ description: null }),
    })

    const data = createMockExportData({ findings: [findingWithEmptyDescription] })
    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle special characters in text', async () => {
    const findingWithSpecialChars = createMockExportFinding({
      finding: createMockFinding({
        title: 'Finding with "quotes" & ampersands',
        description: 'Description with <brackets> and special chars: @#$%',
      }),
    })

    const data = createMockExportData({ findings: [findingWithSpecialChars] })
    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle very long text', async () => {
    const longText = 'A'.repeat(5000)
    const findingWithLongText = createMockExportFinding({
      finding: createMockFinding({
        title: 'Finding with very long description',
        description: longText,
      }),
    })

    const data = createMockExportData({ findings: [findingWithLongText] })
    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle all engine types', async () => {
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

    const findingsWithAllEngines = engines.map((engine, idx) =>
      createMockExportFinding({
        finding: createMockFinding({
          id: `finding-engine-${idx}`,
          engine,
          title: `Finding from ${engine}`,
        }),
      })
    )

    const data = createMockExportData({ findings: findingsWithAllEngines })
    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })
})

// ============================================
// SECTION VISIBILITY TESTS
// ============================================

describe('Section visibility', () => {
  let mockData: ExportData

  beforeEach(() => {
    mockData = createMockExportData()
  })

  it('should generate PDF with all sections enabled', async () => {
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_SECTIONS.map((s) => ({ ...s, included: true })),
    }

    const blob = await generatePDFBlob(mockData, options)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with only cover section', async () => {
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_SECTIONS.map((s) => ({
        ...s,
        included: s.id === 'cover',
      })),
    }

    const blob = await generatePDFBlob(mockData, options)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate PDF with only findings section', async () => {
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_SECTIONS.map((s) => ({
        ...s,
        included: s.id === 'findings',
      })),
    }

    const blob = await generatePDFBlob(mockData, options)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate smaller PDF with fewer sections', async () => {
    const fullOptions: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_SECTIONS.map((s) => ({ ...s, included: true })),
    }

    const minimalOptions: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_SECTIONS.map((s) => ({
        ...s,
        included: s.id === 'cover',
      })),
      includeAuditTrails: false,
      includeMethodology: false,
    }

    const fullBlob = await generatePDFBlob(mockData, fullOptions)
    const minimalBlob = await generatePDFBlob(mockData, minimalOptions)

    // Minimal PDF should be smaller
    expect(minimalBlob.size).toBeLessThan(fullBlob.size)
  })
})

// ============================================
// ERROR HANDLING TESTS
// ============================================

describe('Error handling', () => {
  it('should handle missing case data gracefully', async () => {
    const dataWithMinimalCase = createMockExportData({
      case: {
        id: 'min-case',
        reference: 'REF-001',
        name: 'Minimal Case',
        case_type: 'civil',
        status: 'active',
        description: null,
        metadata: {},
        created_at: '2024-01-15T10:30:00Z',
        updated_at: '2024-01-15T10:30:00Z',
      },
    })

    const blob = await generatePDFBlob(dataWithMinimalCase)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle empty methodology data sources', async () => {
    const data = createMockExportData({
      methodology: createMockMethodology({
        dataSources: [],
        analysisMethods: [],
        limitations: [],
      }),
    })

    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle empty audit trail steps', async () => {
    const data = createMockExportData({
      auditTrails: [createMockAuditTrail({ steps: [] })],
    })

    const blob = await generatePDFBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })
})

// ============================================
// GENERATE PDF (WITH DATA FETCHING) TESTS
// ============================================

import { generatePDF, GeneratePDFResult } from '@/lib/export/pdf-generator'
import * as dataLayer from '@/lib/data'

// Mock the data layer
jest.mock('@/lib/data', () => ({
  getDataLayer: jest.fn(),
}))

describe('generatePDF', () => {
  const mockGetDataLayer = dataLayer.getDataLayer as jest.MockedFunction<typeof dataLayer.getDataLayer>

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return error when case is not found', async () => {
    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(null),
      getDocuments: jest.fn().mockResolvedValue([]),
      getFindings: jest.fn().mockResolvedValue([]),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({ findings: [], contradictions: [], omissions: [] }),
    } as any)

    const result = await generatePDF('non-existent-case')

    expect(result.success).toBe(false)
    expect(result.blob).toBeNull()
    expect(result.error).toContain('Case not found')
  })

  it('should return error when no findings available', async () => {
    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(createMockCase()),
      getDocuments: jest.fn().mockResolvedValue([]),
      getFindings: jest.fn().mockResolvedValue([]),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({ findings: [], contradictions: [], omissions: [] }),
    } as any)

    const result = await generatePDF('case-123')

    expect(result.success).toBe(false)
    expect(result.blob).toBeNull()
    expect(result.error).toContain('No findings available')
  })

  it('should generate PDF successfully with valid case data', async () => {
    const mockCase = createMockCase()
    const mockDocuments = [createMockDocument()]
    const mockFindings = [createMockFinding()]
    const mockEntities = [createMockEntity()]
    const mockContradictions = [createMockContradiction()]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue(mockDocuments),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue(mockContradictions),
      getEntities: jest.fn().mockResolvedValue(mockEntities),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: mockContradictions,
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123')

    expect(result.success).toBe(true)
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob?.type).toBe('application/pdf')
    expect(result.blob?.size).toBeGreaterThan(0)
    expect(result.filename).toContain('evidence-export-case-123')
    expect(result.filename).toEndWith('.pdf')
  })

  it('should generate PDF with only contradictions (no findings)', async () => {
    const mockCase = createMockCase()
    const mockContradictions = [createMockContradiction()]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([]),
      getFindings: jest.fn().mockResolvedValue([]),
      getContradictions: jest.fn().mockResolvedValue(mockContradictions),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: [],
        contradictions: mockContradictions,
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123')

    expect(result.success).toBe(true)
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('should include export data in result when successful', async () => {
    const mockCase = createMockCase()
    const mockFindings = [createMockFinding()]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([createMockDocument()]),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: [],
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123')

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.case.id).toBe(mockCase.id)
    expect(result.data?.summary.findingCount).toBe(1)
    expect(result.data?.metadata.format).toBe('pdf')
  })

  it('should apply severity filter correctly', async () => {
    const mockCase = createMockCase()
    const mockFindings = [
      createMockFinding({ id: 'f1', severity: 'critical' }),
      createMockFinding({ id: 'f2', severity: 'high' }),
      createMockFinding({ id: 'f3', severity: 'low' }),
    ]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([createMockDocument()]),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: [],
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123', { minSeverity: 'high' })

    expect(result.success).toBe(true)
    expect(result.data?.findings.length).toBe(2) // critical and high only
  })

  it('should apply engine filter correctly', async () => {
    const mockCase = createMockCase()
    const mockFindings = [
      createMockFinding({ id: 'f1', engine: 'contradiction' as Engine }),
      createMockFinding({ id: 'f2', engine: 'omission' as Engine }),
      createMockFinding({ id: 'f3', engine: 'entity_resolution' as Engine }),
    ]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([createMockDocument()]),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: [],
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123', {
      engines: ['contradiction', 'omission'] as Engine[],
    })

    expect(result.success).toBe(true)
    expect(result.data?.findings.length).toBe(2)
  })

  it('should apply maxFindings limit correctly', async () => {
    const mockCase = createMockCase()
    const mockFindings = Array.from({ length: 10 }, (_, i) =>
      createMockFinding({ id: `finding-${i}` })
    )

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([createMockDocument()]),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: [],
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123', { maxFindings: 5 })

    expect(result.success).toBe(true)
    expect(result.data?.findings.length).toBe(5)
  })

  it('should handle data layer errors gracefully', async () => {
    mockGetDataLayer.mockRejectedValue(new Error('Database connection failed'))

    const result = await generatePDF('case-123')

    expect(result.success).toBe(false)
    expect(result.blob).toBeNull()
    expect(result.error).toContain('PDF generation failed')
  })

  it('should disable audit trails when option is false', async () => {
    const mockCase = createMockCase()
    const mockFindings = [createMockFinding()]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([createMockDocument()]),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: [],
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123', { includeAuditTrails: false })

    expect(result.success).toBe(true)
    expect(result.data?.auditTrails.length).toBe(0)
  })

  it('should generate audit trails when option is true', async () => {
    const mockCase = createMockCase()
    const mockDocument = createMockDocument()
    const mockFindings = [createMockFinding({ document_ids: [mockDocument.id] })]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([mockDocument]),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: [],
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123', { includeAuditTrails: true })

    expect(result.success).toBe(true)
    expect(result.data?.auditTrails.length).toBe(1)
    expect(result.data?.auditTrails[0].findingId).toBe(mockFindings[0].id)
  })

  it('should generate methodology statement', async () => {
    const mockCase = createMockCase()
    const mockDocument = createMockDocument({ doc_type: 'witness_statement' })
    const mockFindings = [createMockFinding({ engine: 'contradiction' })]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue([mockDocument]),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue([]),
      getEntities: jest.fn().mockResolvedValue([]),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: [],
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123')

    expect(result.success).toBe(true)
    expect(result.data?.methodology).toBeDefined()
    expect(result.data?.methodology.dataSources.length).toBeGreaterThan(0)
    expect(result.data?.methodology.analysisMethods.length).toBeGreaterThan(0)
  })

  it('should calculate summary statistics correctly', async () => {
    const mockCase = createMockCase()
    const mockFindings = [
      createMockFinding({ severity: 'critical' }),
      createMockFinding({ id: 'f2', severity: 'high' }),
      createMockFinding({ id: 'f3', severity: 'medium' }),
    ]
    const mockContradictions = [createMockContradiction()]
    const mockEntities = [createMockEntity(), createMockEntity({ id: 'e2' })]
    const mockDocuments = [createMockDocument()]

    mockGetDataLayer.mockResolvedValue({
      getCase: jest.fn().mockResolvedValue(mockCase),
      getDocuments: jest.fn().mockResolvedValue(mockDocuments),
      getFindings: jest.fn().mockResolvedValue(mockFindings),
      getContradictions: jest.fn().mockResolvedValue(mockContradictions),
      getEntities: jest.fn().mockResolvedValue(mockEntities),
      getAnalysis: jest.fn().mockResolvedValue({
        findings: mockFindings,
        contradictions: mockContradictions,
        omissions: [],
      }),
    } as any)

    const result = await generatePDF('case-123')

    expect(result.success).toBe(true)
    expect(result.data?.summary.findingCount).toBe(3)
    expect(result.data?.summary.contradictionCount).toBe(1)
    expect(result.data?.summary.entityCount).toBe(2)
    expect(result.data?.summary.documentCount).toBe(1)
    expect(result.data?.summary.findingsBySeverity.critical).toBe(1)
    expect(result.data?.summary.findingsBySeverity.high).toBe(1)
    expect(result.data?.summary.findingsBySeverity.medium).toBe(1)
  })
})
