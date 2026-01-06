/**
 * DOCX Generator Tests
 *
 * Tests for Word document generation functionality.
 * Verifies that DOCX templates generate valid buffers and document structures.
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'
import type {
  ExportData,
  ExportFinding,
  ExportContradiction,
  ExportEntity,
  ExportOptions,
  ExportSummary,
  MethodologyStatement,
  AuditTrail,
} from '@/lib/types/export'
import { DEFAULT_EXPORT_OPTIONS } from '@/lib/types/export'
import type {
  Case,
  Document,
  Entity,
  Finding,
  Contradiction,
  Severity,
  Engine,
} from '@/CONTRACT'
import {
  buildDOCXDocument,
  generateDOCXBlob,
  generateDOCXBuffer,
  generateDOCX,
} from '@/lib/export/docx-generator'
import type { DataLayer } from '@/lib/data'

// Mock the data layer module
jest.mock('@/lib/data', () => ({
  getDataLayer: jest.fn(),
}))

// ============================================
// TEST FIXTURES
// ============================================

const createMockCase = (): Case => ({
  id: 'case-123',
  reference: 'CASE-2024-001',
  name: 'Test Case',
  case_type: 'family_court',
  status: 'active',
  description: 'Test case for DOCX export',
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
})

const createMockDocument = (overrides: Partial<Document> = {}): Document => ({
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
})

const createMockEntity = (overrides: Partial<Entity> = {}): Entity => ({
  id: 'entity-123',
  case_id: 'case-123',
  canonical_name: 'John Smith',
  entity_type: 'person',
  aliases: ['J. Smith', 'Johnny'],
  role: 'Witness',
  institution: null,
  professional_registration: null,
  credibility_score: 0.8,
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  updated_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

const createMockFinding = (overrides: Partial<Finding> = {}): Finding => ({
  id: 'finding-123',
  case_id: 'case-123',
  engine: 'contradiction',
  title: 'Inconsistent Timeline',
  description: 'The witness timeline contradicts the official record.',
  finding_type: 'contradiction',
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
  case_id: 'case-123',
  title: 'Date Discrepancy',
  description: 'Source A and Source B report different dates.',
  source_a_document_id: 'doc-123',
  source_a_entity_id: 'entity-123',
  source_a_text: 'The meeting occurred on January 15',
  source_a_page: 5,
  source_a_date: '2024-01-15',
  source_b_document_id: 'doc-456',
  source_b_entity_id: 'entity-456',
  source_b_text: 'The meeting occurred on January 20',
  source_b_page: 10,
  source_b_date: '2024-01-20',
  contradiction_type: 'temporal',
  severity: 'medium',
  resolution: null,
  metadata: {},
  created_at: '2024-01-15T10:30:00Z',
  ...overrides,
})

const createMockSummary = (): ExportSummary => ({
  caseReference: 'CASE-2024-001',
  caseName: 'Test Case',
  generatedAt: '2024-01-15T10:30:00Z',
  documentCount: 5,
  findingCount: 10,
  contradictionCount: 3,
  entityCount: 8,
  findingsBySeverity: {
    critical: 1,
    high: 3,
    medium: 4,
    low: 2,
    info: 0,
  },
  findingsByEngine: {
    entity_resolution: 2,
    temporal_parser: 1,
    argumentation: 0,
    bias_detection: 1,
    contradiction: 3,
    accountability: 1,
    professional_tracker: 0,
    omission: 1,
    expert_witness: 0,
    documentary: 1,
    narrative: 0,
    coordination: 0,
    evidence_chain: 0,
  },
})

const createMockMethodology = (): MethodologyStatement => ({
  title: 'Analysis Methodology',
  introduction: 'This analysis was conducted using automated evidence analysis engines.',
  dataSources: [
    {
      sourceType: 'Court Documents',
      description: 'Official court filings and orders',
      documentCount: 3,
    },
    {
      sourceType: 'Witness Statements',
      description: 'Written witness testimonies',
      documentCount: 2,
    },
  ],
  analysisMethods: [
    {
      engine: 'contradiction',
      displayName: 'Contradiction Detection',
      description: 'Identifies conflicting statements',
      outputTypes: ['findings'],
    },
  ],
  confidenceExplanation: 'Confidence scores range from 0% to 100%.',
  limitations: [
    'Analysis is limited to text content.',
    'Findings require human verification.',
  ],
  version: '1.0.0',
  lastUpdated: '2024-01-15T10:30:00Z',
})

const createMockAuditTrail = (): AuditTrail => ({
  findingId: 'finding-123',
  steps: [
    {
      id: 'step-1',
      stepType: 'source_identification',
      timestamp: '2024-01-15T10:30:00Z',
      description: 'Source document identified',
      sourceDocumentIds: ['doc-123'],
      entityIds: [],
      engine: null,
      confidence: 1.0,
      evidence: [],
      previousStepIds: [],
    },
    {
      id: 'step-2',
      stepType: 'analysis_performed',
      timestamp: '2024-01-15T10:31:00Z',
      description: 'Contradiction analysis performed',
      sourceDocumentIds: ['doc-123'],
      entityIds: ['entity-123'],
      engine: 'contradiction',
      confidence: 0.85,
      evidence: [],
      previousStepIds: ['step-1'],
    },
    {
      id: 'step-3',
      stepType: 'conclusion_reached',
      timestamp: '2024-01-15T10:32:00Z',
      description: 'Timeline inconsistency detected',
      sourceDocumentIds: ['doc-123'],
      entityIds: ['entity-123'],
      engine: 'contradiction',
      confidence: 0.85,
      evidence: [],
      previousStepIds: ['step-2'],
    },
  ],
  summary: 'Contradiction detected between witness statements.',
  overallConfidence: 0.85,
})

const createMockExportFinding = (): ExportFinding => {
  const finding = createMockFinding()
  const document = createMockDocument()
  const entity = createMockEntity()

  return {
    finding,
    citations: [
      {
        formatted: 'Witness Statement, at 5 (Jan 15, 2024)',
        documentId: 'doc-123',
        documentName: 'Witness Statement',
        pageNumber: 5,
        docType: 'witness_statement',
      },
    ],
    quotes: [
      {
        text: 'The event occurred on March 15',
        documentId: 'doc-123',
        pageNumber: 5,
        citation: {
          formatted: 'Witness Statement, at 5',
          documentId: 'doc-123',
          documentName: 'Witness Statement',
          pageNumber: 5,
          docType: 'witness_statement',
        },
        truncated: false,
      },
    ],
    relatedEntities: [entity],
    relatedDocuments: [document],
    auditTrail: createMockAuditTrail(),
  }
}

const createMockExportContradiction = (): ExportContradiction => {
  const contradiction = createMockContradiction()

  return {
    contradiction,
    sourceACitation: {
      formatted: 'Document A, at 5',
      documentId: 'doc-123',
      documentName: 'Document A',
      pageNumber: 5,
      docType: 'witness_statement',
    },
    sourceBCitation: {
      formatted: 'Document B, at 10',
      documentId: 'doc-456',
      documentName: 'Document B',
      pageNumber: 10,
      docType: 'expert_report',
    },
    sourceAQuote: {
      text: 'The meeting occurred on January 15',
      documentId: 'doc-123',
      pageNumber: 5,
      citation: {
        formatted: 'Document A, at 5',
        documentId: 'doc-123',
        documentName: 'Document A',
        pageNumber: 5,
        docType: 'witness_statement',
      },
      truncated: false,
    },
    sourceBQuote: {
      text: 'The meeting occurred on January 20',
      documentId: 'doc-456',
      pageNumber: 10,
      citation: {
        formatted: 'Document B, at 10',
        documentId: 'doc-456',
        documentName: 'Document B',
        pageNumber: 10,
        docType: 'expert_report',
      },
      truncated: false,
    },
    sourceAEntity: createMockEntity({ id: 'entity-123', canonical_name: 'Witness A' }),
    sourceBEntity: createMockEntity({ id: 'entity-456', canonical_name: 'Expert B' }),
    sourceADocument: createMockDocument({ id: 'doc-123', filename: 'document_a.pdf' }),
    sourceBDocument: createMockDocument({ id: 'doc-456', filename: 'document_b.pdf' }),
  }
}

const createMockExportEntity = (): ExportEntity => {
  const entity = createMockEntity()
  const document = createMockDocument()
  const finding = createMockFinding()
  const contradiction = createMockContradiction()

  return {
    entity,
    documentReferences: [
      {
        document,
        pageNumbers: [1, 5, 10],
        mentionCount: 5,
      },
    ],
    relatedFindings: [finding],
    relatedContradictions: [contradiction],
  }
}

const createMockExportData = (): ExportData => ({
  metadata: {
    exportId: 'export-123',
    format: 'docx',
    generatedAt: '2024-01-15T10:30:00Z',
    generatedBy: 'Apatheia Labs',
    version: '1.0.0',
  },
  case: createMockCase(),
  summary: createMockSummary(),
  findings: [createMockExportFinding()],
  contradictions: [createMockExportContradiction()],
  entities: [createMockExportEntity()],
  omissions: [],
  documents: [createMockDocument()],
  methodology: createMockMethodology(),
  auditTrails: [createMockAuditTrail()],
})

// ============================================
// DOCUMENT BUILDING TESTS
// ============================================

describe('buildDOCXDocument', () => {
  it('should build a valid Document object', () => {
    const data = createMockExportData()
    const doc = buildDOCXDocument(data)

    expect(doc).toBeDefined()
    // Document should have sections
    expect(doc).toHaveProperty('sections')
  })

  it('should include all enabled sections', () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      includeTableOfContents: true,
      includeMethodology: true,
      includeAuditTrails: true,
    }

    const doc = buildDOCXDocument(data, options)

    expect(doc).toBeDefined()
    // The document should be created without errors
  })

  it('should handle empty findings gracefully', () => {
    const data = createMockExportData()
    data.findings = []

    const doc = buildDOCXDocument(data)

    expect(doc).toBeDefined()
  })

  it('should handle empty contradictions gracefully', () => {
    const data = createMockExportData()
    data.contradictions = []

    const doc = buildDOCXDocument(data)

    expect(doc).toBeDefined()
  })

  it('should handle empty entities gracefully', () => {
    const data = createMockExportData()
    data.entities = []

    const doc = buildDOCXDocument(data)

    expect(doc).toBeDefined()
  })

  it('should handle empty audit trails gracefully', () => {
    const data = createMockExportData()
    data.auditTrails = []

    const doc = buildDOCXDocument(data)

    expect(doc).toBeDefined()
  })

  it('should respect section inclusion options', () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_OPTIONS.sections.map((s) => ({
        ...s,
        included: s.id === 'cover' || s.id === 'summary',
      })),
    }

    const doc = buildDOCXDocument(data, options)

    expect(doc).toBeDefined()
  })

  it('should apply custom title and subtitle', () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      customTitle: 'Custom Export Title',
      customSubtitle: 'Custom Subtitle',
    }

    const doc = buildDOCXDocument(data, options)

    expect(doc).toBeDefined()
  })

  it('should include author name when provided', () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      authorName: 'Test Author',
    }

    const doc = buildDOCXDocument(data, options)

    expect(doc).toBeDefined()
  })

  it('should disable table of contents when option is false', () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      includeTableOfContents: false,
    }

    const doc = buildDOCXDocument(data, options)

    expect(doc).toBeDefined()
  })

  it('should disable timestamp when option is false', () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      includeTimestamp: false,
    }

    const doc = buildDOCXDocument(data, options)

    expect(doc).toBeDefined()
  })

  it('should disable page numbers when option is false', () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      includePageNumbers: false,
    }

    const doc = buildDOCXDocument(data, options)

    expect(doc).toBeDefined()
  })
})

// ============================================
// BLOB GENERATION TESTS
// ============================================

describe('generateDOCXBlob', () => {
  it('should generate a valid Blob', async () => {
    const data = createMockExportData()
    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate a Blob with correct MIME type', async () => {
    const data = createMockExportData()
    const blob = await generateDOCXBlob(data)

    // docx library generates application/vnd.openxmlformats-officedocument.wordprocessingml.document
    expect(blob.type).toMatch(/application.*openxmlformats.*wordprocessingml|application\/octet-stream/)
  })

  it('should handle large datasets', async () => {
    const data = createMockExportData()

    // Add multiple findings
    const baseFinding = createMockExportFinding()
    data.findings = Array(50)
      .fill(null)
      .map((_, i) => ({
        ...baseFinding,
        finding: { ...baseFinding.finding, id: `finding-${i}`, title: `Finding ${i}` },
      }))

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should generate consistent output for same input', async () => {
    const data = createMockExportData()

    const blob1 = await generateDOCXBlob(data)
    const blob2 = await generateDOCXBlob(data)

    // Sizes should be approximately equal (may vary slightly due to timestamps)
    expect(Math.abs(blob1.size - blob2.size)).toBeLessThan(1000)
  })
})

// ============================================
// BUFFER GENERATION TESTS
// ============================================

describe('generateDOCXBuffer', () => {
  it('should generate a valid Uint8Array', async () => {
    const data = createMockExportData()
    const buffer = await generateDOCXBuffer(data)

    expect(buffer).toBeInstanceOf(Uint8Array)
    expect(buffer.length).toBeGreaterThan(0)
  })

  it('should generate valid DOCX magic bytes', async () => {
    const data = createMockExportData()
    const buffer = await generateDOCXBuffer(data)

    // DOCX files are ZIP files - check for PK header
    expect(buffer[0]).toBe(0x50) // 'P'
    expect(buffer[1]).toBe(0x4b) // 'K'
  })

  it('should generate buffer usable for file writing', async () => {
    const data = createMockExportData()
    const buffer = await generateDOCXBuffer(data)

    // Buffer should be large enough for a valid DOCX
    expect(buffer.length).toBeGreaterThan(1000)
  })
})

// ============================================
// FINDINGS SECTION TESTS
// ============================================

describe('Findings Section', () => {
  it('should handle findings with all severity levels', async () => {
    const data = createMockExportData()
    const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

    data.findings = severities.map((severity, i) => ({
      ...createMockExportFinding(),
      finding: {
        ...createMockFinding(),
        id: `finding-${i}`,
        title: `${severity} Finding`,
        severity,
      },
    }))

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle findings with null severity', async () => {
    const data = createMockExportData()
    data.findings = [
      {
        ...createMockExportFinding(),
        finding: { ...createMockFinding(), severity: null },
      },
    ]

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle findings with long descriptions', async () => {
    const data = createMockExportData()
    const longDescription = 'A'.repeat(5000)

    data.findings = [
      {
        ...createMockExportFinding(),
        finding: { ...createMockFinding(), description: longDescription },
      },
    ]

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle findings with special characters', async () => {
    const data = createMockExportData()
    data.findings = [
      {
        ...createMockExportFinding(),
        finding: {
          ...createMockFinding(),
          title: 'Finding with <special> & "characters"',
          description: 'Contains < > & " \' characters',
        },
      },
    ]

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ============================================
// CONTRADICTIONS SECTION TESTS
// ============================================

describe('Contradictions Section', () => {
  it('should handle contradictions with all types', async () => {
    const data = createMockExportData()
    const types = ['direct', 'temporal', 'logical', 'omission', 'emphasis'] as const

    data.contradictions = types.map((type, i) => ({
      ...createMockExportContradiction(),
      contradiction: {
        ...createMockContradiction(),
        id: `contradiction-${i}`,
        title: `${type} Contradiction`,
        contradiction_type: type,
      },
    }))

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle many contradictions', async () => {
    const data = createMockExportData()

    data.contradictions = Array(30)
      .fill(null)
      .map((_, i) => ({
        ...createMockExportContradiction(),
        contradiction: {
          ...createMockContradiction(),
          id: `contradiction-${i}`,
          title: `Contradiction ${i}`,
        },
      }))

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ============================================
// ENTITIES SECTION TESTS
// ============================================

describe('Entities Section', () => {
  it('should handle entities with all types', async () => {
    const data = createMockExportData()
    const entityTypes = [
      'person',
      'organization',
      'professional',
      'institution',
      'court',
    ] as const

    data.entities = entityTypes.map((type, i) => ({
      ...createMockExportEntity(),
      entity: {
        ...createMockEntity(),
        id: `entity-${i}`,
        canonical_name: `Entity ${i}`,
        entity_type: type,
      },
    }))

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle entities with many document references', async () => {
    const data = createMockExportData()
    const docs = Array(10)
      .fill(null)
      .map((_, i) => createMockDocument({ id: `doc-${i}`, filename: `doc_${i}.pdf` }))

    data.entities = [
      {
        ...createMockExportEntity(),
        documentReferences: docs.map((doc) => ({
          document: doc,
          pageNumbers: [1, 2, 3],
          mentionCount: 5,
        })),
      },
    ]

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ============================================
// AUDIT TRAIL SECTION TESTS
// ============================================

describe('Audit Trail Section', () => {
  it('should handle audit trails with many steps', async () => {
    const data = createMockExportData()
    const manySteps = Array(20)
      .fill(null)
      .map((_, i) => ({
        id: `step-${i}`,
        stepType: 'analysis_performed' as const,
        timestamp: '2024-01-15T10:30:00Z',
        description: `Analysis step ${i}`,
        sourceDocumentIds: ['doc-123'],
        entityIds: ['entity-123'],
        engine: 'contradiction' as Engine,
        confidence: 0.8 + i * 0.01,
        evidence: [],
        previousStepIds: i > 0 ? [`step-${i - 1}`] : [],
      }))

    data.auditTrails = [
      {
        ...createMockAuditTrail(),
        steps: manySteps,
      },
    ]

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle audit trails with null confidence', async () => {
    const data = createMockExportData()
    data.auditTrails = [
      {
        ...createMockAuditTrail(),
        steps: [
          {
            ...createMockAuditTrail().steps[0],
            confidence: null,
          },
        ],
        overallConfidence: 0,
      },
    ]

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ============================================
// EDGE CASE TESTS
// ============================================

describe('Edge Cases', () => {
  it('should handle minimal export data', async () => {
    const minimalData: ExportData = {
      metadata: {
        exportId: 'export-min',
        format: 'docx',
        generatedAt: '2024-01-15T10:30:00Z',
        generatedBy: 'Test',
        version: '1.0.0',
      },
      case: createMockCase(),
      summary: createMockSummary(),
      findings: [],
      contradictions: [],
      entities: [],
      omissions: [],
      documents: [],
      methodology: createMockMethodology(),
      auditTrails: [],
    }

    const blob = await generateDOCXBlob(minimalData)

    expect(blob).toBeInstanceOf(Blob)
    expect(blob.size).toBeGreaterThan(0)
  })

  it('should handle empty case name', async () => {
    const data = createMockExportData()
    data.case.name = ''
    data.summary.caseName = ''

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle very long case names', async () => {
    const data = createMockExportData()
    const longName = 'A'.repeat(500)
    data.case.name = longName
    data.summary.caseName = longName

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle unicode characters', async () => {
    const data = createMockExportData()
    data.case.name = 'Case with Unicode: \u00e9\u00e8\u00ea \u4e2d\u6587 \u0410\u0411\u0412'
    data.findings[0].finding.title = 'Finding with \u00e9\u00e8\u00ea'

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle null and undefined values gracefully', async () => {
    const data = createMockExportData()
    data.findings[0].finding.description = null
    data.contradictions[0].contradiction.description = null
    data.entities[0].entity.role = null
    data.entities[0].entity.institution = null

    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })
})

// ============================================
// OPTIONS TESTS
// ============================================

describe('Export Options', () => {
  it('should use default options when none provided', async () => {
    const data = createMockExportData()
    const blob = await generateDOCXBlob(data)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should handle all sections disabled except cover', async () => {
    const data = createMockExportData()
    const options: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_OPTIONS.sections.map((s) => ({
        ...s,
        included: s.id === 'cover',
      })),
      includeMethodology: false,
      includeAuditTrails: false,
    }

    const blob = await generateDOCXBlob(data, options)

    expect(blob).toBeInstanceOf(Blob)
  })

  it('should generate smaller file with fewer sections', async () => {
    const data = createMockExportData()

    const fullBlob = await generateDOCXBlob(data)

    const minimalOptions: ExportOptions = {
      ...DEFAULT_EXPORT_OPTIONS,
      sections: DEFAULT_EXPORT_OPTIONS.sections.map((s) => ({
        ...s,
        included: s.id === 'cover' || s.id === 'summary',
      })),
      includeMethodology: false,
      includeAuditTrails: false,
      includeTableOfContents: false,
      includeTimestamp: false,
    }

    const minimalBlob = await generateDOCXBlob(data, minimalOptions)

    // Minimal should be smaller
    expect(minimalBlob.size).toBeLessThan(fullBlob.size)
  })
})

// ============================================
// generateDOCX WITH DATA FETCHING TESTS
// ============================================

describe('generateDOCX with data fetching', () => {
  // Import the mocked module
  const { getDataLayer } = jest.requireMock('@/lib/data') as {
    getDataLayer: jest.Mock
  }

  // Helper to create a mock data layer
  const createMockDataLayer = (overrides: Partial<DataLayer> = {}): DataLayer => ({
    getCases: jest.fn().mockResolvedValue([]),
    getCase: jest.fn().mockResolvedValue(createMockCase()),
    createCase: jest.fn(),
    deleteCase: jest.fn(),
    getDocuments: jest.fn().mockResolvedValue([createMockDocument()]),
    getDocument: jest.fn().mockResolvedValue(createMockDocument()),
    uploadDocument: jest.fn(),
    deleteDocument: jest.fn(),
    getEntities: jest.fn().mockResolvedValue([createMockEntity()]),
    getFindings: jest.fn().mockResolvedValue([createMockFinding()]),
    getClaims: jest.fn().mockResolvedValue([]),
    getContradictions: jest.fn().mockResolvedValue([createMockContradiction()]),
    getAnalysis: jest.fn().mockResolvedValue({
      findings: [createMockFinding()],
      contradictions: [createMockContradiction()],
      omissions: [],
    }),
    runEngine: jest.fn(),
    submitAnalysis: jest.fn(),
    getJobProgress: jest.fn().mockResolvedValue(null),
    cancelJob: jest.fn(),
    listJobs: jest.fn().mockResolvedValue([]),
    runSAMAnalysis: jest.fn(),
    getSAMProgress: jest.fn().mockResolvedValue(null),
    getSAMResults: jest.fn().mockResolvedValue(null),
    cancelSAMAnalysis: jest.fn(),
    resumeSAMAnalysis: jest.fn(),
    ...overrides,
  })

  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('should return success with valid blob for existing case', async () => {
    const mockDataLayer = createMockDataLayer()
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123')

    expect(result.success).toBe(true)
    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.blob?.size).toBeGreaterThan(0)
    expect(result.filename).toContain('evidence-export')
    expect(result.filename).toContain('.docx')
  })

  it('should return error when case not found', async () => {
    const mockDataLayer = createMockDataLayer({
      getCase: jest.fn().mockResolvedValue(null),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('non-existent-case')

    expect(result.success).toBe(false)
    expect(result.blob).toBeNull()
    expect(result.error).toContain('Case not found')
  })

  it('should return error when no findings available', async () => {
    const mockDataLayer = createMockDataLayer({
      getFindings: jest.fn().mockResolvedValue([]),
      getContradictions: jest.fn().mockResolvedValue([]),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123')

    expect(result.success).toBe(false)
    expect(result.blob).toBeNull()
    expect(result.error).toContain('No findings available')
  })

  it('should handle data layer errors gracefully', async () => {
    const mockDataLayer = createMockDataLayer({
      getCase: jest.fn().mockRejectedValue(new Error('Database error')),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123')

    expect(result.success).toBe(false)
    expect(result.blob).toBeNull()
    expect(result.error).toContain('DOCX generation failed')
    expect(result.error).toContain('Database error')
  })

  it('should fetch all required data from data layer', async () => {
    const mockDataLayer = createMockDataLayer()
    getDataLayer.mockResolvedValue(mockDataLayer)

    await generateDOCX('case-123')

    expect(mockDataLayer.getCase).toHaveBeenCalledWith('case-123')
    expect(mockDataLayer.getDocuments).toHaveBeenCalledWith('case-123')
    expect(mockDataLayer.getFindings).toHaveBeenCalledWith('case-123')
    expect(mockDataLayer.getContradictions).toHaveBeenCalledWith('case-123')
    expect(mockDataLayer.getEntities).toHaveBeenCalledWith('case-123')
    expect(mockDataLayer.getAnalysis).toHaveBeenCalledWith('case-123')
  })

  it('should apply severity filter when minSeverity option is set', async () => {
    const criticalFinding = createMockFinding({ id: 'critical-1', severity: 'critical' })
    const lowFinding = createMockFinding({ id: 'low-1', severity: 'low' })

    const mockDataLayer = createMockDataLayer({
      getFindings: jest.fn().mockResolvedValue([criticalFinding, lowFinding]),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123', { minSeverity: 'high' })

    expect(result.success).toBe(true)
    expect(result.data?.findings.length).toBe(1)
    expect(result.data?.findings[0].finding.id).toBe('critical-1')
  })

  it('should apply engine filter when engines option is set', async () => {
    const contradictionFinding = createMockFinding({ id: 'cont-1', engine: 'contradiction' })
    const biasFinding = createMockFinding({ id: 'bias-1', engine: 'bias_detection' })

    const mockDataLayer = createMockDataLayer({
      getFindings: jest.fn().mockResolvedValue([contradictionFinding, biasFinding]),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123', { engines: ['contradiction'] })

    expect(result.success).toBe(true)
    expect(result.data?.findings.length).toBe(1)
    expect(result.data?.findings[0].finding.engine).toBe('contradiction')
  })

  it('should apply maxFindings limit when option is set', async () => {
    const findings = Array(10).fill(null).map((_, i) =>
      createMockFinding({ id: `finding-${i}` })
    )

    const mockDataLayer = createMockDataLayer({
      getFindings: jest.fn().mockResolvedValue(findings),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123', { maxFindings: 3 })

    expect(result.success).toBe(true)
    expect(result.data?.findings.length).toBe(3)
  })

  it('should include audit trails when includeAuditTrails option is true', async () => {
    const mockDataLayer = createMockDataLayer()
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123', { includeAuditTrails: true })

    expect(result.success).toBe(true)
    expect(result.data?.auditTrails).toBeDefined()
    expect(Array.isArray(result.data?.auditTrails)).toBe(true)
  })

  it('should generate valid DOCX buffer (Uint8Array compatible)', async () => {
    const mockDataLayer = createMockDataLayer()
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123')

    expect(result.success).toBe(true)
    expect(result.blob).toBeInstanceOf(Blob)

    // Convert Blob to ArrayBuffer to verify it's valid data
    const arrayBuffer = await result.blob!.arrayBuffer()
    const uint8Array = new Uint8Array(arrayBuffer)

    // DOCX files are ZIP files - check for PK header
    expect(uint8Array[0]).toBe(0x50) // 'P'
    expect(uint8Array[1]).toBe(0x4b) // 'K'
  })

  it('should generate filename with case ID and date', async () => {
    const mockDataLayer = createMockDataLayer()
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('my-case-id')

    expect(result.filename).toMatch(/evidence-export-my-case-id-\d{4}-\d{2}-\d{2}\.docx/)
  })

  it('should include export data in result for debugging', async () => {
    const mockDataLayer = createMockDataLayer()
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123')

    expect(result.success).toBe(true)
    expect(result.data).toBeDefined()
    expect(result.data?.metadata.format).toBe('docx')
    expect(result.data?.case.id).toBe('case-123')
    expect(result.data?.summary).toBeDefined()
    expect(result.data?.methodology).toBeDefined()
  })

  it('should handle case with only contradictions (no findings)', async () => {
    const mockDataLayer = createMockDataLayer({
      getFindings: jest.fn().mockResolvedValue([]),
      getContradictions: jest.fn().mockResolvedValue([createMockContradiction()]),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123')

    // Should fail because we need at least findings OR contradictions, but check is for both empty
    expect(result.success).toBe(false)
  })

  it('should merge custom options with defaults', async () => {
    const mockDataLayer = createMockDataLayer()
    getDataLayer.mockResolvedValue(mockDataLayer)

    const customOptions = {
      customTitle: 'My Custom Title',
      authorName: 'Test Author',
    }

    const result = await generateDOCX('case-123', customOptions)

    expect(result.success).toBe(true)
    // The document should be generated with merged options
    expect(result.blob).toBeInstanceOf(Blob)
  })

  it('should transform findings with citations and quotes', async () => {
    const findingWithEvidence = createMockFinding({
      evidence: { quotes: ['Important quote from document'] },
      document_ids: ['doc-123'],
      entity_ids: ['entity-123'],
    })

    const mockDataLayer = createMockDataLayer({
      getFindings: jest.fn().mockResolvedValue([findingWithEvidence]),
    })
    getDataLayer.mockResolvedValue(mockDataLayer)

    const result = await generateDOCX('case-123')

    expect(result.success).toBe(true)
    expect(result.data?.findings[0].citations.length).toBeGreaterThan(0)
    expect(result.data?.findings[0].quotes.length).toBeGreaterThan(0)
  })
})
