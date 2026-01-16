/**
 * ACCOUNTABILITY AUDIT ENGINE (Λ - λογοδοσία)
 * "Statutory Duty Violations"
 *
 * Maps statutory duties to institutional actions to identify breaches.
 * Covers Children Act 1989, FPR, Working Together, GDPR, Ofcom, HCPC.
 *
 * Core Question: Did institutions meet their statutory obligations?
 */

import { generateJSON } from '@/lib/ai-client'
import type { Document } from '@/CONTRACT'

// Statutory framework types
export type StatutoryFramework =
  | 'children_act_1989'
  | 'family_procedure_rules'
  | 'working_together_2023'
  | 'uk_gdpr'
  | 'ofcom_broadcasting_code'
  | 'hcpc_standards'
  | 'human_rights_act'
  | 'equality_act'
  | 'data_protection_act'
  | 'police_criminal_evidence_act'

export type InstitutionType =
  | 'local_authority'
  | 'police'
  | 'cafcass'
  | 'family_court'
  | 'nhs_trust'
  | 'social_services'
  | 'broadcaster'
  | 'healthcare_professional'
  | 'school'
  | 'other'

export type BreachSeverity = 'critical' | 'high' | 'medium' | 'low'

// Statutory duty definitions
export interface StatutoryDuty {
  id: string
  framework: StatutoryFramework
  section: string // e.g., "s.31(2)" or "Art.6(1)"
  title: string
  description: string
  dutyType: 'mandatory' | 'discretionary' | 'procedural'
  applicableTo: InstitutionType[]
  triggers: string[] // Conditions that activate this duty
  requirements: string[]
  timeConstraints?: string
  remedies: string[]
  caselaw?: string[] // Key cases interpreting this duty
}

export interface DutyBreach {
  id: string
  duty: StatutoryDuty
  institution: string
  institutionType: InstitutionType
  breachType: 'failure_to_act' | 'procedural_error' | 'unlawful_action' | 'delay' | 'misdirection'
  severity: BreachSeverity
  description: string
  evidence: BreachEvidence[]
  impact: string
  remedyAvailable: boolean
  suggestedRemedy?: string
  limitation?: {
    applicable: boolean
    period: string
    expiryDate?: string
  }
}

export interface BreachEvidence {
  documentId: string
  documentName: string
  pageReference?: string
  quotedText: string
  dateOfAction?: string
  actor?: string
}

export interface DutyBreachMatrix {
  caseId: string
  institution: string
  institutionType: InstitutionType
  breaches: DutyBreach[]
  byFramework: Record<StatutoryFramework, DutyBreach[]>
  bySeverity: Record<BreachSeverity, number>
  totalBreaches: number
  criticalBreaches: number
  unremediedBreaches: number
  patternAnalysis: PatternAnalysis
}

export interface PatternAnalysis {
  systematicFailure: boolean
  affectedDuties: string[]
  commonFactors: string[]
  cascadeEffect: boolean
  conclusion: string
}

export interface RemedyMap {
  breach: DutyBreach
  availableRemedies: Remedy[]
  recommendedAction: string
  timeframe: string
  precedents?: string[]
}

export interface Remedy {
  type:
    | 'complaint'
    | 'judicial_review'
    | 'ombudsman'
    | 'regulatory_referral'
    | 'civil_claim'
    | 'internal_review'
  body: string
  procedure: string
  limitation: string
  likelihood: 'high' | 'medium' | 'low'
  costs?: string
}

export interface AccountabilityAuditResult {
  caseId: string
  matrices: DutyBreachMatrix[]
  allBreaches: DutyBreach[]
  remedyMaps: RemedyMap[]
  summary: {
    totalInstitutions: number
    totalBreaches: number
    criticalBreaches: number
    systemicPattern: boolean
    primaryFrameworksBreach: StatutoryFramework[]
    priorityActions: string[]
  }
  methodology: string
}

// ============================================================================
// STATUTORY DUTY LIBRARY
// Core reference data for duty-breach matching
// ============================================================================

const CHILDREN_ACT_DUTIES: StatutoryDuty[] = [
  {
    id: 'ca1989_s31_2',
    framework: 'children_act_1989',
    section: 's.31(2)',
    title: 'Threshold Criteria',
    description:
      'Court may only make care/supervision order if satisfied child suffering or likely to suffer significant harm attributable to care given or child being beyond parental control',
    dutyType: 'mandatory',
    applicableTo: ['local_authority', 'family_court'],
    triggers: ['Care proceedings initiated', 'Emergency protection', 'Interim care order'],
    requirements: [
      'Establish factual basis for significant harm',
      'Link harm to parental care or child beyond control',
      'Evidence must be sufficient, not speculation',
    ],
    remedies: ['Appeal', 'Judicial review', 'Complaint to LGSCO'],
    caselaw: [
      'Re B (Care Proceedings: Standard of Proof) [2008]',
      'Re B-S [2013]',
      'Re A (A Child) [2015]',
    ],
  },
  {
    id: 'ca1989_s1_1',
    framework: 'children_act_1989',
    section: 's.1(1)',
    title: 'Paramount Welfare',
    description: "Child's welfare shall be the court's paramount consideration",
    dutyType: 'mandatory',
    applicableTo: ['family_court', 'cafcass', 'local_authority'],
    triggers: ['Any court determination about child upbringing'],
    requirements: [
      'Apply welfare checklist (s.1(3))',
      'Consider all relevant factors',
      'Balance competing welfare considerations',
    ],
    remedies: ['Appeal on error of law', 'Permission to appeal'],
    caselaw: ['Re G (Children) [2006]', 'Re B (A Child) [2009]'],
  },
  {
    id: 'ca1989_s1_2',
    framework: 'children_act_1989',
    section: 's.1(2)',
    title: 'Delay Prejudice',
    description:
      'Court shall have regard to general principle that delay is likely to prejudice welfare',
    dutyType: 'mandatory',
    applicableTo: ['family_court'],
    triggers: ['Proceedings commenced'],
    requirements: [
      'Set timetable for proceedings',
      'Avoid unnecessary delay',
      'Extensions only where necessary',
    ],
    timeConstraints: '26 weeks for care proceedings (s.32)',
    remedies: ['Appeal', 'Judicial review for unreasonable delay'],
    caselaw: ['Re S (A Child) [2014]', 'Re NL [2014]'],
  },
  {
    id: 'ca1989_s7',
    framework: 'children_act_1989',
    section: 's.7',
    title: 'Welfare Report',
    description:
      'Court may ask officer of the service or LA to report on matters relevant to welfare',
    dutyType: 'discretionary',
    applicableTo: ['cafcass', 'local_authority'],
    triggers: ['Court order for report'],
    requirements: [
      'Report must be balanced and objective',
      'Consider views of all parties',
      'Apply welfare checklist',
      'Make clear recommendations',
    ],
    remedies: ['Cross-examination of author', 'Request supplementary report'],
    caselaw: ['Re W (A Child) [2016]'],
  },
  {
    id: 'ca1989_s17',
    framework: 'children_act_1989',
    section: 's.17',
    title: 'Child in Need',
    description:
      'LA must safeguard and promote welfare of children in need and promote upbringing by families',
    dutyType: 'mandatory',
    applicableTo: ['local_authority'],
    triggers: ['Child identified as in need', 'Referral received'],
    requirements: [
      'Assess child and family needs',
      'Provide appropriate services',
      'Work with families to support child remaining at home',
    ],
    remedies: ['LGSCO complaint', 'Judicial review'],
    caselaw: ['R (G) v Barnet LBC [2003]'],
  },
  {
    id: 'ca1989_s47',
    framework: 'children_act_1989',
    section: 's.47',
    title: 'Duty to Investigate',
    description:
      'LA must investigate where reasonable cause to suspect child suffering/likely to suffer significant harm',
    dutyType: 'mandatory',
    applicableTo: ['local_authority'],
    triggers: ['Reasonable cause to suspect significant harm'],
    requirements: [
      'Make enquiries to establish if action needed',
      'Gain access to child unless satisfied about welfare',
      'Decide what action to take',
    ],
    timeConstraints: 'Strategy discussion within 1 working day',
    remedies: ['LGSCO complaint', 'Judicial review'],
    caselaw: ['Re S (Children) [2010]'],
  },
]

const FPR_DUTIES: StatutoryDuty[] = [
  {
    id: 'fpr_r4_1',
    framework: 'family_procedure_rules',
    section: 'r.4.1',
    title: 'Overriding Objective',
    description: 'Court must deal with cases justly, proportionately, expeditiously and fairly',
    dutyType: 'mandatory',
    applicableTo: ['family_court'],
    triggers: ['Any family proceedings'],
    requirements: [
      'Ensure parties on equal footing',
      'Save expense',
      'Deal with case proportionately',
      'Deal with case expeditiously',
    ],
    remedies: ['Appeal', 'Judicial review'],
    caselaw: ['Re TG (A Child) [2013]'],
  },
  {
    id: 'fpr_pd12j',
    framework: 'family_procedure_rules',
    section: 'PD12J',
    title: 'Domestic Abuse in Child Arrangements',
    description: 'Court must consider domestic abuse where raised and apply special procedures',
    dutyType: 'mandatory',
    applicableTo: ['family_court'],
    triggers: ['Allegation of domestic abuse', 'Safeguarding concerns'],
    requirements: [
      'Fact-finding if disputed allegations',
      'Consider impact on child',
      'Apply Scott Schedule approach if appropriate',
      'Consider protective measures',
    ],
    remedies: ['Appeal', 'Fresh evidence application'],
    caselaw: ['Re H-N [2021]', 'Re B-B [2022]'],
  },
  {
    id: 'fpr_part25',
    framework: 'family_procedure_rules',
    section: 'Part 25',
    title: 'Expert Evidence',
    description: 'Expert evidence must be necessary and expert must comply with duty to court',
    dutyType: 'mandatory',
    applicableTo: ['family_court', 'healthcare_professional'],
    triggers: ['Expert instructed'],
    requirements: [
      'Permission required for expert evidence',
      'Expert owes duty to court not instructing party',
      'Opinion within expertise',
      'Methodology must be sound',
    ],
    remedies: ['Exclude evidence', 'HCPC referral', 'Appeal'],
    caselaw: ['Kennedy v Cordia [2016]', 'Re TG [2013]'],
  },
]

const WORKING_TOGETHER_DUTIES: StatutoryDuty[] = [
  {
    id: 'wt2023_info_sharing',
    framework: 'working_together_2023',
    section: 'Chapter 1',
    title: 'Information Sharing',
    description:
      'Agencies must share information to safeguard children, fear of sharing should not prevent protection',
    dutyType: 'mandatory',
    applicableTo: ['local_authority', 'police', 'nhs_trust', 'school'],
    triggers: ['Safeguarding concern identified'],
    requirements: [
      'Share relevant information timely',
      'Document decision-making',
      'Balance confidentiality against child protection',
    ],
    remedies: ['Safeguarding review', 'LGSCO complaint', 'Regulatory referral'],
    caselaw: ['Re C (A Child) [2016]'],
  },
  {
    id: 'wt2023_strategy',
    framework: 'working_together_2023',
    section: 'Chapter 1',
    title: 'Strategy Discussion',
    description: 'Multi-agency strategy discussion required where s.47 enquiries initiated',
    dutyType: 'mandatory',
    applicableTo: ['local_authority', 'police', 'nhs_trust'],
    triggers: ['Section 47 enquiries'],
    requirements: [
      'Convene within 1 working day',
      'Share relevant information',
      'Agree actions and timescales',
      'Record decisions',
    ],
    timeConstraints: 'Within 1 working day of referral',
    remedies: ['LGSCO complaint', 'Serious case review'],
    caselaw: [],
  },
]

const GDPR_DUTIES: StatutoryDuty[] = [
  {
    id: 'gdpr_art6',
    framework: 'uk_gdpr',
    section: 'Article 6',
    title: 'Lawful Basis',
    description:
      'Processing must have lawful basis - consent, contract, legal obligation, vital interests, public task, or legitimate interests',
    dutyType: 'mandatory',
    applicableTo: ['local_authority', 'police', 'nhs_trust', 'broadcaster', 'school'],
    triggers: ['Any personal data processing'],
    requirements: [
      'Identify and document lawful basis before processing',
      'Basis must be appropriate to purpose',
      'Cannot retrospectively change basis',
    ],
    remedies: ['ICO complaint', 'Civil claim for damages', 'Judicial review'],
    caselaw: ['Vidal-Hall v Google [2015]', 'Lloyd v Google [2021]'],
  },
  {
    id: 'gdpr_art7',
    framework: 'uk_gdpr',
    section: 'Article 7',
    title: 'Conditions for Consent',
    description: 'Where consent is basis, must be freely given, specific, informed and unambiguous',
    dutyType: 'mandatory',
    applicableTo: ['local_authority', 'broadcaster', 'nhs_trust'],
    triggers: ['Processing based on consent'],
    requirements: [
      'Clear affirmative action',
      'Easily withdrawable',
      'Separate from other matters',
      'Not conditional on service',
    ],
    remedies: ['ICO complaint', 'Compensation claim'],
    caselaw: ['Planet49 (CJEU) [2019]'],
  },
  {
    id: 'gdpr_art17',
    framework: 'uk_gdpr',
    section: 'Article 17',
    title: 'Right to Erasure',
    description: 'Data subject has right to erasure in specified circumstances',
    dutyType: 'mandatory',
    applicableTo: ['local_authority', 'broadcaster', 'police', 'nhs_trust'],
    triggers: ['Erasure request received'],
    requirements: [
      'Respond within one month',
      'Assess if grounds apply',
      'Erase without undue delay if grounds met',
    ],
    timeConstraints: 'One month from request',
    remedies: ['ICO complaint', 'Judicial review', 'Compensation claim'],
    caselaw: ['Google Spain (CJEU) [2014]', 'NT1 & NT2 v Google [2018]'],
  },
]

const OFCOM_DUTIES: StatutoryDuty[] = [
  {
    id: 'ofcom_s5_1',
    framework: 'ofcom_broadcasting_code',
    section: 'Section 5.1',
    title: 'Due Impartiality',
    description: 'News must be reported with due accuracy and due impartiality',
    dutyType: 'mandatory',
    applicableTo: ['broadcaster'],
    triggers: ['News or current affairs programming'],
    requirements: [
      'Accurate reporting',
      'Impartial presentation',
      'Range of views on controversial matters',
    ],
    remedies: ['Ofcom complaint', 'Broadcast correction'],
    caselaw: [],
  },
  {
    id: 'ofcom_s7_1',
    framework: 'ofcom_broadcasting_code',
    section: 'Section 7.1',
    title: 'Fairness',
    description: 'Broadcasters must avoid unjust or unfair treatment of individuals in programmes',
    dutyType: 'mandatory',
    applicableTo: ['broadcaster'],
    triggers: ['Programme featuring identifiable individuals'],
    requirements: [
      'Fair dealing with contributors',
      'Material facts not presented unfairly',
      'Opportunity to respond to significant allegations',
    ],
    remedies: ['Ofcom fairness complaint'],
    caselaw: [],
  },
  {
    id: 'ofcom_s7_11',
    framework: 'ofcom_broadcasting_code',
    section: 'Section 7.11',
    title: 'Right to Reply',
    description:
      'Where programme alleges wrongdoing, affected party should normally be given appropriate opportunity to respond',
    dutyType: 'mandatory',
    applicableTo: ['broadcaster'],
    triggers: ['Allegation of wrongdoing or significant allegation'],
    requirements: [
      'Offer meaningful opportunity to respond',
      'Allow reasonable time to respond',
      'Include response or explain why not',
    ],
    remedies: ['Ofcom complaint', 'Broadcast correction'],
    caselaw: [],
  },
  {
    id: 'ofcom_s8_1',
    framework: 'ofcom_broadcasting_code',
    section: 'Section 8.1',
    title: 'Privacy',
    description: 'Any infringement of privacy must be warranted',
    dutyType: 'mandatory',
    applicableTo: ['broadcaster'],
    triggers: ['Filming or recording of individuals', 'Broadcast of private information'],
    requirements: [
      'Legitimate expectation of privacy considered',
      'Consent obtained or public interest justification',
      'Proportionate to purpose',
    ],
    remedies: ['Ofcom privacy complaint', 'Civil claim'],
    caselaw: ['Campbell v MGN [2004]', 'PJS v News Group [2016]'],
  },
]

const HCPC_DUTIES: StatutoryDuty[] = [
  {
    id: 'hcpc_std_1',
    framework: 'hcpc_standards',
    section: 'Standard 1',
    title: 'Promote Service Users Interests',
    description:
      'Treat service users with respect, protect their rights to confidentiality, give priority to their interests',
    dutyType: 'mandatory',
    applicableTo: ['healthcare_professional'],
    triggers: ['Any professional practice'],
    requirements: [
      'Treat with dignity and respect',
      'Respect autonomy',
      'Work in partnership',
      'Maintain confidentiality',
    ],
    remedies: ['HCPC fitness to practice'],
    caselaw: [],
  },
  {
    id: 'hcpc_std_3',
    framework: 'hcpc_standards',
    section: 'Standard 3',
    title: 'Work Within Limits of Knowledge and Skills',
    description: 'Keep within scope of practice and competence',
    dutyType: 'mandatory',
    applicableTo: ['healthcare_professional'],
    triggers: ['Any professional opinion or action'],
    requirements: [
      'Recognise limits of practice',
      'Refer appropriately',
      'Not practice beyond competence',
      'Maintain knowledge and skills',
    ],
    remedies: ['HCPC fitness to practice'],
    caselaw: [],
  },
  {
    id: 'hcpc_std_9',
    framework: 'hcpc_standards',
    section: 'Standard 9',
    title: 'Be Honest and Trustworthy',
    description:
      'Make sure records are clear, accurate and kept appropriately, be honest about limits of knowledge',
    dutyType: 'mandatory',
    applicableTo: ['healthcare_professional'],
    triggers: ['Record keeping', 'Report writing', 'Communication'],
    requirements: [
      'Complete accurate records',
      'Acknowledge uncertainty',
      'Be honest about errors',
      'Not mislead others',
    ],
    remedies: ['HCPC fitness to practice'],
    caselaw: [],
  },
]

// Compile full duty library
const STATUTORY_DUTY_LIBRARY: StatutoryDuty[] = [
  ...CHILDREN_ACT_DUTIES,
  ...FPR_DUTIES,
  ...WORKING_TOGETHER_DUTIES,
  ...GDPR_DUTIES,
  ...OFCOM_DUTIES,
  ...HCPC_DUTIES,
]

// ============================================================================
// AI PROMPTS
// ============================================================================

const DUTY_ANALYSIS_PROMPT = `You are an expert legal analyst specializing in UK statutory duties and institutional accountability.

TASK: Analyze the following document to identify potential breaches of statutory duties.

DOCUMENT:
{document_content}

DOCUMENT CONTEXT:
- Document Type: {document_type}
- Institution: {institution}
- Date: {document_date}

APPLICABLE STATUTORY FRAMEWORKS:
{applicable_duties}

For each potential breach identified:

1. Identify the specific duty breached (section reference)
2. Describe the breach (what was done or not done)
3. Classify breach type:
   - failure_to_act: Required action not taken
   - procedural_error: Wrong process followed
   - unlawful_action: Action exceeded authority or violated duty
   - delay: Unreasonable delay in required action
   - misdirection: Applied wrong legal test or standard

4. Assess severity (critical/high/medium/low) based on:
   - Impact on child welfare or rights
   - Whether breach is remediable
   - Whether breach was deliberate or negligent
   - Degree of departure from required standard

5. Quote specific evidence from document
6. Identify who was responsible
7. Note any limitation periods applicable

Respond in JSON format:
{
  "breaches": [
    {
      "dutyId": "string",
      "dutySection": "string", 
      "dutyTitle": "string",
      "breachType": "failure_to_act|procedural_error|unlawful_action|delay|misdirection",
      "severity": "critical|high|medium|low",
      "description": "string",
      "evidence": {
        "quotedText": "string",
        "pageReference": "string",
        "dateOfAction": "string",
        "actor": "string"
      },
      "impact": "string",
      "remedyAvailable": boolean,
      "suggestedRemedy": "string"
    }
  ],
  "institutionAssessment": {
    "overallCompliance": "compliant|partial|non-compliant",
    "systematicIssues": boolean,
    "commonFactors": ["string"]
  }
}`

const CASCADE_ANALYSIS_PROMPT = `Analyze these breaches across multiple institutions to identify cascade patterns.

BREACHES BY INSTITUTION:
{breaches_summary}

Identify:
1. Did a failure in one institution cause failures in others?
2. Did institutions rely on each other's errors without verification?
3. Is there a pattern of systemic failure across the system?
4. What was the originating failure that cascaded?

Respond in JSON:
{
  "cascadeIdentified": boolean,
  "originatingBreach": {
    "institution": "string",
    "dutyId": "string",
    "description": "string"
  },
  "propagationPath": [
    {
      "fromInstitution": "string",
      "toInstitution": "string",
      "mechanism": "string"
    }
  ],
  "amplificationFactors": ["string"],
  "conclusion": "string"
}`

const REMEDY_ANALYSIS_PROMPT = `For each breach, identify available remedies.

BREACH:
{breach_details}

INSTITUTION: {institution}
STATUTORY FRAMEWORK: {framework}

Consider:
1. Internal complaints procedures
2. Ombudsman jurisdiction (LGSCO, Parliamentary, etc.)
3. Regulatory referral (HCPC, GMC, SRA, Ofcom, ICO)
4. Judicial review (for public law failures)
5. Civil claims (for damages)
6. Criminal referral (in serious cases)

For each remedy:
- Explain the procedure
- State limitation periods
- Assess likelihood of success
- Note any costs

Respond in JSON:
{
  "remedies": [
    {
      "type": "complaint|judicial_review|ombudsman|regulatory_referral|civil_claim|internal_review",
      "body": "string",
      "procedure": "string",
      "limitation": "string",
      "likelihood": "high|medium|low",
      "costs": "string"
    }
  ],
  "recommendedAction": "string",
  "timeframe": "string",
  "precedents": ["string"]
}`

// ============================================================================
// ACCOUNTABILITY AUDIT ENGINE CLASS
// ============================================================================

export class AccountabilityAuditEngine {
  private dutyLibrary: StatutoryDuty[] = STATUTORY_DUTY_LIBRARY

  /**
   * Get duties applicable to a specific institution type
   */
  getApplicableDuties(institutionType: InstitutionType): StatutoryDuty[] {
    return this.dutyLibrary.filter(duty => duty.applicableTo.includes(institutionType))
  }

  /**
   * Get duties from a specific statutory framework
   */
  getDutiesByFramework(framework: StatutoryFramework): StatutoryDuty[] {
    return this.dutyLibrary.filter(duty => duty.framework === framework)
  }

  /**
   * Get a specific duty by ID
   */
  getDutyById(id: string): StatutoryDuty | undefined {
    return this.dutyLibrary.find(duty => duty.id === id)
  }

  /**
   * Analyze a document for duty breaches
   * Note: Document fetching is now handled by Rust backend
   */
  async analyzeDocument(
    documentId: string,
    caseId: string,
    institution: string,
    institutionType: InstitutionType
  ): Promise<DutyBreach[]> {
    console.warn(
      '[AccountabilityAuditEngine] Document fetching now handled by Rust backend. Using mock data.'
    )
    return this.getMockBreaches(institution, institutionType)
  }

  /**
   * Analyze document content for duty breaches (for use with Rust backend)
   */
  async analyzeDocumentContent(
    documentId: string,
    documentName: string,
    content: string,
    documentType: string,
    documentDate: string,
    caseId: string,
    institution: string,
    institutionType: InstitutionType
  ): Promise<DutyBreach[]> {
    // Get applicable duties
    const applicableDuties = this.getApplicableDuties(institutionType)
    const dutiesContext = applicableDuties
      .map(
        d =>
          `${d.section} - ${d.title}: ${d.description}\nRequirements: ${d.requirements.join('; ')}`
      )
      .join('\n\n')

    // Analyze with AI
    const prompt = DUTY_ANALYSIS_PROMPT.replace('{document_content}', content || '')
      .replace('{document_type}', documentType || 'unknown')
      .replace('{institution}', institution)
      .replace('{document_date}', documentDate || 'unknown')
      .replace('{applicable_duties}', dutiesContext)

    const result = await generateJSON<{
      breaches: Array<{
        dutyId: string
        dutySection: string
        dutyTitle: string
        breachType: DutyBreach['breachType']
        severity: BreachSeverity
        description: string
        evidence: {
          quotedText: string
          pageReference?: string
          dateOfAction?: string
          actor?: string
        }
        impact: string
        remedyAvailable: boolean
        suggestedRemedy?: string
      }>
      institutionAssessment: {
        overallCompliance: string
        systematicIssues: boolean
        commonFactors: string[]
      }
    }>(prompt)

    // Convert to DutyBreach objects
    const breaches: DutyBreach[] = result.breaches.map((b, idx) => {
      const duty = this.getDutyById(b.dutyId) || {
        id: b.dutyId,
        framework: 'children_act_1989' as StatutoryFramework,
        section: b.dutySection,
        title: b.dutyTitle,
        description: '',
        dutyType: 'mandatory' as const,
        applicableTo: [institutionType],
        triggers: [],
        requirements: [],
        remedies: [],
      }

      return {
        id: `breach_${documentId}_${idx}`,
        duty,
        institution,
        institutionType,
        breachType: b.breachType,
        severity: b.severity,
        description: b.description,
        evidence: [
          {
            documentId,
            documentName: documentName || 'Unknown',
            pageReference: b.evidence.pageReference,
            quotedText: b.evidence.quotedText,
            dateOfAction: b.evidence.dateOfAction,
            actor: b.evidence.actor,
          },
        ],
        impact: b.impact,
        remedyAvailable: b.remedyAvailable,
        suggestedRemedy: b.suggestedRemedy,
      }
    })

    return breaches
  }

  /**
   * Build duty-breach matrix for an institution
   */
  async buildMatrix(
    caseId: string,
    institution: string,
    institutionType: InstitutionType,
    documentIds: string[]
  ): Promise<DutyBreachMatrix> {
    const allBreaches: DutyBreach[] = []

    // Analyze each document
    for (const docId of documentIds) {
      const breaches = await this.analyzeDocument(docId, caseId, institution, institutionType)
      allBreaches.push(...breaches)
    }

    // Group by framework
    const byFramework: Record<StatutoryFramework, DutyBreach[]> = {
      children_act_1989: [],
      family_procedure_rules: [],
      working_together_2023: [],
      uk_gdpr: [],
      ofcom_broadcasting_code: [],
      hcpc_standards: [],
      human_rights_act: [],
      equality_act: [],
      data_protection_act: [],
      police_criminal_evidence_act: [],
    }

    allBreaches.forEach(breach => {
      byFramework[breach.duty.framework].push(breach)
    })

    // Count by severity
    const bySeverity: Record<BreachSeverity, number> = {
      critical: allBreaches.filter(b => b.severity === 'critical').length,
      high: allBreaches.filter(b => b.severity === 'high').length,
      medium: allBreaches.filter(b => b.severity === 'medium').length,
      low: allBreaches.filter(b => b.severity === 'low').length,
    }

    // Pattern analysis
    const patternAnalysis = this.analyzePatterns(allBreaches)

    return {
      caseId,
      institution,
      institutionType,
      breaches: allBreaches,
      byFramework,
      bySeverity,
      totalBreaches: allBreaches.length,
      criticalBreaches: bySeverity.critical,
      unremediedBreaches: allBreaches.filter(b => !b.remedyAvailable).length,
      patternAnalysis,
    }
  }

  /**
   * Analyze patterns across breaches
   */
  private analyzePatterns(breaches: DutyBreach[]): PatternAnalysis {
    const affectedDuties = [...new Set(breaches.map(b => b.duty.section))]

    const breachTypes = breaches.map(b => b.breachType)
    const typeFreq = breachTypes.reduce(
      (acc, t) => {
        acc[t] = (acc[t] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    const commonFactors: string[] = []
    if (typeFreq.failure_to_act > 2) commonFactors.push('Repeated failures to act')
    if (typeFreq.procedural_error > 2) commonFactors.push('Systemic procedural issues')
    if (typeFreq.delay > 2) commonFactors.push('Pattern of unreasonable delay')

    const criticalCount = breaches.filter(b => b.severity === 'critical').length
    const systematicFailure = criticalCount >= 2 || breaches.length >= 5

    let conclusion = ''
    if (systematicFailure) {
      conclusion = `Evidence of systematic institutional failure with ${breaches.length} breaches identified, including ${criticalCount} critical. Pattern suggests structural or cultural issues rather than isolated errors.`
    } else if (breaches.length > 0) {
      conclusion = `${breaches.length} breach(es) identified. No clear pattern of systematic failure, but individual breaches may warrant remedial action.`
    } else {
      conclusion = 'No clear breaches identified in analyzed documents.'
    }

    return {
      systematicFailure,
      affectedDuties,
      commonFactors,
      cascadeEffect: false, // Set by cascade analysis
      conclusion,
    }
  }

  /**
   * Analyze cascade effects across multiple institutions
   */
  async analyzeCascade(matrices: DutyBreachMatrix[]): Promise<PatternAnalysis> {
    if (matrices.length < 2) {
      return {
        systematicFailure: false,
        affectedDuties: [],
        commonFactors: [],
        cascadeEffect: false,
        conclusion: 'Cascade analysis requires multiple institutions',
      }
    }

    // Prepare summary for AI
    const summary = matrices
      .map(
        m =>
          `${m.institution} (${m.institutionType}):\n` +
          m.breaches.map(b => `- ${b.duty.section}: ${b.breachType} - ${b.description}`).join('\n')
      )
      .join('\n\n')

    const prompt = CASCADE_ANALYSIS_PROMPT.replace('{breaches_summary}', summary)

    const result = await generateJSON<{
      cascadeIdentified: boolean
      originatingBreach?: {
        institution: string
        dutyId: string
        description: string
      }
      propagationPath: Array<{
        fromInstitution: string
        toInstitution: string
        mechanism: string
      }>
      amplificationFactors: string[]
      conclusion: string
    }>(prompt)

    const allBreaches = matrices.flatMap(m => m.breaches)
    const affectedDuties = [...new Set(allBreaches.map(b => b.duty.section))]

    return {
      systematicFailure: result.cascadeIdentified,
      affectedDuties,
      commonFactors: result.amplificationFactors,
      cascadeEffect: result.cascadeIdentified,
      conclusion: result.conclusion,
    }
  }

  /**
   * Generate remedy map for a breach
   */
  async generateRemedyMap(breach: DutyBreach): Promise<RemedyMap> {
    const prompt = REMEDY_ANALYSIS_PROMPT.replace(
      '{breach_details}',
      JSON.stringify(breach, null, 2)
    )
      .replace('{institution}', breach.institution)
      .replace('{framework}', breach.duty.framework)

    const result = await generateJSON<{
      remedies: Array<{
        type: Remedy['type']
        body: string
        procedure: string
        limitation: string
        likelihood: 'high' | 'medium' | 'low'
        costs?: string
      }>
      recommendedAction: string
      timeframe: string
      precedents: string[]
    }>(prompt)

    return {
      breach,
      availableRemedies: result.remedies,
      recommendedAction: result.recommendedAction,
      timeframe: result.timeframe,
      precedents: result.precedents,
    }
  }

  /**
   * Run full accountability audit for a case
   */
  async runFullAudit(
    caseId: string,
    institutionDocs: Array<{
      institution: string
      institutionType: InstitutionType
      documentIds: string[]
    }>
  ): Promise<AccountabilityAuditResult> {
    const matrices: DutyBreachMatrix[] = []

    // Build matrix for each institution
    for (const inst of institutionDocs) {
      const matrix = await this.buildMatrix(
        caseId,
        inst.institution,
        inst.institutionType,
        inst.documentIds
      )
      matrices.push(matrix)
    }

    // Analyze cascade effects
    const cascadeAnalysis = await this.analyzeCascade(matrices)

    // Update matrices with cascade info
    matrices.forEach(m => {
      m.patternAnalysis.cascadeEffect = cascadeAnalysis.cascadeEffect
    })

    // Collect all breaches
    const allBreaches = matrices.flatMap(m => m.breaches)

    // Generate remedy maps for critical/high breaches
    const priorityBreaches = allBreaches.filter(
      b => b.severity === 'critical' || b.severity === 'high'
    )
    const remedyMaps = await Promise.all(priorityBreaches.map(b => this.generateRemedyMap(b)))

    // Summary statistics
    const criticalBreaches = allBreaches.filter(b => b.severity === 'critical').length
    const frameworksBreached = [...new Set(allBreaches.map(b => b.duty.framework))]
    const priorityActions = remedyMaps
      .filter(r => r.availableRemedies.some(rem => rem.likelihood === 'high'))
      .map(r => r.recommendedAction)

    const result: AccountabilityAuditResult = {
      caseId,
      matrices,
      allBreaches,
      remedyMaps,
      summary: {
        totalInstitutions: matrices.length,
        totalBreaches: allBreaches.length,
        criticalBreaches,
        systemicPattern: cascadeAnalysis.systematicFailure,
        primaryFrameworksBreach: frameworksBreached,
        priorityActions,
      },
      methodology: `Accountability Audit Engine (Λ) analyzed ${institutionDocs.length} institution(s) against ${this.dutyLibrary.length} statutory duties across ${[...new Set(this.dutyLibrary.map(d => d.framework))].length} frameworks. Cascade analysis performed to identify systemic patterns.`,
    }

    // Store findings
    await this.storeFindings(caseId, result)

    return result
  }

  /**
   * Prepare audit findings for storage (Rust backend handles actual persistence)
   */
  prepareFindings(
    caseId: string,
    result: AccountabilityAuditResult
  ): Array<{
    case_id: string
    engine: string
    title: string
    description: string
    severity: string
    document_ids: string[]
    evidence: Record<string, unknown>
    confidence: number
    created_at: string
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
      created_at: string
    }> = []

    // Prepare each critical/high breach as a finding
    for (const breach of result.allBreaches.filter(
      b => b.severity === 'critical' || b.severity === 'high'
    )) {
      findings.push({
        case_id: caseId,
        engine: 'accountability_audit',
        title: `${breach.duty.section} Breach - ${breach.duty.title}`,
        description: breach.description,
        severity: breach.severity,
        document_ids: breach.evidence.map(e => e.documentId),
        evidence: {
          duty: breach.duty,
          breachType: breach.breachType,
          evidence: breach.evidence,
          impact: breach.impact,
          suggestedRemedy: breach.suggestedRemedy,
        },
        confidence: breach.severity === 'critical' ? 95 : 85,
        created_at: new Date().toISOString(),
      })
    }

    // Prepare summary finding if systemic pattern detected
    if (result.summary.systemicPattern) {
      findings.push({
        case_id: caseId,
        engine: 'accountability_audit',
        title: 'Systemic Institutional Failure Pattern Detected',
        description: `Analysis across ${result.summary.totalInstitutions} institutions identified ${result.summary.totalBreaches} statutory duty breaches including ${result.summary.criticalBreaches} critical. Evidence suggests systemic rather than isolated failures.`,
        severity: 'critical',
        document_ids: result.allBreaches.flatMap(b => b.evidence.map(e => e.documentId)),
        evidence: {
          frameworks: result.summary.primaryFrameworksBreach,
          cascadeAnalysis: result.matrices.map(m => m.patternAnalysis),
          priorityActions: result.summary.priorityActions,
        },
        confidence: 90,
        created_at: new Date().toISOString(),
      })
    }

    console.log('[AccountabilityAuditEngine] Prepared findings for storage:', findings.length)
    return findings
  }

  /**
   * @deprecated Use prepareFindings instead - Rust backend handles persistence
   */
  private async storeFindings(caseId: string, result: AccountabilityAuditResult): Promise<void> {
    const findings = this.prepareFindings(caseId, result)
    console.log(
      '[AccountabilityAuditEngine] storeFindings called - persistence handled by Rust backend'
    )
  }

  /**
   * Mock data for development/testing
   */
  private getMockBreaches(institution: string, institutionType: InstitutionType): DutyBreach[] {
    const mockDuty = this.getApplicableDuties(institutionType)[0] || {
      id: 'mock_duty',
      framework: 'children_act_1989' as StatutoryFramework,
      section: 's.31(2)',
      title: 'Threshold Criteria',
      description: 'Mock duty for testing',
      dutyType: 'mandatory' as const,
      applicableTo: [institutionType],
      triggers: [],
      requirements: [],
      remedies: [],
    }

    return [
      {
        id: 'mock_breach_1',
        duty: mockDuty,
        institution,
        institutionType,
        breachType: 'failure_to_act',
        severity: 'high',
        description: 'Mock breach for testing - failure to follow mandatory procedure',
        evidence: [
          {
            documentId: 'mock_doc_1',
            documentName: 'Mock Document',
            pageReference: 'p.5',
            quotedText: 'Example evidence text...',
            dateOfAction: '2024-01-15',
            actor: 'Social Worker A',
          },
        ],
        impact: 'Welfare assessment incomplete',
        remedyAvailable: true,
        suggestedRemedy: 'LGSCO complaint',
      },
    ]
  }

  /**
   * Generate summary report
   */
  generateReport(result: AccountabilityAuditResult): string {
    const lines: string[] = [
      '# ACCOUNTABILITY AUDIT REPORT',
      `## Case: ${result.caseId}`,
      '',
      '### Summary',
      `- **Institutions Audited:** ${result.summary.totalInstitutions}`,
      `- **Total Breaches:** ${result.summary.totalBreaches}`,
      `- **Critical Breaches:** ${result.summary.criticalBreaches}`,
      `- **Systemic Pattern:** ${result.summary.systemicPattern ? 'YES' : 'No'}`,
      '',
      '### Frameworks Affected',
      ...result.summary.primaryFrameworksBreach.map(f => `- ${f}`),
      '',
      '### Breaches by Institution',
    ]

    for (const matrix of result.matrices) {
      lines.push(`\n#### ${matrix.institution} (${matrix.institutionType})`)
      lines.push(`Total: ${matrix.totalBreaches} | Critical: ${matrix.criticalBreaches}`)

      for (const breach of matrix.breaches) {
        lines.push(`\n**${breach.duty.section}: ${breach.duty.title}**`)
        lines.push(`- Type: ${breach.breachType}`)
        lines.push(`- Severity: ${breach.severity.toUpperCase()}`)
        lines.push(`- ${breach.description}`)
        if (breach.suggestedRemedy) {
          lines.push(`- Suggested Remedy: ${breach.suggestedRemedy}`)
        }
      }
    }

    if (result.summary.priorityActions.length > 0) {
      lines.push('\n### Priority Actions')
      result.summary.priorityActions.forEach((action, i) => {
        lines.push(`${i + 1}. ${action}`)
      })
    }

    lines.push('\n---')
    lines.push(`*${result.methodology}*`)

    return lines.join('\n')
  }
}

// Export singleton instance
export const accountabilityAuditEngine = new AccountabilityAuditEngine()

// Export helper functions
export function getStatutoryDutyLibrary(): StatutoryDuty[] {
  return STATUTORY_DUTY_LIBRARY
}

export function getDutiesByFramework(framework: StatutoryFramework): StatutoryDuty[] {
  return STATUTORY_DUTY_LIBRARY.filter(d => d.framework === framework)
}

export function getFrameworks(): StatutoryFramework[] {
  return [...new Set(STATUTORY_DUTY_LIBRARY.map(d => d.framework))]
}
