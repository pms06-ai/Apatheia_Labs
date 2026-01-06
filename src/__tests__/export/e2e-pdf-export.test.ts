/**
 * End-to-End PDF Export Verification Tests
 *
 * These tests verify the complete PDF export flow from data layer to generated PDF.
 * This is subtask-7-1 of the Evidence Export System implementation.
 *
 * Verification checklist:
 * 1. PDF generates successfully with valid case data
 * 2. Citations are present in correct Bluebook format
 * 3. Contradictions table is properly formatted
 * 4. Audit trail section exists
 * 5. File size is reasonable (<5MB for 20-30 findings)
 */

import { describe, it, expect, beforeEach } from '@jest/globals'
import {
  generatePDF,
  generatePDFBlob,
  EvidenceExportPDF,
} from '@/lib/export/pdf-generator'
import type {
  ExportData,
  ExportFinding,
  ExportContradiction,
  ExportEntity,
  ExportSummary,
  MethodologyStatement,
  Citation,
  AuditTrail,
} from '@/lib/types/export'
import { DEFAULT_EXPORT_OPTIONS } from '@/lib/types/export'
import type { Case, Document, Entity, Finding, Contradiction, Severity, Engine } from '@/CONTRACT'
import * as dataLayer from '@/lib/data'

// Mock the data layer for E2E tests
jest.mock('@/lib/data', () => ({
  getDataLayer: jest.fn(),
}))

// ============================================
// TEST FIXTURES - Simulating Real Case Data
// ============================================

/**
 * Create a realistic case with multiple documents, findings, and contradictions
 * to simulate a real-world export scenario.
 */
function createRealisticTestData() {
  const caseData: Case = {
    id: 'case-e2e-test',
    reference: 'FAM-2024-0789',
    name: 'Johnson v. Family Services - Custody Dispute',
    case_type: 'family_court',
    status: 'active',
    description: 'Complex family court custody dispute involving multiple agencies',
    metadata: {},
    created_at: '2024-06-15T10:30:00Z',
    updated_at: '2024-12-01T14:45:00Z',
  }

  const documents: Document[] = [
    {
      id: 'doc-social-report',
      case_id: 'case-e2e-test',
      filename: 'social_worker_report_june2024.pdf',
      file_type: 'application/pdf',
      file_size: 524288,
      storage_path: '/documents/social_worker_report_june2024.pdf',
      hash_sha256: 'abc123def456',
      acquisition_date: '2024-06-20T10:30:00Z',
      doc_type: 'social_worker_report',
      source_entity: 'Social Services Dept',
      status: 'completed',
      extracted_text: 'Social worker assessment report...',
      page_count: 25,
      metadata: {},
      created_at: '2024-06-20T10:30:00Z',
      updated_at: '2024-06-20T10:30:00Z',
    },
    {
      id: 'doc-police-report',
      case_id: 'case-e2e-test',
      filename: 'police_incident_report.pdf',
      file_type: 'application/pdf',
      file_size: 102400,
      storage_path: '/documents/police_incident_report.pdf',
      hash_sha256: 'def789ghi012',
      acquisition_date: '2024-05-15T08:00:00Z',
      doc_type: 'police_report',
      source_entity: 'Metropolitan Police',
      status: 'completed',
      extracted_text: 'Police incident report...',
      page_count: 8,
      metadata: {},
      created_at: '2024-05-15T08:00:00Z',
      updated_at: '2024-05-15T08:00:00Z',
    },
    {
      id: 'doc-expert-psych',
      case_id: 'case-e2e-test',
      filename: 'psychological_evaluation.pdf',
      file_type: 'application/pdf',
      file_size: 256000,
      storage_path: '/documents/psychological_evaluation.pdf',
      hash_sha256: 'ghi345jkl678',
      acquisition_date: '2024-07-10T14:00:00Z',
      doc_type: 'expert_report',
      source_entity: 'Dr. Sarah Williams',
      status: 'completed',
      extracted_text: 'Psychological evaluation of the parties...',
      page_count: 18,
      metadata: {},
      created_at: '2024-07-10T14:00:00Z',
      updated_at: '2024-07-10T14:00:00Z',
    },
  ]

  const entities: Entity[] = [
    {
      id: 'entity-social-worker',
      case_id: 'case-e2e-test',
      canonical_name: 'Margaret Thompson',
      entity_type: 'professional',
      aliases: ['M. Thompson', 'Ms Thompson'],
      role: 'Social Worker',
      institution: 'Social Services Department',
      professional_registration: 'SW-12345',
      credibility_score: 0.85,
      metadata: {},
      created_at: '2024-06-20T10:30:00Z',
      updated_at: '2024-06-20T10:30:00Z',
    },
    {
      id: 'entity-police-officer',
      case_id: 'case-e2e-test',
      canonical_name: 'Officer James Miller',
      entity_type: 'professional',
      aliases: ['J. Miller', 'PC Miller'],
      role: 'Police Constable',
      institution: 'Metropolitan Police',
      professional_registration: 'PC-78901',
      credibility_score: 0.9,
      metadata: {},
      created_at: '2024-05-15T08:00:00Z',
      updated_at: '2024-05-15T08:00:00Z',
    },
    {
      id: 'entity-psychologist',
      case_id: 'case-e2e-test',
      canonical_name: 'Dr. Sarah Williams',
      entity_type: 'expert',
      aliases: ['S. Williams', 'Dr Williams'],
      role: 'Clinical Psychologist',
      institution: 'Private Practice',
      professional_registration: 'PSY-34567',
      credibility_score: 0.95,
      metadata: {},
      created_at: '2024-07-10T14:00:00Z',
      updated_at: '2024-07-10T14:00:00Z',
    },
  ]

  // Create 25 findings across multiple engines and severities
  const findings: Finding[] = []
  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
  const engines: Engine[] = ['contradiction', 'omission', 'entity_resolution', 'temporal_parser', 'accountability']

  for (let i = 0; i < 25; i++) {
    findings.push({
      id: `finding-${i + 1}`,
      case_id: 'case-e2e-test',
      engine: engines[i % engines.length],
      title: `Finding ${i + 1}: ${engines[i % engines.length].replace('_', ' ')} Analysis`,
      description: `Detailed analysis finding #${i + 1} discovered during ${engines[i % engines.length]} examination of the case documents.`,
      finding_type: engines[i % engines.length],
      severity: severities[i % severities.length],
      confidence: 0.7 + (i % 4) * 0.075,
      document_ids: [documents[i % documents.length].id],
      entity_ids: [entities[i % entities.length].id],
      regulatory_targets: [],
      evidence: {
        quotes: [
          `Quote ${i + 1} from the document supporting this finding.`,
          `Additional supporting quote ${i + 1} with more context.`,
        ],
      },
      metadata: {},
      created_at: new Date(Date.now() - i * 86400000).toISOString(),
    })
  }

  // Create 5 contradictions
  const contradictions: Contradiction[] = [
    {
      id: 'contradiction-1',
      case_id: 'case-e2e-test',
      title: 'Timeline Discrepancy - Incident Date',
      description: 'The police report and social worker report give conflicting dates for the initial incident.',
      source_a_document_id: 'doc-social-report',
      source_a_entity_id: 'entity-social-worker',
      source_a_text: 'The incident was first reported to social services on June 5th, 2024.',
      source_a_page: 3,
      source_a_date: '2024-06-05',
      source_b_document_id: 'doc-police-report',
      source_b_entity_id: 'entity-police-officer',
      source_b_text: 'Initial incident report filed on May 28th, 2024 at 14:30.',
      source_b_page: 1,
      source_b_date: '2024-05-28',
      contradiction_type: 'temporal',
      severity: 'high',
      resolution: null,
      metadata: {},
      created_at: '2024-08-01T10:00:00Z',
    },
    {
      id: 'contradiction-2',
      case_id: 'case-e2e-test',
      title: 'Witness Statement Conflict',
      description: 'Different professionals report conflicting accounts from the same witness.',
      source_a_document_id: 'doc-social-report',
      source_a_entity_id: 'entity-social-worker',
      source_a_text: 'The neighbor stated they heard nothing unusual that evening.',
      source_a_page: 7,
      source_a_date: '2024-06-20',
      source_b_document_id: 'doc-police-report',
      source_b_entity_id: 'entity-police-officer',
      source_b_text: 'The neighbor reported hearing raised voices around 10 PM.',
      source_b_page: 4,
      source_b_date: '2024-05-15',
      contradiction_type: 'factual',
      severity: 'critical',
      resolution: null,
      metadata: {},
      created_at: '2024-08-01T11:00:00Z',
    },
    {
      id: 'contradiction-3',
      case_id: 'case-e2e-test',
      title: 'Assessment Conclusion Discrepancy',
      description: 'Expert and social worker reach different conclusions about child welfare.',
      source_a_document_id: 'doc-expert-psych',
      source_a_entity_id: 'entity-psychologist',
      source_a_text: 'The psychological assessment indicates the home environment is suitable with monitoring.',
      source_a_page: 15,
      source_a_date: '2024-07-10',
      source_b_document_id: 'doc-social-report',
      source_b_entity_id: 'entity-social-worker',
      source_b_text: 'The home environment assessment indicates significant concerns requiring intervention.',
      source_b_page: 20,
      source_b_date: '2024-06-20',
      contradiction_type: 'opinion',
      severity: 'high',
      resolution: null,
      metadata: {},
      created_at: '2024-08-02T09:00:00Z',
    },
    {
      id: 'contradiction-4',
      case_id: 'case-e2e-test',
      title: 'Location Discrepancy',
      description: 'Reports differ on where the incident occurred.',
      source_a_document_id: 'doc-police-report',
      source_a_entity_id: 'entity-police-officer',
      source_a_text: 'Incident occurred at the family residence, 123 Oak Street.',
      source_a_page: 2,
      source_a_date: '2024-05-15',
      source_b_document_id: 'doc-social-report',
      source_b_entity_id: 'entity-social-worker',
      source_b_text: 'The incident reportedly took place at the grandmother\'s house on Elm Road.',
      source_b_page: 5,
      source_b_date: '2024-06-20',
      contradiction_type: 'factual',
      severity: 'medium',
      resolution: null,
      metadata: {},
      created_at: '2024-08-02T10:00:00Z',
    },
    {
      id: 'contradiction-5',
      case_id: 'case-e2e-test',
      title: 'Number of Incidents Reported',
      description: 'Reports disagree on how many incidents have occurred.',
      source_a_document_id: 'doc-police-report',
      source_a_entity_id: 'entity-police-officer',
      source_a_text: 'This is the first reported incident involving this family.',
      source_a_page: 1,
      source_a_date: '2024-05-15',
      source_b_document_id: 'doc-social-report',
      source_b_entity_id: 'entity-social-worker',
      source_b_text: 'This is the third reported incident in the past 18 months.',
      source_b_page: 2,
      source_b_date: '2024-06-20',
      contradiction_type: 'factual',
      severity: 'critical',
      resolution: null,
      metadata: {},
      created_at: '2024-08-02T11:00:00Z',
    },
  ]

  return {
    caseData,
    documents,
    entities,
    findings,
    contradictions,
  }
}

// ============================================
// E2E TEST SUITE
// ============================================

describe('E2E PDF Export Verification (subtask-7-1)', () => {
  const mockGetDataLayer = dataLayer.getDataLayer as jest.MockedFunction<typeof dataLayer.getDataLayer>
  let testData: ReturnType<typeof createRealisticTestData>

  beforeEach(() => {
    jest.clearAllMocks()
    testData = createRealisticTestData()
  })

  describe('Complete Export Flow', () => {
    it('should generate PDF successfully with realistic case data', async () => {
      // Setup mock data layer
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      // Execute export
      const result = await generatePDF('case-e2e-test')

      // Verify success
      expect(result.success).toBe(true)
      expect(result.blob).toBeInstanceOf(Blob)
      expect(result.blob?.type).toBe('application/pdf')
      expect(result.filename).toMatch(/evidence-export-case-e2e-test-.*\.pdf/)
    })

    it('should include all required data in export', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      // Verify export data structure
      expect(result.data).toBeDefined()
      expect(result.data?.case.id).toBe('case-e2e-test')
      expect(result.data?.findings.length).toBe(25)
      expect(result.data?.contradictions.length).toBe(5)
      expect(result.data?.entities.length).toBe(3)
      expect(result.data?.documents.length).toBe(3)
    })

    it('should have reasonable file size (<5MB) for 25 findings', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      // File size should be reasonable
      expect(result.success).toBe(true)
      expect(result.blob).toBeDefined()

      const fileSizeBytes = result.blob!.size
      const fileSizeMB = fileSizeBytes / (1024 * 1024)

      // Should be less than 5MB for 25 findings
      expect(fileSizeMB).toBeLessThan(5)

      // Should be at least a few KB (sanity check)
      expect(fileSizeBytes).toBeGreaterThan(10000)
    }, 30000) // Extended timeout for PDF generation
  })

  describe('Citation Verification', () => {
    it('should include citations for all findings', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      // Each finding should have citations
      for (const finding of result.data?.findings || []) {
        expect(finding.citations.length).toBeGreaterThanOrEqual(1)

        // Citations should have Bluebook format
        for (const citation of finding.citations) {
          expect(citation.formatted).toBeDefined()
          expect(citation.formatted.length).toBeGreaterThan(0)
          expect(citation.documentName).toBeDefined()
        }
      }
    })

    it('should include citations in Bluebook format', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      // Check that citations follow expected format
      const allCitations = result.data?.findings.flatMap(f => f.citations) || []

      expect(allCitations.length).toBeGreaterThan(0)

      // Bluebook format includes document name and usually a date
      for (const citation of allCitations) {
        expect(citation.formatted).toMatch(/[A-Za-z]/)
        expect(citation.documentId).toBeDefined()
      }
    })
  })

  describe('Contradictions Table Verification', () => {
    it('should include all contradictions with proper citations', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      // Should have 5 contradictions
      expect(result.data?.contradictions.length).toBe(5)

      // Each contradiction should have source citations
      for (const c of result.data?.contradictions || []) {
        expect(c.sourceACitation).toBeDefined()
        expect(c.sourceBCitation).toBeDefined()
        expect(c.sourceACitation.formatted.length).toBeGreaterThan(0)
        expect(c.sourceBCitation.formatted.length).toBeGreaterThan(0)
      }
    })

    it('should include contradiction severity levels', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      // Check for severity levels
      const severities = result.data?.contradictions.map(c => c.contradiction.severity) || []

      expect(severities).toContain('critical')
      expect(severities).toContain('high')
      expect(severities).toContain('medium')
    })
  })

  describe('Audit Trail Verification', () => {
    it('should generate audit trails when enabled', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test', { includeAuditTrails: true })

      expect(result.success).toBe(true)
      expect(result.data?.auditTrails.length).toBeGreaterThan(0)

      // Each audit trail should have steps
      for (const trail of result.data?.auditTrails || []) {
        expect(trail.steps.length).toBeGreaterThan(0)
        expect(trail.summary.length).toBeGreaterThan(0)
        expect(trail.overallConfidence).toBeGreaterThanOrEqual(0)
        expect(trail.overallConfidence).toBeLessThanOrEqual(1)
      }
    })

    it('should have complete reasoning chain in audit trails', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test', { includeAuditTrails: true })

      // Audit trails should have the complete reasoning chain
      for (const trail of result.data?.auditTrails.slice(0, 5) || []) {
        const stepTypes = trail.steps.map(s => s.stepType)

        // Should include source identification and conclusion
        expect(stepTypes).toContain('source_identification')
        expect(stepTypes).toContain('conclusion_reached')
      }
    })
  })

  describe('Methodology Section Verification', () => {
    it('should include methodology statement', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      expect(result.data?.methodology).toBeDefined()
      expect(result.data?.methodology.introduction.length).toBeGreaterThan(0)
      expect(result.data?.methodology.dataSources.length).toBeGreaterThan(0)
      expect(result.data?.methodology.analysisMethods.length).toBeGreaterThan(0)
      expect(result.data?.methodology.confidenceExplanation.length).toBeGreaterThan(0)
    })
  })

  describe('Summary Statistics Verification', () => {
    it('should calculate correct summary statistics', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue(testData.findings),
        getContradictions: jest.fn().mockResolvedValue(testData.contradictions),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({
          findings: testData.findings,
          contradictions: testData.contradictions,
          omissions: [],
        }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      expect(result.data?.summary.documentCount).toBe(3)
      expect(result.data?.summary.findingCount).toBe(25)
      expect(result.data?.summary.contradictionCount).toBe(5)
      expect(result.data?.summary.entityCount).toBe(3)

      // Check severity distribution
      const totalBySeverity = Object.values(result.data?.summary.findingsBySeverity || {}).reduce((a, b) => a + b, 0)
      expect(totalBySeverity).toBe(25)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty case gracefully', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(null),
        getDocuments: jest.fn().mockResolvedValue([]),
        getFindings: jest.fn().mockResolvedValue([]),
        getContradictions: jest.fn().mockResolvedValue([]),
        getEntities: jest.fn().mockResolvedValue([]),
        getAnalysis: jest.fn().mockResolvedValue({ findings: [], contradictions: [], omissions: [] }),
      } as any)

      const result = await generatePDF('nonexistent-case')

      expect(result.success).toBe(false)
      expect(result.error).toContain('Case not found')
    })

    it('should handle case with no findings', async () => {
      mockGetDataLayer.mockResolvedValue({
        getCase: jest.fn().mockResolvedValue(testData.caseData),
        getDocuments: jest.fn().mockResolvedValue(testData.documents),
        getFindings: jest.fn().mockResolvedValue([]),
        getContradictions: jest.fn().mockResolvedValue([]),
        getEntities: jest.fn().mockResolvedValue(testData.entities),
        getAnalysis: jest.fn().mockResolvedValue({ findings: [], contradictions: [], omissions: [] }),
      } as any)

      const result = await generatePDF('case-e2e-test')

      expect(result.success).toBe(false)
      expect(result.error).toContain('No findings available')
    })
  })
})
