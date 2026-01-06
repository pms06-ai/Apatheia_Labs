/**
 * TEST FIXTURES INDEX
 *
 * Central export point for all test fixtures.
 * Import from '@/__tests__/fixtures' for convenience.
 */

// Mock Documents
export {
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
  MOCK_CASE_DOCUMENTS,
  MOCK_MINIMAL_DOCUMENTS,
  MOCK_CONTRADICTION_DOCUMENTS,
  MOCK_OMISSION_DOCUMENTS,
  MOCK_EMPTY_DOCUMENT,
  MOCK_UNICODE_DOCUMENT,
  MOCK_PARTIAL_DOCUMENT,
  mockDocuments,
} from './mock-documents'

export type { MockDocumentChunk } from './mock-documents'

// Mock Findings
export {
  createMockFinding,
  createMockOmissionFinding,
  createMockOmissionAnalysisResult,
  createMockContradictionFinding,
  createMockContradictionAnalysisResult,
  ENGINE_FINDINGS,
  FINDINGS_BY_SEVERITY,
  EMPTY_FINDINGS,
  MINIMAL_FINDING,
  MAXIMAL_FINDING,
  MOCK_AI_OMISSION_RESPONSE,
  MOCK_AI_CONTRADICTION_RESPONSE,
  MOCK_AI_ERROR_RESPONSE,
  MOCK_AI_MALFORMED_RESPONSE,
  mockFindings,
} from './mock-findings'
