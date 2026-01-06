/**
 * MOCK FINDINGS FIXTURE
 *
 * Provides mock Finding objects for testing S.A.M. analysis engines.
 * Includes engine-specific finding types and database Finding type from CONTRACT.ts
 */

import type { Finding, Engine, Severity } from '@/CONTRACT'
import type { OmissionFinding, OmissionAnalysisResult } from '@/lib/engines/omission'
import type { ContradictionFinding, ContradictionAnalysisResult } from '@/lib/engines/contradiction'

// ============================================
// GENERIC FINDING FACTORY
// ============================================

/**
 * Create a mock database Finding with default values
 */
export function createMockFinding(overrides: Partial<Finding> = {}): Finding {
  const now = new Date().toISOString()
  const id = overrides.id || `finding-${Math.random().toString(36).substring(2, 10)}`

  return {
    id,
    case_id: 'test-case-001',
    engine: 'contradiction',
    title: 'Test Finding',
    description: 'A test finding for unit testing purposes.',
    finding_type: 'test',
    severity: 'medium',
    confidence: 0.85,
    document_ids: ['doc-001', 'doc-002'],
    entity_ids: [],
    regulatory_targets: [],
    evidence: {},
    metadata: {},
    created_at: now,
    ...overrides
  }
}

// ============================================
// OMISSION FINDINGS
// ============================================

/**
 * Create a mock OmissionFinding
 */
export function createMockOmissionFinding(overrides: Partial<OmissionFinding> = {}): OmissionFinding {
  return {
    id: `omission-${Math.random().toString(36).substring(2, 10)}`,
    type: 'complete_omission',
    severity: 'high',
    sourceDocId: 'doc-source-001',
    reportDocId: 'doc-report-001',
    sourceContent: 'The father has correctly attended all scheduled contact sessions since January.',
    reportContent: 'Father has had some contact.',
    omittedContent: 'The father has correctly attended all scheduled contact sessions since January.',
    biasDirection: 'pro_respondent',
    significance: 85,
    explanation: 'The report minimizes the consistency of contact, omitting the specific confirmation of full attendance.',
    pageRef: { source: 3, report: 5 },
    ...overrides
  }
}

/**
 * Create a mock OmissionAnalysisResult
 */
export function createMockOmissionAnalysisResult(overrides: Partial<OmissionAnalysisResult> = {}): OmissionAnalysisResult {
  const defaultFindings: OmissionFinding[] = [
    createMockOmissionFinding({
      id: 'omission-001',
      type: 'complete_omission',
      severity: 'critical',
      significance: 90,
    }),
    createMockOmissionFinding({
      id: 'omission-002',
      type: 'context_removal',
      severity: 'high',
      significance: 75,
      sourceContent: 'While there were initial concerns about hygiene, these have been largely addressed by the implementation of the new routine.',
      omittedContent: 'these have been largely addressed by the implementation of the new routine',
      reportContent: 'There were concerns about hygiene.',
      biasDirection: 'pro_authority',
    }),
    createMockOmissionFinding({
      id: 'omission-003',
      type: 'selective_quote',
      severity: 'medium',
      significance: 60,
    }),
  ]

  return {
    findings: overrides.findings || defaultFindings,
    summary: overrides.summary || {
      totalOmissions: defaultFindings.length,
      criticalCount: defaultFindings.filter(f => f.severity === 'critical').length,
      biasScore: 45,
      systematicPattern: true,
      affectedTopics: ['contact', 'hygiene', 'credibility'],
    },
    methodology: overrides.methodology || 'Source-to-report comparison with selective quoting detection',
  }
}

// ============================================
// CONTRADICTION FINDINGS
// ============================================

/**
 * Create a mock ContradictionFinding
 */
export function createMockContradictionFinding(overrides: Partial<ContradictionFinding> = {}): ContradictionFinding {
  return {
    id: `contradiction-${Math.random().toString(36).substring(2, 10)}`,
    type: 'direct',
    severity: 'critical',
    claim1: {
      documentId: 'doc-001',
      documentName: 'witness-statement-a.pdf',
      text: 'Subject was at home all night.',
      date: '2024-01-15T10:00:00Z',
      author: 'Officer A',
      pageRef: 2,
    },
    claim2: {
      documentId: 'doc-002',
      documentName: 'witness-statement-b.pdf',
      text: 'Subject was seen at the pub at 9pm.',
      date: '2024-01-16T14:30:00Z',
      author: 'Social Worker B',
      pageRef: 5,
    },
    explanation: "Direct contradiction regarding the subject's location on the night of the incident.",
    implication: "Undermines the credibility of the subject's alibi.",
    suggestedResolution: 'Verify CCTV footage or third-party witness statements.',
    ...overrides
  }
}

/**
 * Create a mock ContradictionAnalysisResult
 */
export function createMockContradictionAnalysisResult(overrides: Partial<ContradictionAnalysisResult> = {}): ContradictionAnalysisResult {
  const defaultContradictions: ContradictionFinding[] = [
    createMockContradictionFinding({
      id: 'contradiction-001',
      type: 'direct',
      severity: 'critical',
    }),
    createMockContradictionFinding({
      id: 'contradiction-002',
      type: 'temporal',
      severity: 'high',
      claim1: {
        documentId: 'doc-001',
        documentName: 'police-report.pdf',
        text: 'Incident occurred at 10:00 PM.',
        date: '2024-01-15T10:00:00Z',
      },
      claim2: {
        documentId: 'doc-003',
        documentName: 'ambulance-log.pdf',
        text: 'Ambulance called at 9:45 PM.',
        date: '2024-01-15T09:45:00Z',
      },
      explanation: 'Timeline inconsistency: Ambulance called before the stated incident time.',
      implication: 'Suggests the timeline of events is inaccurate or manipulated.',
      suggestedResolution: 'Cross-reference with emergency service call logs.',
    }),
    createMockContradictionFinding({
      id: 'contradiction-003',
      type: 'quantitative',
      severity: 'medium',
      claim1: {
        documentId: 'doc-001',
        documentName: 'report-a.pdf',
        text: 'Three witnesses were present.',
      },
      claim2: {
        documentId: 'doc-002',
        documentName: 'report-b.pdf',
        text: 'Five witnesses were present.',
      },
      explanation: 'Discrepancy in the number of witnesses reported.',
      implication: 'Suggests incomplete documentation or witness identification issues.',
    }),
  ]

  return {
    contradictions: overrides.contradictions || defaultContradictions,
    claimClusters: overrides.claimClusters || [
      {
        topic: 'Subject Location',
        claims: [
          { docId: 'doc-001', text: 'At home', stance: 'Defense' },
          { docId: 'doc-002', text: 'At pub', stance: 'Prosecution' },
        ],
        consensus: false,
      },
      {
        topic: 'Incident Timeline',
        claims: [
          { docId: 'doc-001', text: '10:00 PM', stance: 'Official' },
          { docId: 'doc-003', text: '9:45 PM', stance: 'Medical' },
        ],
        consensus: false,
      },
    ],
    summary: overrides.summary || {
      totalContradictions: defaultContradictions.length,
      criticalCount: defaultContradictions.filter(c => c.severity === 'critical').length,
      mostContradictedTopics: ['Subject Location', 'Incident Timeline'],
      credibilityImpact: 'severe',
    },
  }
}

// ============================================
// ENGINE-SPECIFIC FINDING PRESETS
// ============================================

/**
 * Preset findings for each engine type
 */
export const ENGINE_FINDINGS: Record<Engine, Finding> = {
  omission: createMockFinding({
    id: 'finding-omission-001',
    engine: 'omission',
    title: 'Critical omission detected',
    description: 'Key exculpatory evidence was omitted from the professional report.',
    severity: 'critical',
    confidence: 0.92,
    evidence: {
      type: 'complete_omission',
      sourceContent: 'All charges were dropped.',
      omittedContent: 'All charges were dropped.',
      biasDirection: 'pro_authority',
    },
  }),
  contradiction: createMockFinding({
    id: 'finding-contradiction-001',
    engine: 'contradiction',
    title: 'Direct contradiction in witness statements',
    description: 'Two witnesses provide mutually exclusive accounts of location.',
    severity: 'critical',
    confidence: 0.95,
    evidence: {
      type: 'direct',
      claim1: { text: 'Subject was at home' },
      claim2: { text: 'Subject was at pub' },
    },
  }),
  narrative: createMockFinding({
    id: 'finding-narrative-001',
    engine: 'narrative',
    title: 'Narrative drift detected',
    description: 'Claim escalated significantly across three documents.',
    severity: 'high',
    confidence: 0.88,
    evidence: {
      driftType: 'amplification',
      versions: 3,
    },
  }),
  coordination: createMockFinding({
    id: 'finding-coordination-001',
    engine: 'coordination',
    title: 'Potential coordination detected',
    description: 'Similar language patterns found across independent reports.',
    severity: 'medium',
    confidence: 0.75,
    evidence: {
      sharedPhrases: ['in my professional opinion', 'concerns were raised'],
      documentCount: 4,
    },
  }),
  expert_witness: createMockFinding({
    id: 'finding-expert-001',
    engine: 'expert_witness',
    title: 'Expert methodology concern',
    description: 'Expert failed to consider contradicting evidence.',
    severity: 'high',
    confidence: 0.82,
    evidence: {
      expertName: 'Dr. Smith',
      methodologyGap: 'Did not review police NFA outcome',
    },
  }),
  entity_resolution: createMockFinding({
    id: 'finding-entity-001',
    engine: 'entity_resolution',
    title: 'Entity alias discovered',
    description: 'Same person referred to by three different names.',
    severity: 'low',
    confidence: 0.90,
  }),
  temporal_parser: createMockFinding({
    id: 'finding-temporal-001',
    engine: 'temporal_parser',
    title: 'Timeline anomaly',
    description: 'Events recorded out of chronological order.',
    severity: 'medium',
    confidence: 0.85,
  }),
  argumentation: createMockFinding({
    id: 'finding-argumentation-001',
    engine: 'argumentation',
    title: 'Circular reasoning detected',
    description: 'Conclusion relies on premise derived from same conclusion.',
    severity: 'high',
    confidence: 0.78,
  }),
  bias_detection: createMockFinding({
    id: 'finding-bias-001',
    engine: 'bias_detection',
    title: 'Systematic bias pattern',
    description: 'Report consistently favors one party in language choice.',
    severity: 'medium',
    confidence: 0.72,
  }),
  accountability: createMockFinding({
    id: 'finding-accountability-001',
    engine: 'accountability',
    title: 'Professional standard breach',
    description: 'Social worker failed to follow statutory guidance.',
    severity: 'high',
    confidence: 0.88,
  }),
  professional_tracker: createMockFinding({
    id: 'finding-professional-001',
    engine: 'professional_tracker',
    title: 'Professional involvement pattern',
    description: 'Same expert appears in multiple related cases.',
    severity: 'info',
    confidence: 0.95,
  }),
  documentary: createMockFinding({
    id: 'finding-documentary-001',
    engine: 'documentary',
    title: 'Document authenticity concern',
    description: 'Metadata suggests document was modified after signing date.',
    severity: 'critical',
    confidence: 0.65,
  }),
  evidence_chain: createMockFinding({
    id: 'finding-evidence-001',
    engine: 'evidence_chain',
    title: 'Evidence chain gap',
    description: 'Missing link between primary source and final finding.',
    severity: 'high',
    confidence: 0.80,
  }),
}

// ============================================
// SEVERITY-BASED FINDING SETS
// ============================================

/**
 * Set of findings organized by severity
 */
export const FINDINGS_BY_SEVERITY: Record<Severity, Finding[]> = {
  critical: [
    createMockFinding({ id: 'critical-1', severity: 'critical', title: 'Critical Finding 1' }),
    createMockFinding({ id: 'critical-2', severity: 'critical', title: 'Critical Finding 2' }),
  ],
  high: [
    createMockFinding({ id: 'high-1', severity: 'high', title: 'High Severity Finding 1' }),
    createMockFinding({ id: 'high-2', severity: 'high', title: 'High Severity Finding 2' }),
    createMockFinding({ id: 'high-3', severity: 'high', title: 'High Severity Finding 3' }),
  ],
  medium: [
    createMockFinding({ id: 'medium-1', severity: 'medium', title: 'Medium Severity Finding 1' }),
    createMockFinding({ id: 'medium-2', severity: 'medium', title: 'Medium Severity Finding 2' }),
  ],
  low: [
    createMockFinding({ id: 'low-1', severity: 'low', title: 'Low Severity Finding 1' }),
  ],
  info: [
    createMockFinding({ id: 'info-1', severity: 'info', title: 'Informational Finding 1' }),
  ],
}

// ============================================
// EDGE CASE FINDINGS
// ============================================

/**
 * Empty findings result
 */
export const EMPTY_FINDINGS: Finding[] = []

/**
 * Finding with minimal data
 */
export const MINIMAL_FINDING = createMockFinding({
  id: 'minimal-001',
  description: null,
  finding_type: null,
  severity: null,
  confidence: null,
  document_ids: [],
  entity_ids: [],
  regulatory_targets: [],
  evidence: {},
  metadata: {},
})

/**
 * Finding with maximum data (all fields populated)
 */
export const MAXIMAL_FINDING = createMockFinding({
  id: 'maximal-001',
  title: 'Comprehensive Finding with All Data',
  description: 'This finding demonstrates all possible fields being populated for testing purposes.',
  finding_type: 'comprehensive_test',
  severity: 'critical',
  confidence: 0.99,
  document_ids: ['doc-001', 'doc-002', 'doc-003', 'doc-004', 'doc-005'],
  entity_ids: ['entity-001', 'entity-002', 'entity-003'],
  regulatory_targets: ['ofcom', 'iopc', 'ico'],
  evidence: {
    primaryEvidence: 'Direct quote from source',
    supportingEvidence: ['Supporting point 1', 'Supporting point 2'],
    methodology: 'AI-assisted analysis with human verification',
    confidence_breakdown: {
      linguistic: 0.95,
      contextual: 0.98,
      structural: 0.92,
    },
  },
  metadata: {
    analysis_version: '2.0',
    reviewed: true,
    reviewer: 'QA Team',
    tags: ['critical', 'verified', 'escalated'],
  },
})

// ============================================
// AI RESPONSE MOCKS
// ============================================

/**
 * Mock AI response for omission detection
 */
export const MOCK_AI_OMISSION_RESPONSE = {
  omissions: [
    {
      type: 'complete_omission',
      severity: 'critical',
      sourceContent: 'The father has correctly attended all scheduled contact sessions since January.',
      omittedContent: 'The father has correctly attended all scheduled contact sessions since January.',
      reportContent: 'Father has had some contact.',
      biasDirection: 'pro_respondent',
      significance: 85,
      explanation: 'The report minimizes the consistency of contact.',
      pageRef: { source: 3, report: 5 },
    },
  ],
  systematicPattern: true,
  overallBiasDirection: 'pro_authority',
}

/**
 * Mock AI response for contradiction detection
 */
export const MOCK_AI_CONTRADICTION_RESPONSE = {
  contradictions: [
    {
      type: 'direct',
      severity: 'critical',
      claim1: {
        documentId: 'doc-001',
        text: 'Subject was at home all night.',
        date: '2024-01-15T10:00:00Z',
        author: 'Officer A',
        pageRef: 2,
      },
      claim2: {
        documentId: 'doc-002',
        text: 'Subject was seen at the pub at 9pm.',
        date: '2024-01-16T14:30:00Z',
        author: 'Social Worker B',
        pageRef: 5,
      },
      explanation: 'Direct contradiction regarding location.',
      implication: 'Undermines credibility.',
      suggestedResolution: 'Verify with CCTV.',
    },
  ],
  claimClusters: [
    {
      topic: 'Subject Location',
      claims: [
        { docId: 'doc-001', text: 'At home', stance: 'Defense' },
        { docId: 'doc-002', text: 'At pub', stance: 'Prosecution' },
      ],
      consensus: false,
    },
  ],
}

/**
 * Mock AI error response
 */
export const MOCK_AI_ERROR_RESPONSE = {
  error: 'Rate limit exceeded',
  message: 'Please retry after 60 seconds',
  code: 'rate_limit_exceeded',
}

/**
 * Mock AI malformed response (for testing error handling)
 */
export const MOCK_AI_MALFORMED_RESPONSE = {
  result: 'unexpected_format',
  data: null,
}

// ============================================
// EXPORTS
// ============================================

export const mockFindings = {
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
}
