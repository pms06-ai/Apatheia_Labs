/**
 * Argumentation Engine (Α - ἐπιχείρημα)
 *
 * Implements Toulmin model argument analysis and construction
 * for UK legal proceedings. Maps claims to evidence with warrants,
 * backing, qualifiers, and rebuttals.
 *
 * Apatheia Labs - Phronesis Platform
 */

import Anthropic from '@anthropic-ai/sdk'

// ============================================================================
// Types
// ============================================================================

export type ArgumentStrength = 'decisive' | 'strong' | 'moderate' | 'weak' | 'speculative'
export type ArgumentType =
  | 'factual' // Based on established facts
  | 'legal' // Based on law/statute
  | 'procedural' // Based on procedure violations
  | 'credibility' // Attacking/supporting credibility
  | 'inference' // Drawing inferences from evidence
  | 'policy' // Based on public policy
  | 'precedent' // Based on case law
  | 'expert' // Based on expert opinion
  | 'circumstantial' // Based on circumstances

export type LegalDomain =
  | 'children_act'
  | 'family_procedure'
  | 'human_rights'
  | 'data_protection'
  | 'broadcasting'
  | 'professional_conduct'
  | 'tort'
  | 'general'

export interface Claim {
  id: string
  statement: string
  type: ArgumentType
  domain: LegalDomain
  strength: ArgumentStrength
  confidence: number // 0-100
  parentClaimId?: string // For nested arguments
}

export interface Datum {
  id: string
  description: string
  source: string
  pageReference?: string
  documentId?: string
  quotedText?: string
  dateOfEvidence?: string
  reliability: 'high' | 'medium' | 'low'
}

export interface Warrant {
  id: string
  principle: string
  type: 'legal_rule' | 'logical_inference' | 'common_knowledge' | 'expert_principle' | 'precedent'
  authority?: string // Statute, case name, etc.
  citation?: string
}

export interface Backing {
  id: string
  support: string
  type: 'statute' | 'case_law' | 'guidance' | 'expert_opinion' | 'empirical' | 'logical'
  citation?: string
  strength: 'binding' | 'persuasive' | 'informative'
}

export interface Qualifier {
  id: string
  limitation: string
  type: 'probability' | 'scope' | 'temporal' | 'conditional' | 'exception'
  impact: 'minor' | 'moderate' | 'significant'
}

export interface Rebuttal {
  id: string
  counterArgument: string
  source: 'opposing_party' | 'anticipated' | 'case_law' | 'logical'
  strength: ArgumentStrength
  response?: string // Our response to the rebuttal
}

export interface ToulminArgument {
  id: string
  claim: Claim
  data: Datum[]
  warrant: Warrant
  backing: Backing[]
  qualifiers: Qualifier[]
  rebuttals: Rebuttal[]
  chainedFrom?: string[] // IDs of arguments this builds upon
  chainedTo?: string[] // IDs of arguments that build on this
  overallStrength: ArgumentStrength
  vulnerabilities: string[]
  improvements: string[]
}

export interface ArgumentChain {
  id: string
  name: string
  description: string
  domain: LegalDomain
  arguments: ToulminArgument[]
  ultimateClaim: string
  overallStrength: ArgumentStrength
  weakestLinks: string[]
  suggestedImprovements: string[]
}

export interface ArgumentAnalysisResult {
  caseId: string
  documentIds: string[]
  chains: ArgumentChain[]
  allArguments: ToulminArgument[]
  strengthDistribution: Record<ArgumentStrength, number>
  domainCoverage: Record<LegalDomain, number>
  vulnerabilityReport: VulnerabilityReport
  recommendations: string[]
}

export interface VulnerabilityReport {
  weakArguments: Array<{
    argumentId: string
    claim: string
    weakness: string
    remedy: string
  }>
  missingWarrants: Array<{
    argumentId: string
    claim: string
    neededAuthority: string
  }>
  anticipatedRebuttals: Array<{
    argumentId: string
    rebuttal: string
    suggestedResponse: string
  }>
  evidenceGaps: Array<{
    claim: string
    missingEvidence: string
    suggestedSource: string
  }>
}

interface RawClaim {
  statement?: string
  type?: ArgumentType
  domain?: LegalDomain
}

interface RawDatum {
  description?: string
  source?: string
  pageReference?: string
  quotedText?: string
  reliability?: Datum['reliability']
}

interface RawWarrant {
  principle?: string
  type?: Warrant['type']
  authority?: string
  citation?: string
}

interface RawBacking {
  support?: string
  type?: Backing['type']
  citation?: string
  strength?: Backing['strength']
}

interface RawQualifier {
  limitation?: string
  type?: Qualifier['type']
  impact?: Qualifier['impact']
}

interface RawRebuttal {
  counterArgument?: string
  source?: Rebuttal['source']
  strength?: ArgumentStrength
  response?: string
}

interface RawArgument {
  claim?: RawClaim
  data?: RawDatum[]
  warrant?: RawWarrant
  backing?: RawBacking[]
  qualifiers?: RawQualifier[]
  rebuttals?: RawRebuttal[]
}

interface RawAttackVector {
  vector?: string
  strength?: ArgumentStrength
  suggested_response?: string
  evidence_needed?: string
}

interface RawAttack {
  argumentId?: string
  attacks?: RawAttackVector[]
}

interface RawChain {
  chainName?: string
  ultimateClaim?: string
  argumentSequence: string[]
  weakestLinks?: string[]
  suggestedAdditions?: string[]
  description?: string
}

// ============================================================================
// UK Legal Authority Database
// ============================================================================

export const UK_LEGAL_AUTHORITIES: Record<
  string,
  {
    name: string
    citation: string
    domain: LegalDomain
    principle: string
  }
> = {
  // Children Act 1989
  ca1989_s1: {
    name: 'Children Act 1989 s.1',
    citation: 'Children Act 1989, s.1(1)',
    domain: 'children_act',
    principle: "Child's welfare shall be the court's paramount consideration",
  },
  ca1989_s31: {
    name: 'Children Act 1989 s.31',
    citation: 'Children Act 1989, s.31(2)',
    domain: 'children_act',
    principle: 'Threshold criteria: significant harm or likelihood of significant harm',
  },
  ca1989_s1_welfare: {
    name: 'Welfare Checklist',
    citation: 'Children Act 1989, s.1(3)',
    domain: 'children_act',
    principle: 'Court shall have regard to the welfare checklist',
  },

  // Key Case Law
  re_b: {
    name: 'Re B (Care Proceedings: Standard of Proof)',
    citation: '[2008] UKHL 35',
    domain: 'children_act',
    principle: 'Standard of proof is balance of probabilities; binary question',
  },
  re_b_s: {
    name: 'Re B-S (Children)',
    citation: '[2013] EWCA Civ 1146',
    domain: 'children_act',
    principle: 'Proper analysis required; nothing else will do',
  },
  re_w: {
    name: 'Re W (Children)',
    citation: '[2016] EWCA Civ 793',
    domain: 'children_act',
    principle: 'Reconsideration of findings; fresh evidence principles',
  },
  lancashire: {
    name: 'Lancashire CC v B',
    citation: '[2000] 2 AC 147',
    domain: 'children_act',
    principle: 'Attributability of harm in care proceedings',
  },

  // Family Procedure Rules
  'fpr_1.1': {
    name: 'FPR Overriding Objective',
    citation: 'FPR 2010, r.1.1',
    domain: 'family_procedure',
    principle: 'Deal with cases justly, having regard to welfare issues',
  },
  fpr_25: {
    name: 'FPR Part 25 Experts',
    citation: 'FPR 2010, Part 25',
    domain: 'family_procedure',
    principle: 'Expert evidence must be necessary and proportionate',
  },
  pd25b: {
    name: 'Practice Direction 25B',
    citation: 'PD25B para 9.1',
    domain: 'family_procedure',
    principle: 'Expert must set out qualifications, instructions, materials reviewed',
  },

  // Human Rights
  hra_art6: {
    name: 'Right to Fair Trial',
    citation: 'ECHR Article 6',
    domain: 'human_rights',
    principle: 'Fair and public hearing within reasonable time by independent tribunal',
  },
  hra_art8: {
    name: 'Right to Private and Family Life',
    citation: 'ECHR Article 8',
    domain: 'human_rights',
    principle:
      'Respect for private and family life; interference must be necessary and proportionate',
  },

  // Data Protection
  gdpr_art6: {
    name: 'Lawful Basis for Processing',
    citation: 'UK GDPR Article 6',
    domain: 'data_protection',
    principle: 'Processing must have lawful basis',
  },
  gdpr_art9: {
    name: 'Special Category Data',
    citation: 'UK GDPR Article 9',
    domain: 'data_protection',
    principle: 'Additional protections for sensitive data including health data',
  },

  // Broadcasting
  'ofcom_5.1': {
    name: 'Ofcom Accuracy',
    citation: 'Broadcasting Code Section 5.1',
    domain: 'broadcasting',
    principle: 'News must be reported with due accuracy',
  },
  'ofcom_7.1': {
    name: 'Ofcom Fairness',
    citation: 'Broadcasting Code Section 7.1',
    domain: 'broadcasting',
    principle: 'Broadcasters must avoid unjust or unfair treatment',
  },
  'ofcom_8.1': {
    name: 'Ofcom Privacy',
    citation: 'Broadcasting Code Section 8.1',
    domain: 'broadcasting',
    principle: 'Must not infringe privacy in programmes or making of programmes',
  },
}

// ============================================================================
// Strength Assessment Logic
// ============================================================================

function calculateArgumentStrength(arg: Partial<ToulminArgument>): ArgumentStrength {
  let score = 0

  // Data quality (0-30 points)
  if (arg.data?.length) {
    const highReliability = arg.data.filter(d => d.reliability === 'high').length
    const medReliability = arg.data.filter(d => d.reliability === 'medium').length
    score += Math.min(30, highReliability * 10 + medReliability * 5)
  }

  // Warrant authority (0-25 points)
  if (arg.warrant) {
    switch (arg.warrant.type) {
      case 'legal_rule':
        score += 25
        break
      case 'precedent':
        score += 22
        break
      case 'expert_principle':
        score += 18
        break
      case 'logical_inference':
        score += 12
        break
      case 'common_knowledge':
        score += 8
        break
    }
  }

  // Backing strength (0-25 points)
  if (arg.backing?.length) {
    const bindingBacking = arg.backing.filter(b => b.strength === 'binding').length
    const persuasiveBacking = arg.backing.filter(b => b.strength === 'persuasive').length
    score += Math.min(25, bindingBacking * 12 + persuasiveBacking * 6)
  }

  // Qualifier penalty (0-10 points off)
  if (arg.qualifiers?.length) {
    const significantQualifiers = arg.qualifiers.filter(q => q.impact === 'significant').length
    const moderateQualifiers = arg.qualifiers.filter(q => q.impact === 'moderate').length
    score -= significantQualifiers * 5 + moderateQualifiers * 2
  }

  // Rebuttal handling (0-20 points)
  if (arg.rebuttals?.length) {
    const addressedRebuttals = arg.rebuttals.filter(r => r.response).length
    const unaddressedStrong = arg.rebuttals.filter(
      r => !r.response && (r.strength === 'strong' || r.strength === 'decisive')
    ).length
    score += addressedRebuttals * 5
    score -= unaddressedStrong * 10
  } else {
    // No rebuttals considered - minor penalty
    score -= 5
  }

  // Normalize and classify
  score = Math.max(0, Math.min(100, score))

  if (score >= 85) return 'decisive'
  if (score >= 70) return 'strong'
  if (score >= 50) return 'moderate'
  if (score >= 30) return 'weak'
  return 'speculative'
}

function identifyVulnerabilities(arg: ToulminArgument): string[] {
  const vulnerabilities: string[] = []

  // Check data issues
  if (!arg.data.length) {
    vulnerabilities.push('No supporting evidence provided')
  } else {
    const lowReliability = arg.data.filter(d => d.reliability === 'low')
    if (lowReliability.length > arg.data.length / 2) {
      vulnerabilities.push('Majority of evidence has low reliability')
    }
  }

  // Check warrant issues
  if (!arg.warrant) {
    vulnerabilities.push('No warrant connecting evidence to claim')
  } else if (arg.warrant.type === 'common_knowledge' || arg.warrant.type === 'logical_inference') {
    vulnerabilities.push('Warrant relies on inference rather than authority')
  }

  // Check backing issues
  if (!arg.backing.length) {
    vulnerabilities.push('No backing for warrant provided')
  } else if (!arg.backing.some(b => b.strength === 'binding')) {
    vulnerabilities.push('No binding authority in backing')
  }

  // Check rebuttal issues
  const unaddressedRebuttals = arg.rebuttals.filter(r => !r.response && r.strength !== 'weak')
  if (unaddressedRebuttals.length) {
    vulnerabilities.push(`${unaddressedRebuttals.length} significant rebuttal(s) not addressed`)
  }

  // Check qualifier impact
  const significantQualifiers = arg.qualifiers.filter(q => q.impact === 'significant')
  if (significantQualifiers.length) {
    vulnerabilities.push(`Argument has ${significantQualifiers.length} significant limitation(s)`)
  }

  return vulnerabilities
}

function suggestImprovements(arg: ToulminArgument): string[] {
  const improvements: string[] = []

  if (!arg.data.length || arg.data.filter(d => d.reliability === 'high').length === 0) {
    improvements.push('Add primary documentary evidence with specific page references')
  }

  if (!arg.warrant || arg.warrant.type === 'logical_inference') {
    improvements.push('Ground argument in statutory provision or case law principle')
  }

  if (!arg.backing.some(b => b.type === 'case_law')) {
    improvements.push('Add supporting case law to strengthen warrant')
  }

  const unaddressedRebuttals = arg.rebuttals.filter(r => !r.response)
  if (unaddressedRebuttals.length) {
    improvements.push(
      `Prepare responses to ${unaddressedRebuttals.length} anticipated counter-argument(s)`
    )
  }

  if (arg.claim.type === 'inference' && !arg.data.some(d => d.reliability === 'high')) {
    improvements.push('Inferential claims require strong foundational evidence')
  }

  return improvements
}

// ============================================================================
// AI Extraction Prompts
// ============================================================================

const ARGUMENT_EXTRACTION_PROMPT = `You are a forensic legal analyst identifying arguments in documents for UK legal proceedings.

Analyze the document and extract ALL arguments made, structuring each in Toulmin format:

For each argument found, provide:
1. CLAIM: The assertion being made
   - statement: The exact claim
   - type: factual|legal|procedural|credibility|inference|policy|precedent|expert|circumstantial
   - domain: children_act|family_procedure|human_rights|data_protection|broadcasting|professional_conduct|tort|general

2. DATA: Evidence supporting the claim
   - description: What the evidence is
   - source: Where it comes from
   - pageReference: Specific page/paragraph
   - quotedText: Direct quote if available
   - reliability: high|medium|low

3. WARRANT: The principle connecting evidence to claim
   - principle: The connecting rule/principle
   - type: legal_rule|logical_inference|common_knowledge|expert_principle|precedent
   - authority: Statute/case name if applicable
   - citation: Formal citation

4. BACKING: Support for the warrant
   - support: What backs up the warrant
   - type: statute|case_law|guidance|expert_opinion|empirical|logical
   - citation: Citation if applicable
   - strength: binding|persuasive|informative

5. QUALIFIERS: Limitations on the claim
   - limitation: What limits the claim
   - type: probability|scope|temporal|conditional|exception
   - impact: minor|moderate|significant

6. REBUTTALS: Counter-arguments and responses
   - counterArgument: The counter-argument
   - source: opposing_party|anticipated|case_law|logical
   - strength: decisive|strong|moderate|weak|speculative
   - response: How to address it (if known)

Return JSON array of arguments. Be thorough - identify both explicit and implicit arguments.`

const ARGUMENT_CHAIN_PROMPT = `You are analyzing how arguments connect and build upon each other.

Given these individual arguments, identify:
1. Which arguments chain together (one's conclusion supports another's premise)
2. The ultimate claim they collectively support
3. Weak links in the chain
4. Gaps where additional arguments would strengthen the chain

Return JSON with:
{
  "chainName": "descriptive name",
  "ultimateClaim": "the final conclusion",
  "argumentSequence": ["id1", "id2", "id3"],
  "weakestLinks": ["id of weakest argument"],
  "gaps": ["description of what's missing"],
  "suggestedAdditions": ["suggested additional arguments"]
}`

const COUNTER_ARGUMENT_PROMPT = `You are an adversarial analyst identifying how opposing counsel might attack these arguments.

For each argument provided, identify:
1. Strongest attack vectors
2. Evidence that could undermine the claim
3. Alternative interpretations of the data
4. Weaknesses in the warrant/backing
5. Case law that might distinguish or contradict

Be thorough and adversarial - think like opposing counsel with access to all materials.

Return JSON array with:
{
  "argumentId": "id",
  "attacks": [
    {
      "vector": "description of attack",
      "strength": "decisive|strong|moderate|weak",
      "evidence_needed": "what evidence would be needed",
      "suggested_response": "how to defend"
    }
  ]
}`

// ============================================================================
// Argumentation Engine Class
// ============================================================================

export class ArgumentationEngine {
  private anthropic: Anthropic | null = null

  constructor() {
    if (typeof window !== 'undefined') {
      const apiKey = process.env.NEXT_PUBLIC_ANTHROPIC_API_KEY
      if (apiKey && apiKey !== 'placeholder') {
        this.anthropic = new Anthropic({
          apiKey,
          dangerouslyAllowBrowser: true,
        })
      }
    }
  }

  /**
   * Extract arguments from a single document
   * Note: Document fetching is now handled by Rust backend
   */
  async extractArguments(documentId: string, caseId: string): Promise<ToulminArgument[]> {
    console.warn(
      '[ArgumentationEngine] Document fetching now handled by Rust backend. Using mock data.'
    )
    // Process raw mock arguments into full ToulminArguments
    const rawArgs = this.getMockArguments('Unknown')
    return rawArgs.map((arg, index) => ({
      id: `${documentId}-arg-${index}`,
      claim: {
        id: `${documentId}-claim-${index}`,
        statement: arg.claim?.statement || '',
        type: arg.claim?.type || 'factual',
        domain: arg.claim?.domain || 'general',
        strength: 'moderate' as const,
        confidence: 70,
      },
      data: (arg.data || []).map((d, dIdx) => ({
        id: `${documentId}-datum-${index}-${dIdx}`,
        description: d.description || '',
        source: d.source || '',
        reliability: d.reliability || ('medium' as const),
        pageReference: d.pageReference,
        quotedText: d.quotedText,
      })),
      warrant: {
        id: `${documentId}-warrant-${index}`,
        principle: arg.warrant?.principle || '',
        type: arg.warrant?.type || ('legal_rule' as const),
        authority: arg.warrant?.authority,
        citation: arg.warrant?.citation,
      },
      backing: (arg.backing || []).map((b, bIdx) => ({
        id: `${documentId}-backing-${index}-${bIdx}`,
        support: b.support || '',
        type: b.type || ('logical' as const),
        citation: b.citation,
        strength: b.strength || ('informative' as const),
      })),
      qualifiers: (arg.qualifiers || []).map((q, qIdx) => ({
        id: `${documentId}-qualifier-${index}-${qIdx}`,
        limitation: q.limitation || '',
        type: q.type || ('scope' as const),
        impact: q.impact || ('minor' as const),
      })),
      rebuttals: (arg.rebuttals || []).map((r, rIdx) => ({
        id: `${documentId}-rebuttal-${index}-${rIdx}`,
        counterArgument: r.counterArgument || '',
        source: r.source || ('anticipated' as const),
        strength: r.strength || ('weak' as const),
        response: r.response,
      })),
      overallStrength: 'moderate' as const,
      vulnerabilities: ['Mock data - needs real analysis'],
      improvements: ['Conduct full argument extraction'],
    }))
  }

  /**
   * Extract arguments from pre-loaded document content (for use with Rust backend)
   */
  async extractArgumentsFromContent(
    documentId: string,
    documentName: string,
    content: string,
    caseId: string
  ): Promise<ToulminArgument[]> {
    if (!content) {
      return []
    }

    // Use AI to extract arguments
    const rawArguments = await this.aiExtractArguments(content, documentName)

    // Process and enhance each argument
    const processedArguments: ToulminArgument[] = rawArguments.map((arg, index) => {
      const toulminArg: ToulminArgument = {
        id: `${documentId}-arg-${index}`,
        claim: {
          id: `${documentId}-claim-${index}`,
          statement: arg.claim?.statement || '',
          type: arg.claim?.type || 'factual',
          domain: arg.claim?.domain || 'general',
          strength: 'moderate', // Will be calculated
          confidence: 70,
        },
        data: (arg.data || []).map((d, i) => ({
          id: `${documentId}-datum-${index}-${i}`,
          description: d.description || '',
          source: d.source || documentName,
          pageReference: d.pageReference,
          documentId: documentId,
          quotedText: d.quotedText,
          reliability: d.reliability || 'medium',
        })),
        warrant: {
          id: `${documentId}-warrant-${index}`,
          principle: arg.warrant?.principle || '',
          type: arg.warrant?.type || 'logical_inference',
          authority: arg.warrant?.authority,
          citation: arg.warrant?.citation,
        },
        backing: (arg.backing || []).map((b, i) => ({
          id: `${documentId}-backing-${index}-${i}`,
          support: b.support || '',
          type: b.type || 'logical',
          citation: b.citation,
          strength: b.strength || 'informative',
        })),
        qualifiers: (arg.qualifiers || []).map((q, i) => ({
          id: `${documentId}-qualifier-${index}-${i}`,
          limitation: q.limitation || '',
          type: q.type || 'scope',
          impact: q.impact || 'minor',
        })),
        rebuttals: (arg.rebuttals || []).map((r, i) => ({
          id: `${documentId}-rebuttal-${index}-${i}`,
          counterArgument: r.counterArgument || '',
          source: r.source || 'anticipated',
          strength: r.strength || 'moderate',
          response: r.response,
        })),
        overallStrength: 'moderate',
        vulnerabilities: [],
        improvements: [],
      }

      // Calculate strength and identify issues
      toulminArg.overallStrength = calculateArgumentStrength(toulminArg)
      toulminArg.claim.strength = toulminArg.overallStrength
      toulminArg.vulnerabilities = identifyVulnerabilities(toulminArg)
      toulminArg.improvements = suggestImprovements(toulminArg)

      return toulminArg
    })

    return processedArguments
  }

  /**
   * AI extraction of arguments from content
   */
  private async aiExtractArguments(content: string, documentName: string): Promise<RawArgument[]> {
    if (!this.anthropic) {
      return this.getMockArguments(documentName)
    }

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          {
            role: 'user',
            content: `${ARGUMENT_EXTRACTION_PROMPT}\n\nDocument: "${documentName}"\n\n${content.substring(0, 50000)}`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''

      // Extract JSON from response
      const jsonMatch = text.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0])
      }
      return []
    } catch (error) {
      console.error('AI extraction failed:', error)
      return this.getMockArguments(documentName)
    }
  }

  /**
   * Analyze argument chains across multiple documents
   */
  async analyzeArgumentChains(documentIds: string[], caseId: string): Promise<ArgumentChain[]> {
    // Extract all arguments from all documents
    const allArguments: ToulminArgument[] = []
    for (const docId of documentIds) {
      const docArgs = await this.extractArguments(docId, caseId)
      allArguments.push(...docArgs)
    }

    if (!allArguments.length) {
      return []
    }

    // Use AI to identify chains
    const chains = await this.aiIdentifyChains(allArguments)

    // Process each chain
    const processedChains: ArgumentChain[] = chains.map((chain, index) => {
      const chainArguments = chain.argumentSequence
        .map((id: string) => allArguments.find(a => a.id === id))
        .filter(Boolean) as ToulminArgument[]

      const chainObj: ArgumentChain = {
        id: `chain-${caseId}-${index}`,
        name: chain.chainName || `Argument Chain ${index + 1}`,
        description: chain.description || '',
        domain: chainArguments[0]?.claim.domain || 'general',
        arguments: chainArguments,
        ultimateClaim: chain.ultimateClaim || '',
        overallStrength: this.calculateChainStrength(chainArguments),
        weakestLinks: chain.weakestLinks || [],
        suggestedImprovements: chain.suggestedAdditions || [],
      }

      // Link arguments
      for (let i = 0; i < chainArguments.length - 1; i++) {
        chainArguments[i].chainedTo = [chainArguments[i + 1].id]
        chainArguments[i + 1].chainedFrom = [chainArguments[i].id]
      }

      return chainObj
    })

    return processedChains
  }

  private calculateChainStrength(arguments_: ToulminArgument[]): ArgumentStrength {
    if (!arguments_.length) return 'speculative'

    // Chain is only as strong as weakest link
    const strengthOrder: ArgumentStrength[] = [
      'decisive',
      'strong',
      'moderate',
      'weak',
      'speculative',
    ]
    let weakest = 0

    for (const arg of arguments_) {
      const index = strengthOrder.indexOf(arg.overallStrength)
      if (index > weakest) weakest = index
    }

    return strengthOrder[weakest]
  }

  private async aiIdentifyChains(arguments_: ToulminArgument[]): Promise<RawChain[]> {
    if (!this.anthropic) {
      return this.getMockChains(arguments_)
    }

    try {
      const argSummaries = arguments_.map(a => ({
        id: a.id,
        claim: a.claim.statement,
        domain: a.claim.domain,
        strength: a.overallStrength,
      }))

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [
          {
            role: 'user',
            content: `${ARGUMENT_CHAIN_PROMPT}\n\nArguments:\n${JSON.stringify(argSummaries, null, 2)}`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as RawChain | RawChain[]
        return Array.isArray(parsed) ? parsed : [parsed]
      }
      return []
    } catch (error) {
      console.error('Chain identification failed:', error)
      return this.getMockChains(arguments_)
    }
  }

  /**
   * Generate counter-arguments for vulnerability analysis
   */
  async generateCounterArguments(arguments_: ToulminArgument[]): Promise<VulnerabilityReport> {
    if (!this.anthropic) {
      return this.getMockVulnerabilityReport(arguments_)
    }

    try {
      const argSummaries = arguments_.map(a => ({
        id: a.id,
        claim: a.claim.statement,
        data: a.data.map(d => d.description),
        warrant: a.warrant.principle,
        backing: a.backing.map(b => b.support),
      }))

      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 6000,
        messages: [
          {
            role: 'user',
            content: `${COUNTER_ARGUMENT_PROMPT}\n\nArguments:\n${JSON.stringify(argSummaries, null, 2)}`,
          },
        ],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\[[\s\S]*\]/)

      if (jsonMatch) {
        const attacks = JSON.parse(jsonMatch[0]) as RawAttack[]
        return this.processAttacksToReport(attacks, arguments_)
      }
    } catch (error) {
      console.error('Counter-argument generation failed:', error)
    }

    return this.getMockVulnerabilityReport(arguments_)
  }

  private processAttacksToReport(
    attacks: RawAttack[],
    arguments_: ToulminArgument[]
  ): VulnerabilityReport {
    const report: VulnerabilityReport = {
      weakArguments: [],
      missingWarrants: [],
      anticipatedRebuttals: [],
      evidenceGaps: [],
    }

    for (const attack of attacks) {
      const arg = arguments_.find(a => a.id === attack.argumentId)
      if (!arg) continue

      for (const vector of attack.attacks || []) {
        if (vector.strength === 'strong' || vector.strength === 'decisive') {
          report.anticipatedRebuttals.push({
            argumentId: arg.id,
            rebuttal: vector.vector || 'Unknown attack vector',
            suggestedResponse: vector.suggested_response || 'Response needed',
          })
        }

        if (vector.evidence_needed) {
          report.evidenceGaps.push({
            claim: arg.claim.statement,
            missingEvidence: vector.evidence_needed,
            suggestedSource: 'Documentary evidence required',
          })
        }
      }

      // Check for weak arguments
      if (arg.overallStrength === 'weak' || arg.overallStrength === 'speculative') {
        report.weakArguments.push({
          argumentId: arg.id,
          claim: arg.claim.statement,
          weakness: arg.vulnerabilities.join('; '),
          remedy: arg.improvements.join('; '),
        })
      }

      // Check for missing warrants
      if (!arg.warrant.authority && arg.warrant.type !== 'common_knowledge') {
        report.missingWarrants.push({
          argumentId: arg.id,
          claim: arg.claim.statement,
          neededAuthority: `Legal authority needed for: ${arg.warrant.principle}`,
        })
      }
    }

    return report
  }

  /**
   * Full argument analysis for a case
   */
  async analyzeCase(documentIds: string[], caseId: string): Promise<ArgumentAnalysisResult> {
    // Extract all arguments
    const allArguments: ToulminArgument[] = []
    for (const docId of documentIds) {
      const docArgs = await this.extractArguments(docId, caseId)
      allArguments.push(...docArgs)
    }

    // Analyze chains
    const chains = await this.analyzeArgumentChains(documentIds, caseId)

    // Generate vulnerability report
    const vulnerabilityReport = await this.generateCounterArguments(allArguments)

    // Calculate distributions
    const strengthDistribution: Record<ArgumentStrength, number> = {
      decisive: 0,
      strong: 0,
      moderate: 0,
      weak: 0,
      speculative: 0,
    }
    const domainCoverage: Record<LegalDomain, number> = {
      children_act: 0,
      family_procedure: 0,
      human_rights: 0,
      data_protection: 0,
      broadcasting: 0,
      professional_conduct: 0,
      tort: 0,
      general: 0,
    }

    for (const arg of allArguments) {
      strengthDistribution[arg.overallStrength]++
      domainCoverage[arg.claim.domain]++
    }

    // Generate recommendations
    const recommendations = this.generateRecommendations(allArguments, chains, vulnerabilityReport)

    const result: ArgumentAnalysisResult = {
      caseId,
      documentIds,
      chains,
      allArguments,
      strengthDistribution,
      domainCoverage,
      vulnerabilityReport,
      recommendations,
    }

    // Store findings
    await this.storeFindings(result)

    return result
  }

  private generateRecommendations(
    arguments_: ToulminArgument[],
    chains: ArgumentChain[],
    vulnerabilities: VulnerabilityReport
  ): string[] {
    const recommendations: string[] = []

    // Weak argument recommendations
    const weakCount = arguments_.filter(
      a => a.overallStrength === 'weak' || a.overallStrength === 'speculative'
    ).length
    if (weakCount > 0) {
      recommendations.push(
        `${weakCount} argument(s) rated weak or speculative - consider strengthening with additional evidence or authority`
      )
    }

    // Missing authority recommendations
    if (vulnerabilities.missingWarrants.length > 0) {
      recommendations.push(
        `${vulnerabilities.missingWarrants.length} argument(s) lack binding legal authority - add statutory or case law citations`
      )
    }

    // Evidence gap recommendations
    if (vulnerabilities.evidenceGaps.length > 0) {
      recommendations.push(
        `${vulnerabilities.evidenceGaps.length} evidence gap(s) identified - obtain additional documentary evidence`
      )
    }

    // Rebuttal preparation recommendations
    const strongRebuttals = vulnerabilities.anticipatedRebuttals.filter(
      r => r.suggestedResponse === 'Response needed'
    ).length
    if (strongRebuttals > 0) {
      recommendations.push(
        `${strongRebuttals} strong counter-argument(s) anticipated - prepare responses before hearing`
      )
    }

    // Chain weakness recommendations
    const weakChains = chains.filter(
      c => c.overallStrength === 'weak' || c.overallStrength === 'speculative'
    )
    if (weakChains.length > 0) {
      recommendations.push(
        `${weakChains.length} argument chain(s) have weak links - strengthen connecting logic`
      )
    }

    // Domain coverage recommendations
    const uncoveredDomains = Object.entries(
      arguments_.reduce(
        (acc, a) => {
          acc[a.claim.domain] = (acc[a.claim.domain] || 0) + 1
          return acc
        },
        {} as Record<string, number>
      )
    )

    if (!uncoveredDomains.some(([d]) => d === 'human_rights')) {
      recommendations.push(
        'Consider Article 6/8 ECHR arguments to strengthen human rights dimension'
      )
    }

    return recommendations
  }

  /**
   * Build a new argument with proper structure
   */
  buildArgument(
    claim: string,
    data: Array<{ description: string; source: string; pageRef?: string }>,
    warrant: { principle: string; authority?: string; citation?: string },
    options?: {
      type?: ArgumentType
      domain?: LegalDomain
      backing?: Array<{
        support: string
        citation?: string
        strength?: 'binding' | 'persuasive' | 'informative'
      }>
      qualifiers?: Array<{ limitation: string; impact?: 'minor' | 'moderate' | 'significant' }>
    }
  ): ToulminArgument {
    const id = `arg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

    const arg: ToulminArgument = {
      id,
      claim: {
        id: `${id}-claim`,
        statement: claim,
        type: options?.type || 'factual',
        domain: options?.domain || 'general',
        strength: 'moderate',
        confidence: 70,
      },
      data: data.map((d, i) => ({
        id: `${id}-datum-${i}`,
        description: d.description,
        source: d.source,
        pageReference: d.pageRef,
        reliability: 'medium' as const,
      })),
      warrant: {
        id: `${id}-warrant`,
        principle: warrant.principle,
        type: warrant.authority ? 'legal_rule' : 'logical_inference',
        authority: warrant.authority,
        citation: warrant.citation,
      },
      backing: (options?.backing || []).map((b, i) => ({
        id: `${id}-backing-${i}`,
        support: b.support,
        type: 'case_law' as const,
        citation: b.citation,
        strength: b.strength || 'persuasive',
      })),
      qualifiers: (options?.qualifiers || []).map((q, i) => ({
        id: `${id}-qualifier-${i}`,
        limitation: q.limitation,
        type: 'scope' as const,
        impact: q.impact || 'minor',
      })),
      rebuttals: [],
      overallStrength: 'moderate',
      vulnerabilities: [],
      improvements: [],
    }

    // Calculate strength
    arg.overallStrength = calculateArgumentStrength(arg)
    arg.claim.strength = arg.overallStrength
    arg.vulnerabilities = identifyVulnerabilities(arg)
    arg.improvements = suggestImprovements(arg)

    return arg
  }

  /**
   * Prepare findings for storage (Rust backend handles actual persistence)
   */
  prepareFindings(result: ArgumentAnalysisResult): Array<{
    case_id: string
    engine: string
    title: string
    description: string
    severity: string
    document_ids?: string[]
    evidence: Record<string, unknown>
    confidence: number
  }> {
    const findings: Array<{
      case_id: string
      engine: string
      title: string
      description: string
      severity: string
      document_ids?: string[]
      evidence: Record<string, unknown>
      confidence: number
    }> = []

    const weakArgs = result.allArguments.filter(
      a => a.overallStrength === 'weak' || a.overallStrength === 'speculative'
    )

    // Summary finding
    findings.push({
      case_id: result.caseId,
      engine: 'argumentation',
      title: `Argument Analysis: ${result.allArguments.length} arguments across ${result.chains.length} chains`,
      description: result.recommendations.join('\n'),
      severity: weakArgs.length > 3 ? 'high' : weakArgs.length > 0 ? 'medium' : 'low',
      document_ids: result.documentIds,
      evidence: {
        totalArguments: result.allArguments.length,
        chains: result.chains.length,
        strengthDistribution: result.strengthDistribution,
        domainCoverage: result.domainCoverage,
        vulnerabilities: result.vulnerabilityReport,
        recommendations: result.recommendations,
      },
      confidence: this.calculateOverallConfidence(result),
    })

    // Individual weak argument findings
    for (const arg of weakArgs) {
      findings.push({
        case_id: result.caseId,
        engine: 'argumentation',
        title: `Weak Argument: ${arg.claim.statement.substring(0, 50)}...`,
        description: arg.vulnerabilities.join('; '),
        severity: arg.overallStrength === 'speculative' ? 'high' : 'medium',
        evidence: {
          argument: arg,
          improvements: arg.improvements,
        },
        confidence: arg.claim.confidence,
      })
    }

    console.log('[ArgumentationEngine] Prepared findings for storage:', findings.length)
    return findings
  }

  /**
   * @deprecated Use prepareFindings instead - Rust backend handles persistence
   */
  private async storeFindings(result: ArgumentAnalysisResult): Promise<void> {
    this.prepareFindings(result)
    console.log('[ArgumentationEngine] storeFindings called - persistence handled by Rust backend')
  }

  private calculateOverallConfidence(result: ArgumentAnalysisResult): number {
    if (!result.allArguments.length) return 0

    const strengthValues: Record<ArgumentStrength, number> = {
      decisive: 95,
      strong: 80,
      moderate: 60,
      weak: 35,
      speculative: 15,
    }

    const total = result.allArguments.reduce(
      (sum, arg) => sum + strengthValues[arg.overallStrength],
      0
    )

    return Math.round(total / result.allArguments.length)
  }

  // ============================================================================
  // Mock Data for Development/Testing
  // ============================================================================

  private getMockArguments(documentName: string): RawArgument[] {
    return [
      {
        claim: {
          statement: 'The Local Authority failed to disclose the NFA decision to the Court',
          type: 'procedural',
          domain: 'family_procedure',
        },
        data: [
          {
            description: 'Police NFA decision dated 15 March 2024',
            source: 'Police Bundle',
            pageReference: 'PB/156',
            quotedText: 'No Further Action - insufficient evidence',
            reliability: 'high',
          },
          {
            description: 'LA disclosure list omits NFA decision',
            source: 'LA Disclosure',
            pageReference: 'D/1-15',
            reliability: 'high',
          },
        ],
        warrant: {
          principle: 'Local Authorities have duty of full and frank disclosure in care proceedings',
          type: 'legal_rule',
          authority: 'Re L (Care: Assessment: Fair Trial)',
          citation: '[2002] EWHC 1379 (Fam)',
        },
        backing: [
          {
            support:
              'Duty to disclose all relevant material including that which may undermine case',
            type: 'case_law',
            citation: 'Re C (Disclosure) [1996] 1 FLR 797',
            strength: 'binding',
          },
        ],
        qualifiers: [],
        rebuttals: [
          {
            counterArgument: 'LA may argue NFA decision was not relevant to threshold',
            source: 'anticipated',
            strength: 'weak',
            response:
              'NFA directly relevant to credibility of allegations upon which threshold depends',
          },
        ],
      },
      {
        claim: {
          statement: 'The expert exceeded the boundaries of their instruction',
          type: 'expert',
          domain: 'family_procedure',
        },
        data: [
          {
            description: 'Letter of instruction limited to psychological assessment',
            source: 'Expert Bundle',
            pageReference: 'EB/1-3',
            reliability: 'high',
          },
          {
            description: 'Expert report includes credibility finding',
            source: 'Expert Report',
            pageReference: 'ER/45',
            quotedText: "I find the mother's account lacks credibility",
            reliability: 'high',
          },
        ],
        warrant: {
          principle:
            'Experts must confine opinion to matters within their expertise and instruction',
          type: 'legal_rule',
          authority: 'Practice Direction 25B',
          citation: 'PD25B para 9.1',
        },
        backing: [
          {
            support: 'Credibility is a matter for the court, not experts',
            type: 'case_law',
            citation: 'Re M (Children) [2012] EWCA Civ 1905',
            strength: 'binding',
          },
          {
            support: 'FJC Guidelines require experts to stay within scope',
            type: 'guidance',
            citation: 'FJC Guidelines para 3.1',
            strength: 'persuasive',
          },
        ],
        qualifiers: [
          {
            limitation:
              'Expert may argue credibility assessment necessary for psychological opinion',
            type: 'exception',
            impact: 'moderate',
          },
        ],
        rebuttals: [],
      },
    ]
  }

  private getMockChains(arguments_: ToulminArgument[]): RawChain[] {
    if (arguments_.length < 2) {
      return [
        {
          chainName: 'Primary Argument',
          ultimateClaim: arguments_[0]?.claim.statement || 'No arguments found',
          argumentSequence: arguments_.map(a => a.id),
          weakestLinks: [],
          suggestedAdditions: [],
        },
      ]
    }

    return [
      {
        chainName: 'Procedural Fairness Chain',
        ultimateClaim:
          'The proceedings were fundamentally unfair due to disclosure failures and expert overreach',
        argumentSequence: arguments_.map(a => a.id),
        weakestLinks: arguments_.filter(a => a.overallStrength === 'weak').map(a => a.id),
        suggestedAdditions: [
          'Add Article 6 ECHR argument on fair trial',
          'Add Re B-S analysis on proper consideration',
        ],
      },
    ]
  }

  private getMockVulnerabilityReport(arguments_: ToulminArgument[]): VulnerabilityReport {
    return {
      weakArguments: arguments_
        .filter(a => a.overallStrength === 'weak' || a.overallStrength === 'speculative')
        .map(a => ({
          argumentId: a.id,
          claim: a.claim.statement,
          weakness: a.vulnerabilities.join('; ') || 'Insufficient evidential support',
          remedy: a.improvements.join('; ') || 'Strengthen with documentary evidence',
        })),
      missingWarrants: arguments_
        .filter(a => !a.warrant.authority)
        .map(a => ({
          argumentId: a.id,
          claim: a.claim.statement,
          neededAuthority: 'Statutory or case law authority required',
        })),
      anticipatedRebuttals: [
        {
          argumentId: arguments_[0]?.id || '',
          rebuttal: 'LA may argue disclosure was adequate given time constraints',
          suggestedResponse:
            'Time constraints do not override duty of full disclosure; Re L establishes absolute nature of duty',
        },
      ],
      evidenceGaps: [
        {
          claim: 'Systematic pattern of non-disclosure',
          missingEvidence: 'Analysis of all disclosure tranches to demonstrate pattern',
          suggestedSource: 'Cross-reference disclosure dates against document dates',
        },
      ],
    }
  }
}

// ============================================================================
// Export
// ============================================================================

// Export singleton instance
export const argumentationEngine = new ArgumentationEngine()
export default ArgumentationEngine
