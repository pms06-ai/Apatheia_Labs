/**
 * DOCUMENTARY ANALYSIS ENGINE (Δ - Delta)
 * "Broadcast vs Source Comparison"
 *
 * Forensically compares broadcast content against source materials to identify:
 * - Editorial manipulation and selective editing
 * - Framing ratios and imbalance
 * - Consent violations and right of reply failures
 * - Screen time distribution bias
 *
 * Core Question: Does the broadcast accurately represent the source material?
 */

import { generateJSON } from '@/lib/ai-client'
import type { Document } from '@/CONTRACT'

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type EditorialTechnique =
  | 'selective_editing'
  | 'misleading_framing'
  | 'emotional_manipulation'
  | 'juxtaposition_bias'
  | 'omission_of_context'
  | 'leading_narration'
  | 'music_visual_priming'
  | 'false_balance'
  | 'ambush_interview'
  | 'consent_violation'

export type PartyType = 'subject' | 'cleared' | 'accuser' | 'defender' | 'neutral'

export interface FramingRatio {
  party1: { label: string; type: PartyType; screenTime: number; claimCount: number }
  party2: { label: string; type: PartyType; screenTime: number; claimCount: number }
  ratio: number
  zScore: number
  pValue: number
  significant: boolean
  interpretation: string
}

export interface ScreenTimeAnalysis {
  parties: Array<{
    name: string
    type: PartyType
    totalSeconds: number
    percentage: number
    speakingSeconds: number
    visualOnlySeconds: number
  }>
  totalDuration: number
  imbalanceScore: number // 0-100
  conclusion: string
}

export interface EditorialFinding {
  id: string
  technique: EditorialTechnique
  severity: 'critical' | 'high' | 'medium' | 'low'
  description: string
  sourceContent?: string
  broadcastContent?: string
  omittedContent?: string
  beneficiary: PartyType
  timestamp?: string
  evidence: string
  ofcomRelevance?: {
    section: string
    rule: string
    explanation: string
  }
}

export interface ConsentAnalysis {
  subjectName: string
  consentGiven: boolean
  consentWithdrawn: boolean
  withdrawalDate?: string
  withdrawalMethod?: string
  broadcastedAnyway: boolean
  documentedRefusals: number
  evidence: Array<{
    date: string
    type: 'refusal' | 'objection' | 'withdrawal' | 'legal_notice'
    source: string
    quote?: string
  }>
  gdprImplications: string[]
}

export interface RightOfReplyAnalysis {
  offered: boolean
  offerDate?: string
  responseTime: string // e.g., "24 hours", "3 days"
  adequate: boolean
  responseIncluded: boolean
  responseEditedFairly: boolean
  issues: string[]
}

export interface SourceComparison {
  sourceDocId: string
  sourceDocName: string
  claimInSource: string
  claimInBroadcast: string
  matchType: 'accurate' | 'partial' | 'distorted' | 'omitted' | 'fabricated'
  distortionType?: 'exaggeration' | 'minimization' | 'reversal' | 'context_removal'
  significance: 'critical' | 'high' | 'medium' | 'low'
  explanation: string
}

export interface DocumentaryAnalysisResult {
  caseId: string
  biasScore: number // 0-100
  biasDirection: PartyType
  framingRatio?: FramingRatio
  screenTime?: ScreenTimeAnalysis
  editorialFindings: EditorialFinding[]
  sourceComparisons: SourceComparison[]
  consentAnalysis?: ConsentAnalysis
  rightOfReply?: RightOfReplyAnalysis
  omittedContext: Array<{
    topic: string
    significance: 'critical' | 'high' | 'medium' | 'low'
    benefitsParty: PartyType
    impact: string
  }>
  summary: {
    totalFindings: number
    criticalFindings: number
    ofcomViolations: number
    gdprViolations: number
    overallAssessment: string
  }
  methodology: string
}

// ============================================================================
// AI PROMPTS
// ============================================================================

const EDITORIAL_ANALYSIS_PROMPT = `You are an expert media forensics analyst specializing in broadcast documentary analysis for regulatory complaints.

TASK: Analyze this documentary content for editorial manipulation and bias.

BROADCAST CONTENT:
{broadcast_content}

SOURCE MATERIALS (interviews, correspondence, police files):
{source_content}

CONTEXT: {context}

Identify editorial techniques used:
1. SELECTIVE_EDITING - Material cut to change meaning
2. MISLEADING_FRAMING - Language/visuals that prime viewer
3. EMOTIONAL_MANIPULATION - Music, pacing, editing for emotional effect
4. JUXTAPOSITION_BIAS - Unrelated footage placed to create false association
5. OMISSION_OF_CONTEXT - Critical context removed
6. LEADING_NARRATION - Narrator statements that prejudice viewer
7. MUSIC_VISUAL_PRIMING - Ominous music, unflattering angles
8. FALSE_BALANCE - Appearance of balance while actually skewed
9. AMBUSH_INTERVIEW - Confrontational tactics without warning
10. CONSENT_VIOLATION - Using footage/info despite refusal

For each technique found, assess:
- Severity (critical/high/medium/low)
- Which party benefits
- Specific evidence
- Ofcom Broadcasting Code relevance (Section 5, 7, or 8)

Return JSON:
{
  "findings": [
    {
      "technique": "selective_editing|misleading_framing|...",
      "severity": "critical|high|medium|low",
      "description": "What was done",
      "sourceContent": "Original in source",
      "broadcastContent": "How it appeared in broadcast",
      "omittedContent": "What was left out",
      "beneficiary": "subject|cleared|accuser|defender|neutral",
      "timestamp": "HH:MM:SS if known",
      "evidence": "Specific quote or reference",
      "ofcomRelevance": {
        "section": "5|7|8",
        "rule": "5.1|7.1|8.1 etc",
        "explanation": "How this violates the rule"
      }
    }
  ],
  "biasScore": 0-100,
  "biasDirection": "subject|cleared|accuser|defender|neutral",
  "summary": "Overall assessment"
}`

const FRAMING_RATIO_PROMPT = `Analyze the framing ratio in this broadcast documentary.

CONTENT:
{content}

Count and classify:
1. Claims/allegations presented AGAINST the subject (suspect framing)
2. Claims/statements in FAVOR of the subject (exculpatory framing)
3. Time devoted to each perspective

For each claim, note:
- The specific claim text
- Who makes it
- Whether it's presented as fact or allegation
- Any rebuttal included

Calculate the ratio: (anti-subject claims) : (pro-subject claims)

Return JSON:
{
  "antiSubjectClaims": [
    { "claim": "...", "speaker": "...", "presentedAs": "fact|allegation", "rebutted": true|false }
  ],
  "proSubjectClaims": [
    { "claim": "...", "speaker": "...", "presentedAs": "fact|allegation" }
  ],
  "ratio": number,
  "interpretation": "..."
}`

const CONSENT_ANALYSIS_PROMPT = `Analyze consent and right of reply in this documentary production.

CORRESPONDENCE AND MEETING TRANSCRIPTS:
{correspondence}

BROADCAST CONTENT:
{broadcast_content}

Identify:
1. Was consent requested and given?
2. Was consent ever withdrawn?
3. Were objections filed?
4. What was the broadcaster's response to objections?
5. Was material broadcast despite refusal?
6. Was adequate right of reply offered?

Return JSON:
{
  "consent": {
    "requested": true|false,
    "given": true|false,
    "withdrawn": true|false,
    "withdrawalDate": "YYYY-MM-DD",
    "broadcastedDespiteRefusal": true|false,
    "refusalCount": number,
    "evidence": [
      { "date": "YYYY-MM-DD", "type": "refusal|objection|withdrawal|legal_notice", "source": "doc name", "quote": "..." }
    ]
  },
  "rightOfReply": {
    "offered": true|false,
    "offerDate": "YYYY-MM-DD",
    "responseTimeAllowed": "24 hours|3 days|etc",
    "adequate": true|false,
    "responseIncluded": true|false,
    "responseEditedFairly": true|false,
    "issues": ["..."]
  },
  "gdprImplications": ["Article 6 - no lawful basis", "Article 7 - invalid consent", "..."]
}`

const SOURCE_COMPARISON_PROMPT = `Compare the broadcast content against the source materials to identify distortions.

SOURCE DOCUMENT:
{source_content}

BROADCAST CONTENT:
{broadcast_content}

For each claim or statement in the broadcast that references or should reference the source:
1. Find the original in the source
2. Compare how it was presented in broadcast
3. Classify: accurate, partial, distorted, omitted, fabricated
4. Note distortion type if applicable: exaggeration, minimization, reversal, context_removal

Return JSON:
{
  "comparisons": [
    {
      "claimInSource": "Original statement",
      "claimInBroadcast": "How it appeared",
      "matchType": "accurate|partial|distorted|omitted|fabricated",
      "distortionType": "exaggeration|minimization|reversal|context_removal",
      "significance": "critical|high|medium|low",
      "explanation": "Why this matters"
    }
  ]
}`

// ============================================================================
// STATISTICAL FUNCTIONS
// ============================================================================

/**
 * Calculate z-score for ratio imbalance
 * Tests whether observed ratio differs significantly from 1:1
 */
function calculateZScore(count1: number, count2: number): { z: number; p: number } {
  const total = count1 + count2
  if (total === 0) return { z: 0, p: 1 }

  const observed = count1 / total
  const expected = 0.5
  const se = Math.sqrt((expected * (1 - expected)) / total)

  if (se === 0) return { z: 0, p: 1 }

  const z = (observed - expected) / se

  // Two-tailed p-value approximation
  const p = 2 * (1 - normalCDF(Math.abs(z)))

  return { z, p }
}

/**
 * Standard normal CDF approximation
 */
function normalCDF(z: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = z < 0 ? -1 : 1
  z = Math.abs(z) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * z)
  const y = 1.0 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)

  return 0.5 * (1.0 + sign * y)
}

// ============================================================================
// DOCUMENTARY ANALYSIS ENGINE CLASS
// ============================================================================

export class DocumentaryAnalysisEngine {
  /**
   * Run comprehensive documentary analysis
   */
  async analyzeDocumentary(
    broadcastDocs: Document[],
    sourceDocs: Document[],
    correspondenceDocs: Document[],
    caseId: string,
    context?: string
  ): Promise<DocumentaryAnalysisResult> {
    // TypeScript engine uses mock mode - real AI calls handled by Rust backend
    // eslint-disable-next-line no-constant-condition
    if (true) {
      return this.getMockResult(caseId)
    }

    // Prepare content for analysis
    const broadcastContent = await this.extractContent(broadcastDocs)
    const sourceContent = await this.extractContent(sourceDocs)
    const correspondenceContent = await this.extractContent(correspondenceDocs)

    // Run parallel analyses
    const [editorialAnalysis, framingAnalysis, consentAnalysis, sourceComparisons] =
      await Promise.all([
        this.analyzeEditorialTechniques(broadcastContent, sourceContent, context || ''),
        this.analyzeFramingRatio(broadcastContent),
        this.analyzeConsent(correspondenceContent, broadcastContent),
        this.compareWithSources(sourceContent, broadcastContent, sourceDocs),
      ])

    // Calculate overall metrics
    const biasScore = this.calculateOverallBiasScore(
      editorialAnalysis,
      framingAnalysis,
      sourceComparisons
    )

    const biasDirection = this.determineBiasDirection(editorialAnalysis, framingAnalysis)

    // Count Ofcom and GDPR violations
    const ofcomViolations = editorialAnalysis.filter(f => f.ofcomRelevance).length
    const gdprViolations = consentAnalysis.gdprImplications.length

    const result: DocumentaryAnalysisResult = {
      caseId,
      biasScore,
      biasDirection,
      framingRatio: framingAnalysis,
      editorialFindings: editorialAnalysis,
      sourceComparisons,
      consentAnalysis,
      omittedContext: this.extractOmittedContext(editorialAnalysis, sourceComparisons),
      summary: {
        totalFindings: editorialAnalysis.length,
        criticalFindings: editorialAnalysis.filter(f => f.severity === 'critical').length,
        ofcomViolations,
        gdprViolations,
        overallAssessment: this.generateAssessment(
          biasScore,
          editorialAnalysis.length,
          ofcomViolations,
          framingAnalysis?.ratio
        ),
      },
      methodology: `Documentary Analysis Engine (Δ) analyzed ${broadcastDocs.length} broadcast document(s) against ${sourceDocs.length} source document(s) and ${correspondenceDocs.length} correspondence item(s). Analysis includes editorial technique detection, framing ratio calculation with statistical significance testing, consent verification, and source-to-broadcast comparison.`,
    }

    // Prepare findings (Rust backend handles actual persistence)
    const findings = this.prepareFindings(caseId, result, broadcastDocs)
    console.log('[DocumentaryAnalysisEngine] Prepared findings for storage:', findings.length)

    return result
  }

  /**
   * Analyze editorial techniques
   */
  private async analyzeEditorialTechniques(
    broadcastContent: string,
    sourceContent: string,
    context: string
  ): Promise<EditorialFinding[]> {
    const prompt = EDITORIAL_ANALYSIS_PROMPT.replace(
      '{broadcast_content}',
      broadcastContent.slice(0, 30000)
    )
      .replace('{source_content}', sourceContent.slice(0, 30000))
      .replace('{context}', context)

    try {
      const result = await generateJSON<{
        findings: Array<{
          technique: EditorialTechnique
          severity: 'critical' | 'high' | 'medium' | 'low'
          description: string
          sourceContent?: string
          broadcastContent?: string
          omittedContent?: string
          beneficiary: PartyType
          timestamp?: string
          evidence: string
          ofcomRelevance?: { section: string; rule: string; explanation: string }
        }>
        biasScore: number
        biasDirection: PartyType
        summary: string
      }>('You are a media forensics expert.', prompt)

      return (result.findings || []).map((f, i) => ({
        id: `editorial-${Date.now()}-${i}`,
        ...f,
      }))
    } catch (err) {
      console.error('Editorial analysis failed:', err)
      return []
    }
  }

  /**
   * Analyze framing ratio
   */
  private async analyzeFramingRatio(broadcastContent: string): Promise<FramingRatio | undefined> {
    const prompt = FRAMING_RATIO_PROMPT.replace('{content}', broadcastContent.slice(0, 40000))

    try {
      const result = await generateJSON<{
        antiSubjectClaims: Array<{
          claim: string
          speaker: string
          presentedAs: string
          rebutted: boolean
        }>
        proSubjectClaims: Array<{ claim: string; speaker: string; presentedAs: string }>
        ratio: number
        interpretation: string
      }>('You are a media analyst.', prompt)

      const antiCount = result.antiSubjectClaims?.length || 0
      const proCount = result.proSubjectClaims?.length || 0
      const ratio = proCount > 0 ? antiCount / proCount : antiCount

      const { z, p } = calculateZScore(antiCount, proCount)

      return {
        party1: {
          label: 'Anti-subject claims',
          type: 'subject',
          screenTime: 0,
          claimCount: antiCount,
        },
        party2: {
          label: 'Pro-subject claims',
          type: 'cleared',
          screenTime: 0,
          claimCount: proCount,
        },
        ratio,
        zScore: z,
        pValue: p,
        significant: p < 0.05,
        interpretation:
          result.interpretation ||
          `${ratio.toFixed(1)}:1 framing ratio${p < 0.05 ? ' (statistically significant)' : ''}`,
      }
    } catch (err) {
      console.error('Framing ratio analysis failed:', err)
      return undefined
    }
  }

  /**
   * Analyze consent and right of reply
   */
  private async analyzeConsent(
    correspondenceContent: string,
    broadcastContent: string
  ): Promise<ConsentAnalysis> {
    if (!correspondenceContent) {
      return {
        subjectName: 'Unknown',
        consentGiven: false,
        consentWithdrawn: false,
        broadcastedAnyway: false,
        documentedRefusals: 0,
        evidence: [],
        gdprImplications: [],
      }
    }

    const prompt = CONSENT_ANALYSIS_PROMPT.replace(
      '{correspondence}',
      correspondenceContent.slice(0, 30000)
    ).replace('{broadcast_content}', broadcastContent.slice(0, 20000))

    try {
      const result = await generateJSON<{
        consent: {
          requested: boolean
          given: boolean
          withdrawn: boolean
          withdrawalDate?: string
          broadcastedDespiteRefusal: boolean
          refusalCount: number
          evidence: Array<{ date: string; type: string; source: string; quote?: string }>
        }
        rightOfReply: {
          offered: boolean
          offerDate?: string
          responseTimeAllowed: string
          adequate: boolean
          responseIncluded: boolean
          responseEditedFairly: boolean
          issues: string[]
        }
        gdprImplications: string[]
      }>('You are a media law expert.', prompt)

      return {
        subjectName: 'Subject',
        consentGiven: result.consent?.given || false,
        consentWithdrawn: result.consent?.withdrawn || false,
        withdrawalDate: result.consent?.withdrawalDate,
        broadcastedAnyway: result.consent?.broadcastedDespiteRefusal || false,
        documentedRefusals: result.consent?.refusalCount || 0,
        evidence: (result.consent?.evidence || []).map(e => ({
          date: e.date,
          type: e.type as 'refusal' | 'objection' | 'withdrawal' | 'legal_notice',
          source: e.source,
          quote: e.quote,
        })),
        gdprImplications: result.gdprImplications || [],
      }
    } catch (err) {
      console.error('Consent analysis failed:', err)
      return {
        subjectName: 'Unknown',
        consentGiven: false,
        consentWithdrawn: false,
        broadcastedAnyway: false,
        documentedRefusals: 0,
        evidence: [],
        gdprImplications: [],
      }
    }
  }

  /**
   * Compare broadcast against source materials
   */
  private async compareWithSources(
    sourceContent: string,
    broadcastContent: string,
    sourceDocs: Document[]
  ): Promise<SourceComparison[]> {
    if (!sourceContent || !broadcastContent) return []

    const prompt = SOURCE_COMPARISON_PROMPT.replace(
      '{source_content}',
      sourceContent.slice(0, 30000)
    ).replace('{broadcast_content}', broadcastContent.slice(0, 30000))

    try {
      const result = await generateJSON<{
        comparisons: Array<{
          claimInSource: string
          claimInBroadcast: string
          matchType: 'accurate' | 'partial' | 'distorted' | 'omitted' | 'fabricated'
          distortionType?: 'exaggeration' | 'minimization' | 'reversal' | 'context_removal'
          significance: 'critical' | 'high' | 'medium' | 'low'
          explanation: string
        }>
      }>('You are a fact-checker.', prompt)

      return (result.comparisons || []).map(c => ({
        sourceDocId: sourceDocs[0]?.id || 'unknown',
        sourceDocName: sourceDocs[0]?.filename || 'Source',
        ...c,
      }))
    } catch (err) {
      console.error('Source comparison failed:', err)
      return []
    }
  }

  /**
   * Extract document content
   */
  private async extractContent(docs: Document[]): Promise<string> {
    if (!docs || docs.length === 0) return ''

    return docs
      .map(d => {
        const text = d.extracted_text || ''
        return `=== ${d.filename} ===\nType: ${d.doc_type || 'unknown'}\n\n${text.slice(0, 15000)}`
      })
      .join('\n\n---\n\n')
  }

  /**
   * Calculate overall bias score
   */
  private calculateOverallBiasScore(
    findings: EditorialFinding[],
    framing: FramingRatio | undefined,
    comparisons: SourceComparison[]
  ): number {
    let score = 0

    // Weight from editorial findings
    const criticalCount = findings.filter(f => f.severity === 'critical').length
    const highCount = findings.filter(f => f.severity === 'high').length
    score += criticalCount * 15 + highCount * 8 + (findings.length - criticalCount - highCount) * 3

    // Weight from framing ratio
    if (framing && framing.ratio > 1) {
      // Add score based on how far ratio is from 1:1
      score += Math.min(30, (framing.ratio - 1) * 5)
    }

    // Weight from source comparisons
    const distortions = comparisons.filter(c => c.matchType !== 'accurate')
    const criticalDistortions = distortions.filter(c => c.significance === 'critical')
    score += criticalDistortions.length * 10 + (distortions.length - criticalDistortions.length) * 3

    return Math.min(100, Math.round(score))
  }

  /**
   * Determine overall bias direction
   */
  private determineBiasDirection(
    findings: EditorialFinding[],
    framing: FramingRatio | undefined
  ): PartyType {
    const beneficiaryCount: Record<PartyType, number> = {
      subject: 0,
      cleared: 0,
      accuser: 0,
      defender: 0,
      neutral: 0,
    }

    findings.forEach(f => {
      beneficiaryCount[f.beneficiary] = (beneficiaryCount[f.beneficiary] || 0) + 1
    })

    // Find the party that benefits most from bias (opposite of who is harmed)
    const maxBeneficiary = Object.entries(beneficiaryCount).reduce(
      (max, [party, count]) => (count > max.count ? { party: party as PartyType, count } : max),
      { party: 'neutral' as PartyType, count: 0 }
    )

    return maxBeneficiary.party
  }

  /**
   * Extract omitted context from findings
   */
  private extractOmittedContext(
    findings: EditorialFinding[],
    comparisons: SourceComparison[]
  ): DocumentaryAnalysisResult['omittedContext'] {
    const context: DocumentaryAnalysisResult['omittedContext'] = []

    // From editorial findings
    findings
      .filter(f => f.technique === 'omission_of_context' || f.omittedContent)
      .forEach(f => {
        context.push({
          topic: f.description.slice(0, 100),
          significance: f.severity,
          benefitsParty: f.beneficiary,
          impact: f.omittedContent || 'Context removed',
        })
      })

    // From source comparisons
    comparisons
      .filter(c => c.matchType === 'omitted')
      .forEach(c => {
        context.push({
          topic: c.claimInSource.slice(0, 100),
          significance: c.significance,
          benefitsParty: 'subject',
          impact: c.explanation,
        })
      })

    return context
  }

  /**
   * Generate overall assessment text
   */
  private generateAssessment(
    biasScore: number,
    findingCount: number,
    ofcomViolations: number,
    ratio?: number
  ): string {
    const ratioText = ratio ? ` with a ${ratio.toFixed(1)}:1 framing ratio` : ''

    if (biasScore >= 80) {
      return `Documentary exhibits SEVERE editorial bias${ratioText}. ${findingCount} editorial manipulation techniques identified, including ${ofcomViolations} potential Ofcom Broadcasting Code violations. The imbalance is statistically significant and appears systematic.`
    }
    if (biasScore >= 60) {
      return `Documentary shows SIGNIFICANT bias${ratioText}. ${findingCount} editorial issues identified with ${ofcomViolations} potential regulatory violations.`
    }
    if (biasScore >= 40) {
      return `Documentary contains MODERATE bias indicators${ratioText}. ${findingCount} editorial concerns noted.`
    }
    if (biasScore >= 20) {
      return `Documentary shows MINOR bias${ratioText}. ${findingCount} issues identified but may not rise to regulatory threshold.`
    }
    return `Documentary appears balanced. Minimal editorial manipulation detected.`
  }

  /**
   * Prepare findings for storage (Rust backend handles actual persistence)
   */
  prepareFindings(
    caseId: string,
    result: DocumentaryAnalysisResult,
    documents: Document[]
  ): Array<{
    case_id: string
    engine: string
    title: string
    description: string
    severity: string
    document_ids: string[]
    evidence: Record<string, unknown>
    confidence: number
  }> {
    const findings: Array<{
      case_id: string
      engine: string
      title: string
      description: string
      severity: string
      document_ids: string[]
      evidence: Record<string, unknown>
      confidence: number
    }> = []

    // Prepare editorial findings
    result.editorialFindings
      .filter(f => f.severity === 'critical' || f.severity === 'high')
      .forEach(f => {
        findings.push({
          case_id: caseId,
          engine: 'documentary',
          title: `Editorial Bias: ${f.technique.replace('_', ' ')}`,
          description: f.description,
          severity: f.severity,
          document_ids: documents.map(d => d.id),
          evidence: {
            technique: f.technique,
            sourceContent: f.sourceContent,
            broadcastContent: f.broadcastContent,
            omittedContent: f.omittedContent,
            beneficiary: f.beneficiary,
            ofcomRelevance: f.ofcomRelevance,
          },
          confidence: f.severity === 'critical' ? 95 : 85,
        })
      })

    // Prepare framing ratio as finding if significant
    if (result.framingRatio && result.framingRatio.significant) {
      findings.push({
        case_id: caseId,
        engine: 'documentary',
        title: `Framing Ratio: ${result.framingRatio.ratio.toFixed(1)}:1`,
        description: result.framingRatio.interpretation,
        severity: result.framingRatio.ratio > 5 ? 'critical' : 'high',
        document_ids: documents.map(d => d.id),
        evidence: {
          ratio: result.framingRatio.ratio,
          zScore: result.framingRatio.zScore,
          pValue: result.framingRatio.pValue,
          antiSubjectCount: result.framingRatio.party1.claimCount,
          proSubjectCount: result.framingRatio.party2.claimCount,
        },
        confidence: 90,
      })
    }

    // Prepare consent violation if present
    if (result.consentAnalysis?.broadcastedAnyway) {
      findings.push({
        case_id: caseId,
        engine: 'documentary',
        title: 'Consent Violation: Broadcast Despite Refusal',
        description: `Subject refused participation ${result.consentAnalysis.documentedRefusals} times but material was broadcast anyway.`,
        severity: 'critical',
        document_ids: documents.map(d => d.id),
        evidence: {
          refusalCount: result.consentAnalysis.documentedRefusals,
          withdrawalDate: result.consentAnalysis.withdrawalDate,
          evidence: result.consentAnalysis.evidence,
          gdprImplications: result.consentAnalysis.gdprImplications,
        },
        confidence: 95,
      })
    }

    return findings
  }

  /**
   * Mock result for development/testing
   */
  private getMockResult(caseId: string): DocumentaryAnalysisResult {
    console.log('[MOCK ENGINE] Using Mock Documentary Analysis')

    return {
      caseId,
      biasScore: 85,
      biasDirection: 'subject',
      framingRatio: {
        party1: { label: 'Anti-subject claims', type: 'subject', screenTime: 132, claimCount: 26 },
        party2: { label: 'Pro-subject claims', type: 'cleared', screenTime: 10, claimCount: 2 },
        ratio: 13.2,
        zScore: 4.67,
        pValue: 0.00001,
        significant: true,
        interpretation: '13.2:1 framing ratio demonstrates systematic imbalance (p < 0.00001)',
      },
      editorialFindings: [
        {
          id: 'mock-1',
          technique: 'selective_editing',
          severity: 'critical',
          description:
            'Police confirmation of "effectively innocent" status omitted from broadcast',
          sourceContent: 'DI Butler letter: "For evidential purposes you are effectively innocent"',
          broadcastContent: 'No mention of this exculpatory finding',
          omittedContent: 'The full NFA explanation and innocent finding',
          beneficiary: 'subject',
          evidence: 'E1.1 DI Butler letter dated 03.04.2023',
          ofcomRelevance: {
            section: '7',
            rule: '7.1',
            explanation: 'Material facts presented unfairly by omission',
          },
        },
        {
          id: 'mock-2',
          technique: 'omission_of_context',
          severity: 'critical',
          description: 'CCTV evidence showing subjects asleep during alleged conspiracy not shown',
          sourceContent:
            'Police report: CCTV confirms both parties were asleep when officers arrived',
          broadcastContent: 'Documentary implies active conspiracy',
          omittedContent: 'Exculpatory CCTV evidence',
          beneficiary: 'subject',
          evidence: 'Police evidence bundle',
          ofcomRelevance: {
            section: '5',
            rule: '5.1',
            explanation: 'Due impartiality violated by omitting exculpatory evidence',
          },
        },
      ],
      sourceComparisons: [
        {
          sourceDocId: 'source-1',
          sourceDocName: 'DI Butler Letter',
          claimInSource: 'You are effectively innocent for evidential purposes',
          claimInBroadcast: 'Not mentioned',
          matchType: 'omitted',
          significance: 'critical',
          explanation: 'Key exculpatory finding completely omitted from broadcast',
        },
      ],
      consentAnalysis: {
        subjectName: 'Paul Stephen',
        consentGiven: false,
        consentWithdrawn: true,
        withdrawalDate: '2025-11-19',
        broadcastedAnyway: true,
        documentedRefusals: 12,
        evidence: [
          {
            date: '2025-11-18',
            type: 'refusal',
            source: 'Meeting transcript E3.4',
            quote: "I really don't want to be in it",
          },
          {
            date: '2025-11-19',
            type: 'objection',
            source: 'Formal letter E3.5',
            quote: 'We formally object to broadcast',
          },
        ],
        gdprImplications: [
          'Article 6 - No lawful basis for processing (consent refused)',
          'Article 7 - Cannot demonstrate valid consent',
          'Article 17 - Erasure request ignored',
          'Article 21 - Right to object ignored',
        ],
      },
      omittedContext: [
        {
          topic: 'Police NFA decision and "effectively innocent" finding',
          significance: 'critical',
          benefitsParty: 'subject',
          impact: 'Viewers left with impression of guilt despite police clearance',
        },
        {
          topic: 'CCTV evidence showing subjects asleep',
          significance: 'critical',
          benefitsParty: 'subject',
          impact: 'Conspiracy narrative unsupported by physical evidence',
        },
      ],
      summary: {
        totalFindings: 8,
        criticalFindings: 4,
        ofcomViolations: 6,
        gdprViolations: 4,
        overallAssessment:
          'Documentary exhibits SEVERE editorial bias with a 13.2:1 framing ratio. 8 editorial manipulation techniques identified, including 6 potential Ofcom Broadcasting Code violations. The imbalance is statistically significant (p < 0.00001) and appears systematic.',
      },
      methodology:
        'Documentary Analysis Engine (Δ) analyzed broadcast content against source materials including police correspondence, meeting transcripts, and formal objections. Analysis includes editorial technique detection, framing ratio calculation with z-test significance, consent verification, and source-to-broadcast comparison.',
    }
  }

  /**
   * Simplified analysis for basic document set
   */
  async analyzeDocumentaryBias(
    documents: Document[],
    caseId: string
  ): Promise<DocumentaryAnalysisResult> {
    return this.analyzeDocumentary(documents, [], [], caseId)
  }
}

// Export singleton instance
export const documentaryAnalysisEngine = new DocumentaryAnalysisEngine()

// Backwards-compatible export
export async function analyzeDocumentaryBias(
  documents: Document[],
  caseId: string
): Promise<DocumentaryAnalysisResult> {
  return documentaryAnalysisEngine.analyzeDocumentaryBias(documents, caseId)
}

export const documentaryEngine = {
  analyzeDocumentaryBias,
  analyzeDocumentary: (
    broadcastDocs: Document[],
    sourceDocs: Document[],
    correspondenceDocs: Document[],
    caseId: string,
    context?: string
  ) =>
    documentaryAnalysisEngine.analyzeDocumentary(
      broadcastDocs,
      sourceDocs,
      correspondenceDocs,
      caseId,
      context
    ),
}

// Type alias for backwards compatibility with index.ts exports
export type DocumentaryFinding = EditorialFinding
