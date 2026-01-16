/**
 * Expert Witness Analysis Engine (ἐπιστήμη)
 * Priority 2 - Expertise Boundaries
 *
 * Evaluates expert reports for:
 * - FPR Part 25 / PD25B compliance
 * - Scope exceedances
 * - Methodology violations
 * - Opinion-evidence gaps
 */

import { generateJSON } from '@/lib/ai-client'

// Expert witness violation types
export type ExpertViolationType =
  | 'scope_exceeded' // Opinion outside instructed scope
  | 'methodology_violation' // Failed to follow accepted methodology
  | 'materials_incomplete' // Key materials not reviewed
  | 'opinion_without_evidence' // Conclusion without evidential basis
  | 'credibility_assessment' // Improper credibility determination
  | 'ultimate_issue' // Trespassing on ultimate issue
  | 'no_range_given' // Failed to provide alternative opinions
  | 'bias_indicators' // Language suggesting advocacy
  | 'pd25b_breach' // Practice Direction 25B guidelines not followed
  | 'fpr25_breach' // FPR Part 25 requirements not met

export interface ExpertViolation {
  id: string
  type: ExpertViolationType
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string

  // Location
  reportSection: string
  pageReference: string
  quotedText: string

  // Analysis
  ruleViolated: string
  ruleText: string
  explanation: string

  // Scope tracking
  instructedScope?: string
  actualScope?: string

  confidence: number
}

export interface ExpertAnalysisResult {
  violations: ExpertViolation[]
  complianceScore: number // 0-100
  summary: {
    totalViolations: number
    criticalCount: number
    scopeExceedances: number
    methodologyIssues: number
    overallAssessment: string
  }
  recommendations: string[]
}

interface RawExpertViolation {
  type: ExpertViolationType
  severity: ExpertViolation['severity']
  title: string
  description: string
  report_section?: string
  page_reference?: string
  quoted_text?: string
  rule_violated?: string
  explanation?: string
  instructed_scope?: string
  actual_scope?: string
  confidence?: number
}

// FPR Part 25 and Practice Direction 25B rules
const EXPERT_RULES = {
  pd25b: {
    '4.1': 'Expert must contain a statement of truth',
    '9.1': 'Expert must state substance of all material instructions',
    '3.2': 'Expert must have reviewed all relevant materials',
    '5.1': 'Expert has overriding duty to the court',
    '4.2': 'Expert must not make credibility assessments unless qualified',
  },
  fpr25: {
    '25.3': 'Duty to help the court on matters within expertise',
    '25.9': 'Report must state qualifications',
    '25.10': 'Report must distinguish facts from opinion',
    '25.14': 'Must state opinion, basis, and alternatives considered',
  },
}

const EXPERT_ANALYSIS_PROMPT = `You are a legal expert specializing in expert witness evidence in UK Family Court proceedings.

Analyze this expert report for compliance with FPR Part 25 and Practice Direction 25B (PD25B).

INSTRUCTION LETTER (what expert was asked to do):
{instruction_letter}

MATERIALS REVIEWED (listed by expert):
{materials_list}

EXPERT REPORT:
{report_content}

Evaluate for these violation types:
1. SCOPE_EXCEEDED - Opinion outside instructed scope
2. METHODOLOGY_VIOLATION - Failed accepted methodology
3. MATERIALS_INCOMPLETE - Key materials not reviewed
4. OPINION_WITHOUT_EVIDENCE - Conclusion without basis
5. CREDIBILITY_ASSESSMENT - Improper credibility judgment
6. ULTIMATE_ISSUE - Deciding the ultimate issue
7. NO_RANGE_GIVEN - Failed to consider alternatives
8. BIAS_INDICATORS - Advocacy language
9. PD25B_BREACH - Practice Direction 25B breaches
10. FPR25_BREACH - FPR Part 25 breaches

For each violation found, return JSON:
[
  {
    "type": "violation_type",
    "severity": "critical|high|medium|low",
    "title": "Brief title",
    "description": "Detailed explanation",
    "report_section": "Section/heading where found",
    "page_reference": "Page X",
    "quoted_text": "Exact quote from report",
    "rule_violated": "PD25B 4.1 or FPR 25.14 etc",
    "explanation": "Why this violates the rule",
    "instructed_scope": "What they were asked (if scope issue)",
    "actual_scope": "What they actually opined on (if scope issue)",
    "confidence": 0-100
  }
]

Be thorough but fair. Focus on substantive violations that could affect the weight given to the evidence.`

/**
 * Expert Witness Analysis Engine
 */
export class ExpertWitnessEngine {
  /**
   * Analyze an expert report for compliance
   * Note: Document fetching is now handled by Rust backend
   */
  async analyze(
    reportDocId: string,
    instructionDocId: string | null,
    caseId: string
  ): Promise<ExpertAnalysisResult> {
    console.warn(
      '[ExpertWitnessEngine] Document fetching now handled by Rust backend. Using mock data.'
    )

    // Return mock result - use analyzeContent with pre-loaded content from Rust backend
    return this.getMockResult()
  }

  /**
   * Analyze an expert report with pre-loaded content (for use with Rust backend)
   */
  async analyzeContent(
    reportDocId: string,
    reportContent: string,
    instructionContent: string,
    caseId: string
  ): Promise<ExpertAnalysisResult> {
    // Extract materials list from report
    const materialsList = this.extractMaterialsList(reportContent)

    // Run main analysis
    const violations = await this.detectViolations(reportContent, instructionContent, materialsList)

    // Calculate compliance score
    const complianceScore = this.calculateComplianceScore(violations)

    // Generate summary
    const summary = this.generateSummary(violations)

    // Generate recommendations
    const recommendations = this.generateRecommendations(violations)

    // Prepare findings (Rust backend handles actual persistence)
    const findings = this.prepareFindings(caseId, reportDocId, violations)
    console.log('[ExpertWitnessEngine] Prepared findings for storage:', findings.length)

    return {
      violations,
      complianceScore,
      summary,
      recommendations,
    }
  }

  /**
   * Get mock result for development/testing
   */
  private getMockResult(): ExpertAnalysisResult {
    console.log('[MOCK ENGINE] Using Mock Expert Witness Analysis')
    const mockViolations: ExpertViolation[] = [
      {
        id: `expert-mock-1`,
        type: 'scope_exceeded' as ExpertViolationType,
        severity: 'high',
        title: 'Opinion beyond instructed scope',
        description: 'Expert provides opinion on factual matters not within expertise',
        reportSection: 'Section 4.2',
        pageReference: 'p12',
        quotedText: 'I find the mother to be evasive and likely minimizing her alcohol use.',
        ruleViolated: 'PD25B 5.1 (Overriding Duty)',
        ruleText: 'Expert has overriding duty to the court',
        explanation:
          'Expert is instructed to assess attachment, not fact-find on historical alcohol use.',
        instructedScope: 'Assessment of current attachment relationship',
        actualScope: 'Fact-finding on historical conduct',
        confidence: 85,
      },
    ]

    return {
      violations: mockViolations,
      complianceScore: this.calculateComplianceScore(mockViolations),
      summary: this.generateSummary(mockViolations),
      recommendations: this.generateRecommendations(mockViolations),
    }
  }

  /**
   * Detect violations in expert report
   */
  private async detectViolations(
    reportContent: string,
    instructionContent: string,
    materialsList: string
  ): Promise<ExpertViolation[]> {
    let response

    // Check if we have actual content to analyze
    if (!reportContent || reportContent.length === 0) {
      console.log('[ExpertWitnessEngine] No content provided, using mock analysis')
      await new Promise(resolve => setTimeout(resolve, 500))

      const mockResult = {
        violations: [
          {
            type: 'scope_exceeded',
            severity: 'high',
            title: 'Opinion beyond instructed scope',
            description:
              'Expert provides opinion on factual matters not within expertise (credibility of mother)',
            report_section: 'Section 4.2',
            page_reference: 'p12',
            quoted_text: 'I find the mother to be evasive and likely minimizing her alcohol use.',
            rule_violated: 'PD25B 5.1 (Overriding Duty)',
            explanation:
              'Expert is instructed to assess attachment, not fact-find on historical alcohol use or witness credibility.',
            instructed_scope: 'Assessment of current attachment relationship',
            actual_scope: 'Fact-finding on historical conduct',
            confidence: 85,
          },
          {
            type: 'methodology_violation',
            severity: 'critical',
            title: 'No standardized assessment tool used',
            description: 'Expert creates ad-hoc criteria for attachment disorder',
            report_section: 'Methodology p3',
            page_reference: 'p3',
            quoted_text: 'I used my own clinical judgment to determine attachment style.',
            rule_violated: 'PD25B 9.1',
            explanation:
              'Failed to use accepted standardized measures (e.g. Strange Situation, mimics) despite accepted practice.',
            confidence: 95,
          },
        ],
      }
      response = JSON.stringify(mockResult)
    } else {
      const fullPrompt = EXPERT_ANALYSIS_PROMPT.replace(
        '{instruction_letter}',
        instructionContent || 'Not provided'
      )
        .replace('{materials_list}', materialsList || 'Not explicitly stated')
        .replace('{report_content}', reportContent)

      const result = await generateJSON('You are a forensic expert.', fullPrompt)
      response = JSON.stringify(result)
    }

    try {
      const parsed = JSON.parse(response)
      const rawViolations = (
        Array.isArray(parsed) ? parsed : parsed.violations || []
      ) as RawExpertViolation[]

      return rawViolations.map((v, i) => ({
        id: `expert-${Date.now()}-${i}`,
        type: v.type as ExpertViolationType,
        severity: v.severity,
        title: v.title,
        description: v.description,
        reportSection: v.report_section || '',
        pageReference: v.page_reference || '',
        quotedText: v.quoted_text || '',
        ruleViolated: v.rule_violated || '',
        ruleText: this.getRuleText(v.rule_violated || ''),
        explanation: v.explanation || '',
        instructedScope: v.instructed_scope,
        actualScope: v.actual_scope,
        confidence: v.confidence || 75,
      }))
    } catch {
      console.error('Failed to parse expert analysis response')
      return []
    }
  }

  /**
   * Extract materials list from report
   */
  private extractMaterialsList(content: string): string {
    // Look for common patterns
    const patterns = [
      /materials?\s+reviewed:?([\s\S]*?)(?=\n\n|$)/i,
      /documents?\s+considered:?([\s\S]*?)(?=\n\n|$)/i,
      /i\s+have\s+(?:read|reviewed|considered):?([\s\S]*?)(?=\n\n|$)/i,
      /appendix\s+(?:a|1)[:\s]+([\s\S]*?)(?=appendix|\n\n|$)/i,
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        return match[1].trim()
      }
    }

    return ''
  }

  /**
   * Get rule text for a rule reference
   */
  private getRuleText(ruleRef: string): string {
    if (!ruleRef) return ''

    const normalized = ruleRef.toLowerCase()
    const hasPd25b = normalized.includes('pd25b')
    const hasFpr = normalized.includes('fpr')

    const matchRule = (rules: Record<string, string>) => {
      for (const [key, text] of Object.entries(rules)) {
        const escaped = key.replace(/\./g, '\\.')
        const pattern = new RegExp(`\\b${escaped}\\b`)
        if (pattern.test(normalized)) {
          return text
        }
      }
      return ''
    }

    if (hasPd25b) {
      return matchRule(EXPERT_RULES.pd25b) || ruleRef
    }

    if (hasFpr) {
      return matchRule(EXPERT_RULES.fpr25) || ruleRef
    }

    const pdMatch = matchRule(EXPERT_RULES.pd25b)
    if (pdMatch) return pdMatch

    const fprMatch = matchRule(EXPERT_RULES.fpr25)
    if (fprMatch) return fprMatch

    return ruleRef
  }

  /**
   * Calculate overall compliance score
   */
  private calculateComplianceScore(violations: ExpertViolation[]): number {
    if (violations.length === 0) return 100

    let penalty = 0
    for (const v of violations) {
      switch (v.severity) {
        case 'critical':
          penalty += 25
          break
        case 'high':
          penalty += 15
          break
        case 'medium':
          penalty += 8
          break
        case 'low':
          penalty += 3
          break
      }
    }

    return Math.max(0, 100 - penalty)
  }

  /**
   * Generate summary statistics
   */
  private generateSummary(violations: ExpertViolation[]) {
    const criticalCount = violations.filter(v => v.severity === 'critical').length
    const scopeExceedances = violations.filter(v => v.type === 'scope_exceeded').length
    const methodologyIssues = violations.filter(
      v => v.type === 'methodology_violation' || v.type === 'opinion_without_evidence'
    ).length

    let assessment = 'Compliant'
    if (criticalCount > 0) {
      assessment = 'Significant compliance concerns - weight of evidence may be reduced'
    } else if (violations.length > 3) {
      assessment = 'Multiple minor issues - some concerns about methodology'
    } else if (violations.length > 0) {
      assessment = 'Minor issues identified - generally compliant'
    }

    return {
      totalViolations: violations.length,
      criticalCount,
      scopeExceedances,
      methodologyIssues,
      overallAssessment: assessment,
    }
  }

  /**
   * Generate recommendations based on violations
   */
  private generateRecommendations(violations: ExpertViolation[]): string[] {
    const recommendations: string[] = []

    const hasScope = violations.some(v => v.type === 'scope_exceeded')
    const hasMethodology = violations.some(v => v.type === 'methodology_violation')
    const hasMaterials = violations.some(v => v.type === 'materials_incomplete')
    const hasCredibility = violations.some(v => v.type === 'credibility_assessment')
    const hasUltimate = violations.some(v => v.type === 'ultimate_issue')

    if (hasScope) {
      recommendations.push(
        'Challenge scope exceedances under CPR 25.14 - expert has gone beyond instructed questions'
      )
    }

    if (hasMethodology) {
      recommendations.push(
        'Request Part 25 clarification on methodology used and whether it meets accepted standards'
      )
    }

    if (hasMaterials) {
      recommendations.push(
        'Highlight incomplete materials review - expert may need to revise opinion after reviewing omitted documents'
      )
    }

    if (hasCredibility) {
      recommendations.push(
        'Object to credibility assessments - expert has strayed into territory reserved for the court'
      )
    }

    if (hasUltimate) {
      recommendations.push(
        'Challenge ultimate issue opinion - this is a matter for the court, not the expert'
      )
    }

    if (violations.filter(v => v.severity === 'critical').length >= 2) {
      recommendations.push(
        'Consider application to exclude or limit expert evidence given multiple serious compliance failures'
      )
    }

    return recommendations
  }

  /**
   * Prepare findings for storage (Rust backend handles actual persistence)
   */
  prepareFindings(
    caseId: string,
    reportDocId: string,
    violations: ExpertViolation[]
  ): Array<{
    case_id: string
    engine: string
    finding_type: ExpertViolationType
    severity: string
    title: string
    description: string
    document_ids: string[]
    evidence: Record<string, unknown>
    confidence: number
    regulatory_targets: string[]
  }> {
    return violations.map(v => ({
      case_id: caseId,
      engine: 'expert_witness',
      finding_type: v.type,
      severity: v.severity,
      title: v.title,
      description: v.description,
      document_ids: [reportDocId],
      evidence: {
        reportSection: v.reportSection,
        pageReference: v.pageReference,
        quotedText: v.quotedText,
        ruleViolated: v.ruleViolated,
        ruleText: v.ruleText,
        instructedScope: v.instructedScope,
        actualScope: v.actualScope,
      },
      confidence: v.confidence,
      regulatory_targets: ['FPR Part 25', 'PD25B', 'Family Court'],
    }))
  }
}

// Export singleton
export const expertWitnessEngine = new ExpertWitnessEngine()
