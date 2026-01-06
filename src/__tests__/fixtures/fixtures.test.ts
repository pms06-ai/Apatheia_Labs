/**
 * FIXTURES EXPORT TESTS
 *
 * Verifies that all test fixtures export correctly and have expected shapes.
 */

import {
  // Document factories
  createMockDocument,
  createMockWitnessStatement,
  createMockExpertReport,
  createMockPoliceBundle,
  createMockSocialWorkAssessment,
  createMockCourtOrder,
  createMockTranscript,
  createMockDisclosure,
  createMockLargeDocument,
  createMockChunks,
  // Document presets
  MOCK_CASE_DOCUMENTS,
  MOCK_MINIMAL_DOCUMENTS,
  MOCK_CONTRADICTION_DOCUMENTS,
  MOCK_OMISSION_DOCUMENTS,
  MOCK_EMPTY_DOCUMENT,
  MOCK_UNICODE_DOCUMENT,
  MOCK_PARTIAL_DOCUMENT,
  // Finding factories
  createMockFinding,
  createMockOmissionFinding,
  createMockOmissionAnalysisResult,
  createMockContradictionFinding,
  createMockContradictionAnalysisResult,
  // Finding presets
  ENGINE_FINDINGS,
  FINDINGS_BY_SEVERITY,
  EMPTY_FINDINGS,
  MINIMAL_FINDING,
  MAXIMAL_FINDING,
  // AI response mocks
  MOCK_AI_OMISSION_RESPONSE,
  MOCK_AI_CONTRADICTION_RESPONSE,
  MOCK_AI_ERROR_RESPONSE,
  MOCK_AI_MALFORMED_RESPONSE,
} from './index'

describe('Test Fixtures', () => {
  describe('Mock Documents', () => {
    describe('createMockDocument', () => {
      it('should create a document with default values', () => {
        const doc = createMockDocument()

        expect(doc).toHaveProperty('id')
        expect(doc).toHaveProperty('case_id')
        expect(doc).toHaveProperty('filename')
        expect(doc).toHaveProperty('file_type')
        expect(doc).toHaveProperty('storage_path')
        expect(doc).toHaveProperty('hash_sha256')
        expect(doc).toHaveProperty('status')
        expect(doc).toHaveProperty('created_at')
        expect(doc).toHaveProperty('updated_at')
      })

      it('should allow overriding default values', () => {
        const doc = createMockDocument({
          id: 'custom-id',
          filename: 'custom.pdf',
          doc_type: 'court_order',
        })

        expect(doc.id).toBe('custom-id')
        expect(doc.filename).toBe('custom.pdf')
        expect(doc.doc_type).toBe('court_order')
      })

      it('should generate unique IDs for each document', () => {
        const doc1 = createMockDocument()
        const doc2 = createMockDocument()

        expect(doc1.id).not.toBe(doc2.id)
      })
    })

    describe('Document Type Factories', () => {
      it('should create witness statement with correct doc_type', () => {
        const doc = createMockWitnessStatement()
        expect(doc.doc_type).toBe('witness_statement')
        expect(doc.extracted_text).toContain('WITNESS STATEMENT')
      })

      it('should create expert report with correct doc_type', () => {
        const doc = createMockExpertReport()
        expect(doc.doc_type).toBe('expert_report')
        expect(doc.extracted_text).toContain('EXPERT')
      })

      it('should create police bundle with correct doc_type', () => {
        const doc = createMockPoliceBundle()
        expect(doc.doc_type).toBe('police_bundle')
        expect(doc.extracted_text).toContain('POLICE')
      })

      it('should create social work assessment with correct doc_type', () => {
        const doc = createMockSocialWorkAssessment()
        expect(doc.doc_type).toBe('social_work_assessment')
        expect(doc.extracted_text).toContain('SOCIAL WORK')
      })

      it('should create court order with correct doc_type', () => {
        const doc = createMockCourtOrder()
        expect(doc.doc_type).toBe('court_order')
        expect(doc.extracted_text).toContain('ORDER')
      })

      it('should create transcript with correct doc_type', () => {
        const doc = createMockTranscript()
        expect(doc.doc_type).toBe('transcript')
        expect(doc.extracted_text).toContain('TRANSCRIPT')
      })

      it('should create disclosure with correct doc_type', () => {
        const doc = createMockDisclosure()
        expect(doc.doc_type).toBe('disclosure')
        expect(doc.extracted_text).toContain('DISCLOSURE')
      })
    })

    describe('Document Presets', () => {
      it('should have MOCK_CASE_DOCUMENTS with 5 documents', () => {
        expect(MOCK_CASE_DOCUMENTS).toHaveLength(5)
        expect(MOCK_CASE_DOCUMENTS.every(doc => doc.id)).toBe(true)
      })

      it('should have MOCK_MINIMAL_DOCUMENTS with 2 documents', () => {
        expect(MOCK_MINIMAL_DOCUMENTS).toHaveLength(2)
      })

      it('should have MOCK_CONTRADICTION_DOCUMENTS with 3 documents', () => {
        expect(MOCK_CONTRADICTION_DOCUMENTS).toHaveLength(3)
      })

      it('should have MOCK_OMISSION_DOCUMENTS with source and report', () => {
        expect(MOCK_OMISSION_DOCUMENTS.source).toBeDefined()
        expect(MOCK_OMISSION_DOCUMENTS.report).toBeDefined()
        expect(MOCK_OMISSION_DOCUMENTS.source.doc_type).toBe('police_bundle')
        expect(MOCK_OMISSION_DOCUMENTS.report.doc_type).toBe('social_work_assessment')
      })

      it('should have MOCK_EMPTY_DOCUMENT with empty content', () => {
        expect(MOCK_EMPTY_DOCUMENT.extracted_text).toBe('')
        expect(MOCK_EMPTY_DOCUMENT.page_count).toBe(0)
      })

      it('should have MOCK_UNICODE_DOCUMENT with special characters', () => {
        expect(MOCK_UNICODE_DOCUMENT.extracted_text).toContain("O'Brien")
        expect(MOCK_UNICODE_DOCUMENT.extracted_text).toContain('@')
      })

      it('should have MOCK_PARTIAL_DOCUMENT with null fields', () => {
        expect(MOCK_PARTIAL_DOCUMENT.doc_type).toBeNull()
        expect(MOCK_PARTIAL_DOCUMENT.extracted_text).toBeNull()
      })
    })

    describe('createMockLargeDocument', () => {
      it('should create document with specified number of paragraphs', () => {
        const doc = createMockLargeDocument(100)
        const paragraphCount = (doc.extracted_text?.match(/Paragraph \d+:/g) || []).length
        expect(paragraphCount).toBe(100)
      })

      it('should default to 1000 paragraphs', () => {
        const doc = createMockLargeDocument()
        expect(doc.extracted_text?.length).toBeGreaterThan(100000)
      })
    })

    describe('createMockChunks', () => {
      it('should create chunks for a document', () => {
        const chunks = createMockChunks('doc-001', ['Content 1', 'Content 2', 'Content 3'])

        expect(chunks).toHaveLength(3)
        expect(chunks[0].document_id).toBe('doc-001')
        expect(chunks[0].chunk_index).toBe(0)
        expect(chunks[1].chunk_index).toBe(1)
        expect(chunks[2].chunk_index).toBe(2)
      })

      it('should assign page numbers based on chunk index', () => {
        const chunks = createMockChunks('doc-001', ['C1', 'C2', 'C3', 'C4'])

        expect(chunks[0].page_number).toBe(1)
        expect(chunks[1].page_number).toBe(1)
        expect(chunks[2].page_number).toBe(2)
        expect(chunks[3].page_number).toBe(2)
      })
    })
  })

  describe('Mock Findings', () => {
    describe('createMockFinding', () => {
      it('should create a finding with default values', () => {
        const finding = createMockFinding()

        expect(finding).toHaveProperty('id')
        expect(finding).toHaveProperty('case_id')
        expect(finding).toHaveProperty('engine')
        expect(finding).toHaveProperty('title')
        expect(finding).toHaveProperty('severity')
        expect(finding).toHaveProperty('confidence')
        expect(finding).toHaveProperty('document_ids')
        expect(finding).toHaveProperty('created_at')
      })

      it('should allow overriding default values', () => {
        const finding = createMockFinding({
          id: 'custom-finding',
          engine: 'omission',
          severity: 'critical',
        })

        expect(finding.id).toBe('custom-finding')
        expect(finding.engine).toBe('omission')
        expect(finding.severity).toBe('critical')
      })
    })

    describe('Omission Findings', () => {
      it('should create mock omission finding', () => {
        const finding = createMockOmissionFinding()

        expect(finding).toHaveProperty('type')
        expect(finding).toHaveProperty('severity')
        expect(finding).toHaveProperty('sourceDocId')
        expect(finding).toHaveProperty('reportDocId')
        expect(finding).toHaveProperty('sourceContent')
        expect(finding).toHaveProperty('omittedContent')
        expect(finding).toHaveProperty('explanation')
      })

      it('should create mock omission analysis result', () => {
        const result = createMockOmissionAnalysisResult()

        expect(result).toHaveProperty('findings')
        expect(result).toHaveProperty('summary')
        expect(result).toHaveProperty('methodology')
        expect(result.findings.length).toBeGreaterThan(0)
        expect(result.summary.totalOmissions).toBe(result.findings.length)
      })
    })

    describe('Contradiction Findings', () => {
      it('should create mock contradiction finding', () => {
        const finding = createMockContradictionFinding()

        expect(finding).toHaveProperty('type')
        expect(finding).toHaveProperty('severity')
        expect(finding).toHaveProperty('claim1')
        expect(finding).toHaveProperty('claim2')
        expect(finding).toHaveProperty('explanation')
        expect(finding).toHaveProperty('implication')
        expect(finding.claim1).toHaveProperty('documentId')
        expect(finding.claim2).toHaveProperty('documentId')
      })

      it('should create mock contradiction analysis result', () => {
        const result = createMockContradictionAnalysisResult()

        expect(result).toHaveProperty('contradictions')
        expect(result).toHaveProperty('claimClusters')
        expect(result).toHaveProperty('summary')
        expect(result.contradictions.length).toBeGreaterThan(0)
        expect(result.summary.totalContradictions).toBe(result.contradictions.length)
      })
    })

    describe('ENGINE_FINDINGS', () => {
      it('should have findings for all engine types', () => {
        const expectedEngines = [
          'omission', 'contradiction', 'narrative', 'coordination',
          'expert_witness', 'entity_resolution', 'temporal_parser',
          'argumentation', 'bias_detection', 'accountability',
          'professional_tracker', 'documentary', 'evidence_chain'
        ]

        expectedEngines.forEach(engine => {
          expect(ENGINE_FINDINGS[engine as keyof typeof ENGINE_FINDINGS]).toBeDefined()
          expect(ENGINE_FINDINGS[engine as keyof typeof ENGINE_FINDINGS].engine).toBe(engine)
        })
      })
    })

    describe('FINDINGS_BY_SEVERITY', () => {
      it('should have findings organized by severity', () => {
        expect(FINDINGS_BY_SEVERITY.critical).toBeDefined()
        expect(FINDINGS_BY_SEVERITY.high).toBeDefined()
        expect(FINDINGS_BY_SEVERITY.medium).toBeDefined()
        expect(FINDINGS_BY_SEVERITY.low).toBeDefined()
        expect(FINDINGS_BY_SEVERITY.info).toBeDefined()

        FINDINGS_BY_SEVERITY.critical.forEach(f => expect(f.severity).toBe('critical'))
        FINDINGS_BY_SEVERITY.high.forEach(f => expect(f.severity).toBe('high'))
        FINDINGS_BY_SEVERITY.medium.forEach(f => expect(f.severity).toBe('medium'))
        FINDINGS_BY_SEVERITY.low.forEach(f => expect(f.severity).toBe('low'))
        FINDINGS_BY_SEVERITY.info.forEach(f => expect(f.severity).toBe('info'))
      })
    })

    describe('Edge Case Findings', () => {
      it('should have EMPTY_FINDINGS as empty array', () => {
        expect(EMPTY_FINDINGS).toEqual([])
      })

      it('should have MINIMAL_FINDING with null/empty fields', () => {
        expect(MINIMAL_FINDING.description).toBeNull()
        expect(MINIMAL_FINDING.document_ids).toEqual([])
      })

      it('should have MAXIMAL_FINDING with all fields populated', () => {
        expect(MAXIMAL_FINDING.confidence).toBe(0.99)
        expect(MAXIMAL_FINDING.document_ids.length).toBe(5)
        expect(MAXIMAL_FINDING.entity_ids.length).toBe(3)
        expect(MAXIMAL_FINDING.regulatory_targets.length).toBe(3)
        expect(Object.keys(MAXIMAL_FINDING.evidence).length).toBeGreaterThan(0)
      })
    })

    describe('AI Response Mocks', () => {
      it('should have MOCK_AI_OMISSION_RESPONSE with expected structure', () => {
        expect(MOCK_AI_OMISSION_RESPONSE).toHaveProperty('omissions')
        expect(MOCK_AI_OMISSION_RESPONSE).toHaveProperty('systematicPattern')
        expect(MOCK_AI_OMISSION_RESPONSE.omissions).toBeInstanceOf(Array)
      })

      it('should have MOCK_AI_CONTRADICTION_RESPONSE with expected structure', () => {
        expect(MOCK_AI_CONTRADICTION_RESPONSE).toHaveProperty('contradictions')
        expect(MOCK_AI_CONTRADICTION_RESPONSE).toHaveProperty('claimClusters')
        expect(MOCK_AI_CONTRADICTION_RESPONSE.contradictions).toBeInstanceOf(Array)
      })

      it('should have MOCK_AI_ERROR_RESPONSE for error testing', () => {
        expect(MOCK_AI_ERROR_RESPONSE).toHaveProperty('error')
        expect(MOCK_AI_ERROR_RESPONSE).toHaveProperty('code')
      })

      it('should have MOCK_AI_MALFORMED_RESPONSE for error handling tests', () => {
        expect(MOCK_AI_MALFORMED_RESPONSE).toHaveProperty('result')
        expect(MOCK_AI_MALFORMED_RESPONSE.result).toBe('unexpected_format')
      })
    })
  })
})
