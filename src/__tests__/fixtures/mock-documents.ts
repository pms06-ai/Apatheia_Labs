/**
 * MOCK DOCUMENTS FIXTURE
 *
 * Provides mock Document objects for testing S.A.M. analysis engines.
 * These fixtures follow the Document type from CONTRACT.ts
 */

import type { Document, DocType, ProcessingStatus } from '@/CONTRACT'

// ============================================
// MOCK DOCUMENT FACTORY
// ============================================

/**
 * Create a mock document with default values
 */
export function createMockDocument(overrides: Partial<Document> = {}): Document {
  const now = new Date().toISOString()
  const id = overrides.id || `doc-${Math.random().toString(36).substring(2, 10)}`

  return {
    id,
    case_id: 'test-case-001',
    filename: 'test-document.pdf',
    file_type: 'application/pdf',
    file_size: 1024000,
    storage_path: `/cases/test-case-001/documents/${id}.pdf`,
    hash_sha256: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    acquisition_date: now,
    doc_type: 'other',
    source_entity: null,
    status: 'completed',
    extracted_text: 'Test document content for analysis.',
    page_count: 10,
    metadata: {},
    created_at: now,
    updated_at: now,
    ...overrides
  }
}

// ============================================
// DOCUMENT TYPE PRESETS
// ============================================

/**
 * Create a mock witness statement document
 */
export function createMockWitnessStatement(overrides: Partial<Document> = {}): Document {
  return createMockDocument({
    filename: 'witness-statement-001.pdf',
    doc_type: 'witness_statement',
    extracted_text: `WITNESS STATEMENT

I, John Smith, make this statement in relation to the matter concerning the events of January 15, 2024.

On the day in question, I observed the subject at approximately 9:00 PM at the local pub.
The subject appeared to be in good spirits and was socializing with several individuals.
I can confirm the subject left the premises at around 11:30 PM.

This statement is true to the best of my knowledge and belief.

Signed: John Smith
Date: January 20, 2024`,
    page_count: 2,
    source_entity: 'witness-john-smith',
    ...overrides
  })
}

/**
 * Create a mock expert report document
 */
export function createMockExpertReport(overrides: Partial<Document> = {}): Document {
  return createMockDocument({
    filename: 'expert-report-dr-jones.pdf',
    doc_type: 'expert_report',
    extracted_text: `EXPERT PSYCHOLOGICAL ASSESSMENT

Prepared by: Dr. Sarah Jones, Chartered Clinical Psychologist
Date: February 1, 2024
Re: Assessment of Subject A

METHODOLOGY
I conducted three assessment sessions with Subject A over a period of two weeks.
My assessment included standardized psychological tests and clinical interviews.

FINDINGS
Based on my assessment, I conclude that Subject A demonstrates no signs of
psychological disorder that would affect their parenting capacity.

The allegations against Subject A appear to be unfounded based on my clinical evaluation.
There were initial concerns about hygiene, but these have been largely addressed
by the implementation of the new routine.

RECOMMENDATIONS
I recommend that Subject A maintain regular contact with the children.

Dr. Sarah Jones
Registration: HCPC PYL123456`,
    page_count: 15,
    source_entity: 'expert-dr-jones',
    ...overrides
  })
}

/**
 * Create a mock police bundle document
 */
export function createMockPoliceBundle(overrides: Partial<Document> = {}): Document {
  return createMockDocument({
    filename: 'police-bundle-investigation-2024.pdf',
    doc_type: 'police_bundle',
    extracted_text: `POLICE INVESTIGATION SUMMARY

Operation Reference: OP/2024/1234
Date: January 25, 2024
Investigating Officer: DC Michael Brown

SUMMARY OF INVESTIGATION
Following reports received on January 10, 2024, an investigation was conducted
into allegations concerning Subject A.

INVESTIGATION OUTCOME
After thorough investigation including witness interviews and evidence gathering,
No Further Action (NFA) was determined to be appropriate.

The investigation found insufficient evidence to support the allegations made.
All witnesses interviewed provided consistent accounts that contradicted the
initial allegations.

CONCLUSION
Case closed - NFA
Date closed: January 25, 2024`,
    page_count: 25,
    source_entity: 'police-force-metropolitan',
    ...overrides
  })
}

/**
 * Create a mock social work assessment document
 */
export function createMockSocialWorkAssessment(overrides: Partial<Document> = {}): Document {
  return createMockDocument({
    filename: 'social-work-assessment-final.pdf',
    doc_type: 'social_work_assessment',
    extracted_text: `SOCIAL WORK ASSESSMENT

Case Reference: SW/2024/5678
Social Worker: Jane Wilson
Assessment Date: February 10, 2024

BACKGROUND
This assessment was conducted following referral from the court dated January 5, 2024.

OBSERVATIONS
During home visits, the children appeared well-cared for and happy.
Subject A demonstrated appropriate parenting skills throughout observations.
The father has correctly attended all scheduled contact sessions since January.

CONCERNS
There were concerns about hygiene. (Note: Previously addressed per expert report)

RECOMMENDATIONS
Contact arrangements should continue as currently ordered.
No safeguarding concerns identified at this time.

Social Worker: Jane Wilson
Date: February 10, 2024`,
    page_count: 20,
    source_entity: 'social-services-local-authority',
    ...overrides
  })
}

/**
 * Create a mock court order document
 */
export function createMockCourtOrder(overrides: Partial<Document> = {}): Document {
  return createMockDocument({
    filename: 'court-order-2024-final.pdf',
    doc_type: 'court_order',
    extracted_text: `IN THE FAMILY COURT
Case Number: FC/2024/9999

ORDER

Before His Honour Judge Williams
Date: February 20, 2024

IT IS ORDERED THAT:

1. The children shall live with Mother.
2. The Father shall have contact with the children every other weekend.
3. All parties shall comply with the recommendations in the social work assessment.
4. The matter is adjourned for review in 6 months.

Dated: February 20, 2024
Judge Williams`,
    page_count: 5,
    source_entity: 'family-court',
    ...overrides
  })
}

/**
 * Create a mock transcript document
 */
export function createMockTranscript(overrides: Partial<Document> = {}): Document {
  return createMockDocument({
    filename: 'hearing-transcript-2024.pdf',
    doc_type: 'transcript',
    extracted_text: `TRANSCRIPT OF PROCEEDINGS

Case: FC/2024/9999
Date: February 15, 2024
Before: His Honour Judge Williams

JUDGE: Good morning. We are here to consider the contact arrangements.

COUNSEL FOR APPLICANT: Your Honour, the father has demonstrated full compliance
with all contact sessions since January.

JUDGE: I have read the social work assessment. The incident occurred at 10:00 PM.
The social worker's observations appear positive.

COUNSEL FOR RESPONDENT: We note the police investigation resulted in NFA.
The ambulance was called at 9:45 PM, before the alleged incident.

JUDGE: That timeline discrepancy is concerning. We will need clarification.

[END OF EXCERPT]`,
    page_count: 50,
    source_entity: 'court-reporter',
    ...overrides
  })
}

/**
 * Create a mock disclosure document
 */
export function createMockDisclosure(overrides: Partial<Document> = {}): Document {
  return createMockDocument({
    filename: 'disclosure-schedule-2024.pdf',
    doc_type: 'disclosure',
    extracted_text: `SCHEDULE OF DISCLOSURE

Case Reference: FC/2024/9999
Party: Applicant Father
Date: January 30, 2024

DOCUMENTS DISCLOSED:

1. Police Investigation Summary (25 pages)
2. GP Records (10 pages)
3. School Reports (5 pages)
4. Employment Records (3 pages)
5. Bank Statements (12 pages)
6. Character References (8 pages)

Total: 63 pages

I confirm that I have disclosed all documents in my possession relevant to this matter.

Signed: Applicant Father
Date: January 30, 2024`,
    page_count: 3,
    source_entity: 'applicant',
    ...overrides
  })
}

// ============================================
// MOCK DOCUMENT SETS
// ============================================

/**
 * Standard test case document set
 * Contains a variety of document types for comprehensive testing
 */
export const MOCK_CASE_DOCUMENTS: Document[] = [
  createMockPoliceBundle({ id: 'doc-police-001', created_at: '2024-01-25T10:00:00Z' }),
  createMockWitnessStatement({ id: 'doc-witness-001', created_at: '2024-01-20T14:00:00Z' }),
  createMockExpertReport({ id: 'doc-expert-001', created_at: '2024-02-01T09:00:00Z' }),
  createMockSocialWorkAssessment({ id: 'doc-sw-001', created_at: '2024-02-10T11:00:00Z' }),
  createMockCourtOrder({ id: 'doc-order-001', created_at: '2024-02-20T15:00:00Z' }),
]

/**
 * Minimal document set for basic testing
 */
export const MOCK_MINIMAL_DOCUMENTS: Document[] = [
  createMockDocument({ id: 'doc-source-001', doc_type: 'witness_statement' }),
  createMockDocument({ id: 'doc-report-001', doc_type: 'expert_report' }),
]

/**
 * Documents with known contradictions for testing contradiction engine
 */
export const MOCK_CONTRADICTION_DOCUMENTS: Document[] = [
  createMockDocument({
    id: 'doc-contradiction-a',
    filename: 'statement-officer-a.pdf',
    doc_type: 'witness_statement',
    extracted_text: 'Subject was at home all night on January 15, 2024. Multiple neighbors confirmed seeing lights on.',
    created_at: '2024-01-16T10:00:00Z'
  }),
  createMockDocument({
    id: 'doc-contradiction-b',
    filename: 'statement-witness-b.pdf',
    doc_type: 'witness_statement',
    extracted_text: 'I saw the subject at the pub at 9:00 PM on January 15, 2024. They stayed until closing time.',
    created_at: '2024-01-17T14:30:00Z'
  }),
  createMockDocument({
    id: 'doc-contradiction-c',
    filename: 'ambulance-report.pdf',
    doc_type: 'other',
    extracted_text: 'Ambulance called at 9:45 PM on January 15, 2024. Incident reported as occurring at 10:00 PM.',
    created_at: '2024-01-16T08:00:00Z'
  }),
]

/**
 * Documents with known omissions for testing omission engine
 */
export const MOCK_OMISSION_DOCUMENTS = {
  source: createMockDocument({
    id: 'doc-omission-source',
    filename: 'original-police-report.pdf',
    doc_type: 'police_bundle',
    extracted_text: `ORIGINAL POLICE REPORT

The father has correctly attended all scheduled contact sessions since January.
The investigation found no evidence of wrongdoing.
All witnesses provided statements supporting the father's account.
The case was closed with No Further Action (NFA).`,
    created_at: '2024-01-20T10:00:00Z'
  }),
  report: createMockDocument({
    id: 'doc-omission-report',
    filename: 'social-worker-summary.pdf',
    doc_type: 'social_work_assessment',
    extracted_text: `SOCIAL WORKER SUMMARY

Father has had some contact.
There were concerns raised during the police investigation.
The case is being monitored.`,
    created_at: '2024-02-01T14:00:00Z'
  })
}

// ============================================
// EDGE CASE DOCUMENTS
// ============================================

/**
 * Empty document for edge case testing
 */
export const MOCK_EMPTY_DOCUMENT = createMockDocument({
  id: 'doc-empty-001',
  filename: 'empty-document.pdf',
  extracted_text: '',
  page_count: 0,
})

/**
 * Document with unicode and special characters
 */
export const MOCK_UNICODE_DOCUMENT = createMockDocument({
  id: 'doc-unicode-001',
  filename: 'unicode-test-document.pdf',
  extracted_text: `DOCUMENT WITH SPECIAL CHARACTERS

Name: Jean-Pierre O'Brien-Muller
Address: 123 Rue de la Paix, Paris
Amount: 1,000.00 EUR
Notes: The defendant said "I didn't do it!"

Special symbols: @ # $ % & * + = < >
Accented: cafe resume naive
Emojis: Test content
Chinese:
Arabic:
Russian: `,
})

/**
 * Very large document for stress testing
 */
export function createMockLargeDocument(paragraphs: number = 1000): Document {
  const content = Array(paragraphs)
    .fill(null)
    .map((_, i) => `Paragraph ${i + 1}: This is test content for stress testing the analysis engines. It contains various statements and claims that may or may not be relevant to the case. The purpose is to test how the engines handle large volumes of text.`)
    .join('\n\n')

  return createMockDocument({
    id: 'doc-large-001',
    filename: 'large-document.pdf',
    extracted_text: content,
    page_count: Math.ceil(paragraphs / 3),
    file_size: content.length,
  })
}

/**
 * Document with null/undefined fields for edge case testing
 */
export const MOCK_PARTIAL_DOCUMENT = createMockDocument({
  id: 'doc-partial-001',
  filename: 'partial-document.pdf',
  doc_type: null,
  source_entity: null,
  extracted_text: null,
  page_count: null,
  file_size: null,
})

// ============================================
// DOCUMENT CHUNKS
// ============================================

export interface MockDocumentChunk {
  id: string
  document_id: string
  chunk_index: number
  content: string
  page_number: number | null
  embedding: number[] | null
  metadata: Record<string, unknown>
  created_at: string
}

/**
 * Create mock document chunks for a document
 */
export function createMockChunks(documentId: string, contents: string[]): MockDocumentChunk[] {
  return contents.map((content, index) => ({
    id: `chunk-${documentId}-${index}`,
    document_id: documentId,
    chunk_index: index,
    content,
    page_number: Math.floor(index / 2) + 1,
    embedding: null,
    metadata: {},
    created_at: new Date().toISOString(),
  }))
}

// ============================================
// EXPORTS
// ============================================

export const mockDocuments = {
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
}
