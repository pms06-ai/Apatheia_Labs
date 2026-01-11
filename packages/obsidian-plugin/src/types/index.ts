/**
 * Type definitions for Phronesis engine responses
 */

// Common types
export type Severity = 'critical' | 'high' | 'medium' | 'low'
export type CascadeType = 'SELF' | 'INTER_DOC' | 'TEMPORAL' | 'EVIDENTIARY' | 'MODALITY_SHIFT' | 'SELECTIVE_CITATION' | 'SCOPE_SHIFT' | 'UNEXPLAINED_CHANGE'

// Contradiction Engine
export interface ContradictionClaim {
  documentId: string
  documentName: string
  text: string
}

export interface ContradictionFinding {
  id: string
  type: 'direct' | 'temporal' | 'scope' | 'attribution'
  cascadeType: CascadeType
  severity: Severity
  claim1: ContradictionClaim
  claim2: ContradictionClaim
  explanation: string
  implication: string
  suggestedResolution?: string
}

export interface ContradictionResult {
  contradictions: ContradictionFinding[]
  claimClusters: unknown[]
  summary: {
    totalContradictions: number
    criticalCount: number
    mostContradictedTopics: string[]
    credibilityImpact: 'severe' | 'moderate' | 'minor' | 'none'
  }
}

// Omission Engine
export type OmissionCategory = 'exculpatory' | 'contextual' | 'procedural' | 'temporal' | 'contradicting'

export interface OmissionFinding {
  id: string
  category: OmissionCategory
  severity: Severity
  sourceDocumentId: string
  targetDocumentId: string
  omittedContent: string
  context: string
  biasDirection: 'prosecution' | 'defense' | 'neutral'
  impact: string
}

export interface OmissionResult {
  omissions: OmissionFinding[]
  biasScore: number
  summary: {
    totalOmissions: number
    byCategory: Record<OmissionCategory, number>
    overallBiasDirection: 'prosecution' | 'defense' | 'neutral'
  }
}

// Bias Engine
export interface BiasIndicator {
  indicator: string
  count: number
  examples: string[]
}

export interface BiasResult {
  framingRatio: number
  statisticalSignificance: {
    zScore: number
    pValue: number
  }
  biasIndicators: BiasIndicator[]
  summary: {
    overallBias: 'strong' | 'moderate' | 'weak' | 'none'
    direction: 'prosecution' | 'defense' | 'balanced'
    confidence: number
  }
}

// Entity Engine
export interface ResolvedEntity {
  id: string
  canonicalName: string
  type: 'person' | 'organization' | 'location'
  aliases: string[]
  mentions: { documentId: string; context: string }[]
  credibilityScore?: number
}

export interface EntityResult {
  entities: ResolvedEntity[]
  linkages: { entity1: string; entity2: string; relationship: string }[]
  summary: {
    totalEntities: number
    byType: { person: number; organization: number; location: number }
  }
}

// Timeline Engine
export interface TimelineEvent {
  id: string
  date: string
  description: string
  documentId: string
  documentName: string
  confidence: 'high' | 'medium' | 'low'
  actors?: string[]
}

export interface TimelineGap {
  startDate: string
  endDate: string
  duration: string
  significance: string
}

export interface TimelineAnomaly {
  type: 'sequence' | 'impossible' | 'suspicious_gap'
  description: string
  events: string[]
  severity: Severity
}

export interface TimelineResult {
  events: TimelineEvent[]
  gaps: TimelineGap[]
  anomalies: TimelineAnomaly[]
  summary: {
    totalEvents: number
    dateRange: { start: string; end: string }
    significantGaps: number
    anomalyCount: number
  }
}

// Argumentation Engine
export interface ToulminArgument {
  id: string
  claim: string
  grounds: string[]
  warrant?: string
  backing?: string
  qualifier?: string
  rebuttal?: string
  documentId: string
  strength: 'strong' | 'moderate' | 'weak'
}

export interface ArgumentChain {
  id: string
  arguments: ToulminArgument[]
  conclusion: string
  validity: 'valid' | 'questionable' | 'invalid'
}

export interface ArgumentationResult {
  arguments: ToulminArgument[]
  chains: ArgumentChain[]
  summary: {
    totalArguments: number
    strongArguments: number
    weakArguments: number
    logicalGaps: number
  }
}

// Accountability Engine
export interface StatutoryDuty {
  id: string
  statute: string
  section: string
  description: string
  applicableTo: string[]
}

export interface DutyBreach {
  id: string
  duty: StatutoryDuty
  breachDescription: string
  evidence: string[]
  severity: Severity
  documentId: string
}

export interface Remedy {
  type: 'complaint' | 'judicial_review' | 'ombudsman' | 'professional_referral'
  body: string
  basis: string
  timeLimit?: string
}

export interface AccountabilityResult {
  institution: string
  institutionType: string
  applicableDuties: StatutoryDuty[]
  breaches: DutyBreach[]
  remedies: Remedy[]
  summary: {
    totalBreaches: number
    criticalBreaches: number
    recommendedActions: string[]
  }
}

// Professional Engine
export interface ConductIncident {
  id: string
  description: string
  category: 'competence' | 'ethics' | 'communication' | 'record_keeping' | 'boundaries'
  severity: 'serious' | 'moderate' | 'minor'
  documentId: string
  context: string
}

export interface ProfessionalProfile {
  id: string
  name: string
  role: string
  registrationBody?: 'HCPC' | 'GMC' | 'NMC' | 'SRA' | 'SWE'
  incidents: ConductIncident[]
  overallAssessment: 'concerning' | 'questionable' | 'satisfactory'
}

export interface ReferralRecommendation {
  professional: string
  body: string
  grounds: string[]
  priority: 'urgent' | 'standard' | 'monitor'
}

export interface ProfessionalResult {
  profiles: ProfessionalProfile[]
  referrals: ReferralRecommendation[]
  summary: {
    totalProfessionals: number
    concerning: number
    incidentsByCategory: Record<string, number>
  }
}

// Documentary Engine
export interface DocumentaryFinding {
  id: string
  type: 'distortion' | 'omission' | 'decontextualization' | 'misattribution' | 'juxtaposition'
  severity: Severity
  broadcastContent: string
  sourceContent?: string
  explanation: string
  editorialImpact: string
}

export interface DocumentaryResult {
  findings: DocumentaryFinding[]
  framingAnalysis: {
    subjectFramingRatio: number
    positiveReferences: number
    negativeReferences: number
  }
  summary: {
    totalFindings: number
    criticalFindings: number
    overallBias: 'strong' | 'moderate' | 'weak' | 'balanced'
  }
}

// S.A.M. Pipeline
export interface SAMPhase {
  name: 'ANCHOR' | 'INHERIT' | 'COMPOUND' | 'ARRIVE'
  status: 'pending' | 'running' | 'complete' | 'error'
  findings: unknown[]
  summary?: string
}

export interface SAMResult {
  caseId: string
  phases: SAMPhase[]
  overallFindings: {
    contradictions: number
    omissions: number
    breaches: number
    recommendations: string[]
  }
  executionTime: number
}

// Union type for all engine results
export type EngineResult =
  | ContradictionResult
  | OmissionResult
  | BiasResult
  | EntityResult
  | TimelineResult
  | ArgumentationResult
  | AccountabilityResult
  | ProfessionalResult
  | DocumentaryResult
  | SAMResult

// Engine name type
export type EngineName =
  | 'contradiction'
  | 'omission'
  | 'bias'
  | 'entity'
  | 'timeline'
  | 'argumentation'
  | 'accountability'
  | 'professional'
  | 'documentary'
  | 'narrative'
  | 'coordination'
  | 'expert_witness'
  | 'sam'
