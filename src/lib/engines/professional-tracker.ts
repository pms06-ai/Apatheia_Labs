/**
 * Professional Tracker Engine (Π - ἐπίβλεψις)
 *
 * Tracks per-professional behavior patterns across case documents
 * for regulatory referrals (HCPC, GMC, SRA, NMC, SWE).
 *
 * Identifies conduct deviations, maintains professional profiles,
 * and generates referral evidence packs.
 *
 * Apatheia Labs - Phronesis Platform
 */

// Supabase removed - using Tauri backend for data operations
import Anthropic from '@anthropic-ai/sdk'

// ============================================================================
// Types
// ============================================================================

export type ProfessionalBody =
  | 'HCPC' // Health and Care Professions Council
  | 'GMC' // General Medical Council
  | 'NMC' // Nursing and Midwifery Council
  | 'SRA' // Solicitors Regulation Authority
  | 'BSB' // Bar Standards Board
  | 'SWE' // Social Work England
  | 'UNKNOWN'

export type ProfessionType =
  | 'social_worker'
  | 'psychologist'
  | 'psychiatrist'
  | 'doctor'
  | 'nurse'
  | 'solicitor'
  | 'barrister'
  | 'police_officer'
  | 'guardian'
  | 'expert_witness'
  | 'other'

export type ConductCategory =
  | 'honesty_integrity' // Misleading statements, omissions
  | 'competence' // Skills, knowledge, judgment
  | 'professional_boundaries' // Scope, role, relationships
  | 'record_keeping' // Documentation failures
  | 'communication' // With parties, court, others
  | 'safeguarding' // Child protection duties
  | 'confidentiality' // Data handling, disclosure
  | 'cooperation' // With investigations, court
  | 'bias_discrimination' // Unfair treatment, prejudice
  | 'procedural_compliance' // Following required procedures

export type SeverityLevel = 'minor' | 'moderate' | 'serious' | 'severe'

export interface Professional {
  id: string
  name: string
  aliases: string[] // Other names/titles used
  profession: ProfessionType
  regulatoryBody: ProfessionalBody
  registrationNumber?: string
  employer?: string
  role: string // Role in case
  firstAppearance: string // First document reference
}

export interface ConductIncident {
  id: string
  professionalId: string
  category: ConductCategory
  description: string
  severity: SeverityLevel
  date?: string
  documentId: string
  documentName: string
  pageReference?: string
  quotedEvidence?: string
  standardsViolated: StandardViolation[]
  context: string
  aggravatingFactors: string[]
  mitigatingFactors: string[]
}

export interface StandardViolation {
  body: ProfessionalBody
  standardRef: string
  standardText: string
  howViolated: string
}

export interface ProfessionalProfile {
  professional: Professional
  incidents: ConductIncident[]
  totalIncidents: number
  severityBreakdown: Record<SeverityLevel, number>
  categoryBreakdown: Record<ConductCategory, number>
  pattern: PatternAnalysis
  referralRecommendation: ReferralRecommendation
  timeline: TimelineEntry[]
}

export interface PatternAnalysis {
  isSystematic: boolean
  systematicScore: number // 0-100
  dominantCategory: ConductCategory
  escalating: boolean
  recurringBehaviors: string[]
  consistentDirection?: string // e.g., "consistently favored mother"
  conclusions: string[]
}

export interface ReferralRecommendation {
  recommended: boolean
  strength: 'strong' | 'moderate' | 'weak' | 'not_recommended'
  body: ProfessionalBody
  primaryGrounds: string[]
  supportingEvidence: string[]
  potentialOutcomes: string[]
  risks: string[]
}

export interface TimelineEntry {
  date: string
  event: string
  incidentId?: string
  documentId: string
  significance: 'high' | 'medium' | 'low'
}

export interface ProfessionalTrackingResult {
  caseId: string
  profiles: ProfessionalProfile[]
  crossProfessionalPatterns: CrossProfessionalPattern[]
  referralCandidates: ProfessionalProfile[]
  summary: string
}

export interface CrossPattern {
  professionals: string[] // Professional IDs
  pattern: string
  significance: string
  evidenceRefs: string[]
}

// Cross-professional pattern analysis result
export interface CrossProfessionalPattern {
  patternType: 'employer_wide' | 'profession_wide'
  description: string
  involvedProfessionals: string[]
  commonBehaviors: string[]
  significance: 'high' | 'medium' | 'low'
}

// Summary of tracking results
export interface TrackingSummary {
  totalProfessionals: number
  totalIncidents: number
  referralCandidatesCount: number
  professionBreakdown: Record<string, number>
  highestRiskProfessional: string | null
  summary: string
}

// Intermediate type for AI extraction
export interface ExtractedProfessional {
  name: string
  aliases?: string[]
  profession: ProfessionType
  role: string
  employer?: string
  registrationNumber?: string
  conductIncidents: Array<{
    description: string
    severity: SeverityLevel
    category: ConductCategory
    evidence: string
  }>
}

// ============================================================================
// Regulatory Standards Database
// ============================================================================

export const REGULATORY_STANDARDS: Record<
  ProfessionalBody,
  {
    name: string
    standards: Array<{
      ref: string
      category: ConductCategory
      text: string
    }>
  }
> = {
  HCPC: {
    name: 'Health and Care Professions Council',
    standards: [
      {
        ref: '1.1',
        category: 'honesty_integrity',
        text: 'Act in the best interests of service users',
      },
      {
        ref: '1.4',
        category: 'safeguarding',
        text: 'Take action to protect service users if there is a safeguarding concern',
      },
      { ref: '2.1', category: 'communication', text: 'Communicate appropriately and effectively' },
      {
        ref: '2.6',
        category: 'communication',
        text: 'Provide service users with information about their care or treatment',
      },
      {
        ref: '3.1',
        category: 'confidentiality',
        text: 'Treat information about service users as confidential',
      },
      {
        ref: '4.2',
        category: 'professional_boundaries',
        text: 'Maintain appropriate boundaries with service users',
      },
      {
        ref: '5.1',
        category: 'honesty_integrity',
        text: 'Promote and protect the interests of service users',
      },
      { ref: '6.1', category: 'competence', text: 'Practise only within lawful scope of practice' },
      { ref: '9.1', category: 'honesty_integrity', text: 'Be honest and trustworthy' },
      { ref: '9.3', category: 'record_keeping', text: 'Keep accurate records' },
      { ref: '10.1', category: 'competence', text: 'Keep skills and knowledge up to date' },
      {
        ref: '12.1',
        category: 'cooperation',
        text: 'Respond constructively to feedback and complaints',
      },
      {
        ref: '13.1',
        category: 'professional_boundaries',
        text: 'Recognise limits of practice and refer appropriately',
      },
    ],
  },
  SWE: {
    name: 'Social Work England',
    standards: [
      { ref: '1.1', category: 'honesty_integrity', text: 'Act with honesty and integrity' },
      {
        ref: '1.2',
        category: 'safeguarding',
        text: 'Safeguard and promote the welfare of children',
      },
      { ref: '2.1', category: 'competence', text: 'Maintain professional competence' },
      { ref: '3.1', category: 'communication', text: 'Communicate clearly and accurately' },
      { ref: '3.3', category: 'record_keeping', text: 'Keep clear and accurate records' },
      {
        ref: '4.1',
        category: 'professional_boundaries',
        text: 'Maintain clear and appropriate boundaries',
      },
      {
        ref: '5.1',
        category: 'bias_discrimination',
        text: 'Promote equality and not discriminate',
      },
      { ref: '6.1', category: 'cooperation', text: 'Work cooperatively with others' },
    ],
  },
  GMC: {
    name: 'General Medical Council',
    standards: [
      { ref: '15', category: 'communication', text: 'Provide information patients want or need' },
      { ref: '17', category: 'record_keeping', text: 'Keep clear and accurate records' },
      { ref: '19', category: 'record_keeping', text: 'Document decisions and consent' },
      { ref: '21', category: 'competence', text: 'Work within limits of competence' },
      {
        ref: '52',
        category: 'professional_boundaries',
        text: 'Give expert witness opinions in own competence only',
      },
      { ref: '57', category: 'honesty_integrity', text: 'Be honest in all communications' },
      { ref: '65', category: 'honesty_integrity', text: 'Do not mislead' },
      {
        ref: '68',
        category: 'cooperation',
        text: 'Respond promptly and constructively to complaints',
      },
    ],
  },
  NMC: {
    name: 'Nursing and Midwifery Council',
    standards: [
      {
        ref: '1.4',
        category: 'safeguarding',
        text: 'Act in best interests including safeguarding',
      },
      { ref: '3.4', category: 'communication', text: 'Communicate clearly' },
      { ref: '10.1', category: 'record_keeping', text: 'Keep clear and accurate records' },
      { ref: '17.1', category: 'cooperation', text: 'Raise concerns about patient safety' },
      { ref: '20.1', category: 'honesty_integrity', text: 'Act with honesty and integrity' },
      {
        ref: '20.2',
        category: 'professional_boundaries',
        text: 'Maintain professional boundaries',
      },
    ],
  },
  SRA: {
    name: 'Solicitors Regulation Authority',
    standards: [
      { ref: '1.4', category: 'honesty_integrity', text: 'Do not mislead the court or others' },
      { ref: '2.1', category: 'competence', text: 'Maintain competence and legal knowledge' },
      { ref: '3.5', category: 'confidentiality', text: 'Keep client affairs confidential' },
      { ref: '4.1', category: 'cooperation', text: 'Deal with regulator openly and honestly' },
      { ref: '5.1', category: 'honesty_integrity', text: 'Act with integrity' },
      {
        ref: '6.3',
        category: 'communication',
        text: 'Give clients information in a way they can understand',
      },
    ],
  },
  BSB: {
    name: 'Bar Standards Board',
    standards: [
      { ref: 'rC3', category: 'honesty_integrity', text: 'Act with honesty and integrity' },
      { ref: 'rC6', category: 'honesty_integrity', text: 'Not knowingly mislead the court' },
      { ref: 'rC9', category: 'competence', text: 'Be competent to handle the work' },
      { ref: 'rC15', category: 'confidentiality', text: 'Preserve confidentiality' },
    ],
  },
  UNKNOWN: {
    name: 'Unknown Regulatory Body',
    standards: [],
  },
}

// ============================================================================
// Professional Tracker Engine Class
// ============================================================================

export class ProfessionalTrackerEngine {
  private anthropic: Anthropic | null = null
  private professionals: Map<string, Professional> = new Map()
  private incidents: Map<string, ConductIncident[]> = new Map()

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
   * Track professionals across multiple documents
   */
  async trackProfessionals(
    documentIds: string[],
    caseId: string
  ): Promise<ProfessionalTrackingResult> {
    this.professionals.clear()
    this.incidents.clear()

    // Process each document
    for (const docId of documentIds) {
      await this.processDocument(docId, caseId)
    }

    // Build profiles
    const profiles: ProfessionalProfile[] = []
    for (const [profId, professional] of this.professionals) {
      const profIncidents = this.incidents.get(profId) || []
      const profile = await this.buildProfile(professional, profIncidents)
      profiles.push(profile)
    }

    // Identify cross-professional patterns
    const crossPatterns = this.identifyCrossPatterns(profiles)

    // Filter referral candidates
    const referralCandidates = profiles.filter(p => p.referralRecommendation.recommended)

    // Generate summary
    const trackingSummary = this.generateSummary(profiles, referralCandidates)

    const result: ProfessionalTrackingResult = {
      caseId,
      profiles,
      crossProfessionalPatterns: crossPatterns,
      referralCandidates,
      summary: trackingSummary.summary,
    }

    // Store findings
    await this.storeFindings(result)

    return result
  }

  /**
   * Process a single document for professional conduct
   */
  private async processDocument(documentId: string, _caseId: string): Promise<void> {
    // Document fetching handled by Rust backend - this is a stub for TS engine compatibility
    console.warn('[Professional Tracker] processDocument called - use Rust backend for actual data')

    // In production, documents are passed in via Tauri commands
    // This stub allows the engine to be imported without errors
    const doc = { id: documentId, name: 'stub', extracted_text: '', content: '' }
    const content = doc.extracted_text || doc.content
    if (!content) return

    const extracted = await this.aiExtractProfessionals(content, doc.name, documentId)

    for (const prof of extracted) {
      // Find or create professional
      let professional = this.findExistingProfessional(prof.name, prof.aliases || [])

      if (!professional) {
        professional = {
          id: `prof-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          name: prof.name,
          aliases: prof.aliases || [],
          profession: prof.profession || 'other',
          regulatoryBody: this.determineRegulatoryBody(prof.profession),
          registrationNumber: prof.registrationNumber,
          employer: prof.employer,
          role: prof.role || 'Unknown role',
          firstAppearance: `${doc.name}`,
        }
        this.professionals.set(professional.id, professional)
        this.incidents.set(professional.id, [])
      } else {
        // Merge aliases
        for (const alias of prof.aliases || []) {
          if (!professional.aliases.includes(alias)) {
            professional.aliases.push(alias)
          }
        }
      }

      // Add incidents
      const profIncidents = this.incidents.get(professional.id) || []
      for (const incident of prof.conductIncidents || []) {
        const conductIncident: ConductIncident = {
          id: `incident-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          professionalId: professional.id,
          category: incident.category || 'competence',
          description: incident.description || '',
          severity: incident.severity || 'moderate',
          date: undefined,
          documentId: documentId,
          documentName: doc.name,
          pageReference: undefined,
          quotedEvidence: incident.evidence,
          standardsViolated: this.mapToStandards(incident.category, professional.regulatoryBody),
          context: '',
          aggravatingFactors: [],
          mitigatingFactors: [],
        }
        profIncidents.push(conductIncident)
      }
      this.incidents.set(professional.id, profIncidents)
    }
  }

  private findExistingProfessional(name: string, aliases: string[]): Professional | undefined {
    const normalizedName = name.toLowerCase().trim()

    for (const [, prof] of this.professionals) {
      if (prof.name.toLowerCase().trim() === normalizedName) return prof
      if (prof.aliases.some(a => a.toLowerCase().trim() === normalizedName)) return prof
      if (aliases.some(a => prof.name.toLowerCase().trim() === a.toLowerCase().trim())) return prof
      if (
        aliases.some(a =>
          prof.aliases.some(pa => pa.toLowerCase().trim() === a.toLowerCase().trim())
        )
      )
        return prof
    }
    return undefined
  }

  private determineRegulatoryBody(profession: ProfessionType): ProfessionalBody {
    const mapping: Record<ProfessionType, ProfessionalBody> = {
      social_worker: 'SWE',
      psychologist: 'HCPC',
      psychiatrist: 'GMC',
      doctor: 'GMC',
      nurse: 'NMC',
      solicitor: 'SRA',
      barrister: 'BSB',
      police_officer: 'UNKNOWN',
      guardian: 'UNKNOWN',
      expert_witness: 'UNKNOWN',
      other: 'UNKNOWN',
    }
    return mapping[profession] || 'UNKNOWN'
  }

  private mapToStandards(category: ConductCategory, body: ProfessionalBody): StandardViolation[] {
    const bodyStandards = REGULATORY_STANDARDS[body]
    if (!bodyStandards) return []

    return bodyStandards.standards
      .filter(s => s.category === category)
      .map(s => ({
        body,
        standardRef: s.ref,
        standardText: s.text,
        howViolated: 'Conduct inconsistent with this standard',
      }))
  }

  /**
   * Build comprehensive profile for a professional
   */
  private async buildProfile(
    professional: Professional,
    incidents: ConductIncident[]
  ): Promise<ProfessionalProfile> {
    // Calculate breakdowns
    const severityBreakdown: Record<SeverityLevel, number> = {
      minor: 0,
      moderate: 0,
      serious: 0,
      severe: 0,
    }
    const categoryBreakdown: Record<ConductCategory, number> = {
      honesty_integrity: 0,
      competence: 0,
      professional_boundaries: 0,
      record_keeping: 0,
      communication: 0,
      safeguarding: 0,
      confidentiality: 0,
      cooperation: 0,
      bias_discrimination: 0,
      procedural_compliance: 0,
    }

    for (const incident of incidents) {
      severityBreakdown[incident.severity]++
      categoryBreakdown[incident.category]++
    }

    // Analyze patterns
    const pattern = await this.analyzePatterns(incidents)

    // Generate referral recommendation
    const referralRecommendation = this.generateReferralRecommendation(
      professional,
      incidents,
      pattern
    )

    // Build timeline
    const timeline = this.buildTimeline(incidents)

    return {
      professional,
      incidents,
      totalIncidents: incidents.length,
      severityBreakdown,
      categoryBreakdown,
      pattern,
      referralRecommendation,
      timeline,
    }
  }

  private async analyzePatterns(incidents: ConductIncident[]): Promise<PatternAnalysis> {
    if (incidents.length === 0) {
      return {
        isSystematic: false,
        systematicScore: 0,
        dominantCategory: 'competence',
        escalating: false,
        recurringBehaviors: [],
        conclusions: ['No conduct incidents identified'],
      }
    }

    // Find dominant category
    const categoryCounts: Record<string, number> = {}
    for (const incident of incidents) {
      categoryCounts[incident.category] = (categoryCounts[incident.category] || 0) + 1
    }
    const dominantCategory = Object.entries(categoryCounts).sort(
      (a, b) => b[1] - a[1]
    )[0][0] as ConductCategory

    // Check for systematic pattern
    const sameCategory = incidents.filter(i => i.category === dominantCategory).length
    const systematicScore = Math.min(
      100,
      (sameCategory / incidents.length) * 100 + incidents.length * 5
    )
    const isSystematic = systematicScore > 60 && incidents.length >= 3

    // Check for escalation
    const sortedByDate = incidents
      .filter(i => i.date)
      .sort((a, b) => new Date(a.date!).getTime() - new Date(b.date!).getTime())

    let escalating = false
    if (sortedByDate.length >= 3) {
      const severityValues: Record<SeverityLevel, number> = {
        minor: 1,
        moderate: 2,
        serious: 3,
        severe: 4,
      }
      const earlyAvg =
        sortedByDate
          .slice(0, Math.floor(sortedByDate.length / 2))
          .reduce((sum, i) => sum + severityValues[i.severity], 0) /
        Math.floor(sortedByDate.length / 2)
      const lateAvg =
        sortedByDate
          .slice(Math.floor(sortedByDate.length / 2))
          .reduce((sum, i) => sum + severityValues[i.severity], 0) /
        (sortedByDate.length - Math.floor(sortedByDate.length / 2))
      escalating = lateAvg > earlyAvg + 0.5
    }

    // Identify recurring behaviors
    const descriptionPhrases: Record<string, number> = {}
    for (const incident of incidents) {
      const words = incident.description.toLowerCase().split(/\s+/).slice(0, 5).join(' ')
      descriptionPhrases[words] = (descriptionPhrases[words] || 0) + 1
    }
    const recurringBehaviors = Object.entries(descriptionPhrases)
      .filter(([, count]) => count >= 2)
      .map(([phrase]) => phrase)

    // Generate conclusions
    const conclusions: string[] = []
    if (isSystematic) {
      conclusions.push(
        `Systematic pattern of ${dominantCategory.replace('_', ' ')} issues identified`
      )
    }
    if (escalating) {
      conclusions.push('Conduct severity has escalated over time')
    }
    if (incidents.filter(i => i.severity === 'serious' || i.severity === 'severe').length >= 2) {
      conclusions.push('Multiple serious/severe incidents warrant regulatory attention')
    }

    return {
      isSystematic,
      systematicScore: Math.round(systematicScore),
      dominantCategory,
      escalating,
      recurringBehaviors,
      conclusions,
    }
  }

  private generateReferralRecommendation(
    professional: Professional,
    incidents: ConductIncident[],
    pattern: PatternAnalysis
  ): ReferralRecommendation {
    if (incidents.length === 0 || professional.regulatoryBody === 'UNKNOWN') {
      return {
        recommended: false,
        strength: 'not_recommended',
        body: professional.regulatoryBody,
        primaryGrounds: [],
        supportingEvidence: [],
        potentialOutcomes: [],
        risks: ['Insufficient evidence for referral'],
      }
    }

    // Score the case
    let score = 0

    // Severity scoring
    score += incidents.filter(i => i.severity === 'severe').length * 30
    score += incidents.filter(i => i.severity === 'serious').length * 20
    score += incidents.filter(i => i.severity === 'moderate').length * 10
    score += incidents.filter(i => i.severity === 'minor').length * 3

    // Pattern scoring
    if (pattern.isSystematic) score += 25
    if (pattern.escalating) score += 15

    // Volume scoring
    score += Math.min(25, incidents.length * 5)

    // Determine strength
    let strength: ReferralRecommendation['strength']
    if (score >= 80) strength = 'strong'
    else if (score >= 50) strength = 'moderate'
    else if (score >= 30) strength = 'weak'
    else strength = 'not_recommended'

    // Primary grounds
    const primaryGrounds: string[] = []
    if (pattern.isSystematic) {
      primaryGrounds.push(`Systematic pattern of ${pattern.dominantCategory.replace('_', ' ')}`)
    }
    const severeIncidents = incidents.filter(
      i => i.severity === 'severe' || i.severity === 'serious'
    )
    for (const incident of severeIncidents.slice(0, 3)) {
      primaryGrounds.push(incident.description.substring(0, 100))
    }

    // Supporting evidence
    const supportingEvidence = incidents
      .filter(i => i.quotedEvidence)
      .map(
        i => `${i.documentName} p.${i.pageReference}: "${i.quotedEvidence?.substring(0, 50)}..."`
      )

    // Potential outcomes
    const potentialOutcomes: string[] = []
    if (strength === 'strong') {
      potentialOutcomes.push('Suspension or conditions on practice')
      potentialOutcomes.push('Formal warning')
    } else if (strength === 'moderate') {
      potentialOutcomes.push('Conditions on practice')
      potentialOutcomes.push('Undertakings')
    }
    potentialOutcomes.push('No action (if insufficient evidence)')

    // Risks
    const risks: string[] = []
    if (incidents.some(i => i.mitigatingFactors.length > 0)) {
      risks.push('Mitigating factors may reduce sanction')
    }
    if (!pattern.isSystematic) {
      risks.push('Isolated incidents may not meet threshold')
    }
    risks.push('Respondent may dispute facts')

    return {
      recommended: strength !== 'not_recommended',
      strength,
      body: professional.regulatoryBody,
      primaryGrounds,
      supportingEvidence: supportingEvidence.slice(0, 5),
      potentialOutcomes,
      risks,
    }
  }

  private buildTimeline(incidents: ConductIncident[]): TimelineEntry[] {
    return incidents
      .filter(i => i.date)
      .map(i => ({
        date: i.date!,
        event: i.description.substring(0, 100),
        incidentId: i.id,
        documentId: i.documentId,
        significance:
          i.severity === 'severe' || i.severity === 'serious'
            ? ('high' as const)
            : i.severity === 'moderate'
              ? ('medium' as const)
              : ('low' as const),
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  }

  /**
   * Identify patterns across multiple professionals
   */
  private identifyCrossPatterns(profiles: ProfessionalProfile[]): CrossProfessionalPattern[] {
    const patterns: CrossProfessionalPattern[] = []

    // Group by employer
    const byEmployer: Record<string, ProfessionalProfile[]> = {}
    for (const profile of profiles) {
      const employer = profile.professional.employer || 'Unknown'
      byEmployer[employer] = byEmployer[employer] || []
      byEmployer[employer].push(profile)
    }

    // Check for employer-wide patterns
    for (const [employer, employerProfiles] of Object.entries(byEmployer)) {
      if (employerProfiles.length >= 2) {
        const totalIncidents = employerProfiles.reduce((sum, p) => sum + p.totalIncidents, 0)
        const commonCategories = this.findCommonCategories(employerProfiles)

        if (commonCategories.length > 0 && totalIncidents >= 5) {
          patterns.push({
            patternType: 'employer_wide',
            description: `Multiple professionals at ${employer} show similar conduct issues in: ${commonCategories.join(', ')}`,
            involvedProfessionals: employerProfiles.map(p => p.professional.name),
            commonBehaviors: commonCategories,
            significance: totalIncidents >= 10 ? 'high' : 'medium',
          })
        }
      }
    }

    // Check for profession-wide patterns
    const byProfession: Record<string, ProfessionalProfile[]> = {}
    for (const profile of profiles) {
      byProfession[profile.professional.profession] =
        byProfession[profile.professional.profession] || []
      byProfession[profile.professional.profession].push(profile)
    }

    for (const [profession, professionProfiles] of Object.entries(byProfession)) {
      if (professionProfiles.length >= 2) {
        const recurringIssues = this.findRecurringIssues(professionProfiles)
        if (recurringIssues.length > 0) {
          patterns.push({
            patternType: 'profession_wide',
            description: `Pattern of ${recurringIssues.join(', ')} across ${profession} professionals`,
            involvedProfessionals: professionProfiles.map(p => p.professional.name),
            commonBehaviors: recurringIssues,
            significance: 'medium',
          })
        }
      }
    }

    return patterns
  }

  private findCommonCategories(profiles: ProfessionalProfile[]): string[] {
    const categoryCounts: Record<string, number> = {}
    for (const profile of profiles) {
      for (const [category, count] of Object.entries(profile.categoryBreakdown)) {
        if (count > 0) {
          categoryCounts[category] = (categoryCounts[category] || 0) + 1
        }
      }
    }
    return Object.entries(categoryCounts)
      .filter(([, count]) => count >= 2)
      .map(([category]) => category.replace('_', ' '))
  }

  private findRecurringIssues(profiles: ProfessionalProfile[]): string[] {
    const issues: string[] = []
    const allBehaviors = profiles.flatMap(p => p.pattern.recurringBehaviors)
    const behaviorCounts: Record<string, number> = {}
    for (const behavior of allBehaviors) {
      behaviorCounts[behavior] = (behaviorCounts[behavior] || 0) + 1
    }
    for (const [behavior, count] of Object.entries(behaviorCounts)) {
      if (count >= 2) issues.push(behavior)
    }
    return issues
  }

  /**
   * Generate tracking summary
   */
  private generateSummary(
    profiles: ProfessionalProfile[],
    referralCandidates: ProfessionalProfile[]
  ): TrackingSummary {
    const totalIncidents = profiles.reduce((sum, p) => sum + p.totalIncidents, 0)
    const professionBreakdown: Record<string, number> = {}
    for (const profile of profiles) {
      professionBreakdown[profile.professional.profession] =
        (professionBreakdown[profile.professional.profession] || 0) + 1
    }

    return {
      totalProfessionals: profiles.length,
      totalIncidents,
      referralCandidatesCount: referralCandidates.length,
      professionBreakdown,
      highestRiskProfessional: referralCandidates[0]?.professional.name || null,
      summary: `Tracked ${profiles.length} professionals with ${totalIncidents} total conduct incidents. ${referralCandidates.length} recommended for regulatory referral.`,
    }
  }

  /**
   * Store findings in database
   */
  private async storeFindings(result: ProfessionalTrackingResult): Promise<void> {
    const findings = result.referralCandidates.map(profile => ({
      case_id: result.caseId,
      engine: 'professional_tracker',
      title: `Referral Recommended: ${profile.professional.name}`,
      description: profile.referralRecommendation.primaryGrounds.join('; '),
      severity:
        profile.referralRecommendation.strength === 'strong'
          ? 'critical'
          : profile.referralRecommendation.strength === 'moderate'
            ? 'high'
            : 'medium',
      document_ids: profile.incidents.map(i => i.documentId),
      evidence: {
        professional: profile.professional,
        pattern: profile.pattern,
        recommendation: profile.referralRecommendation,
        incidents: profile.incidents.slice(0, 10), // Limit for storage
      },
      confidence: profile.pattern.systematicScore,
    }))

    if (findings.length > 0) {
      // Findings storage handled by Rust backend via Tauri commands
      console.log(
        `[Professional Tracker] Generated ${findings.length} findings - storage handled by Rust backend`
      )
    }
  }

  /**
   * AI-powered extraction of professionals from document text
   */
  private async aiExtractProfessionals(
    content: string,
    documentName: string,
    documentId: string
  ): Promise<ExtractedProfessional[]> {
    if (!this.anthropic) {
      return this.fallbackExtraction(content, documentName, documentId)
    }

    const prompt = `Extract all professionals mentioned in this document. For each professional, identify:
- name: Full name
- aliases: Any other names used (e.g., "the social worker", initials)
- profession: One of: social_worker, doctor, nurse, police_officer, teacher, solicitor, barrister, judge, psychologist, psychiatrist, cafcass_officer, other
- role: Their specific role in the case
- employer: Organization they work for
- registrationNumber: If mentioned
- conductIncidents: Any concerns about their conduct (with severity: minor/moderate/serious/severe)

Document: ${documentName}
Content (excerpt):
${content.substring(0, 8000)}

Respond as JSON:
{
  "professionals": [
    {
      "name": "...",
      "aliases": ["..."],
      "profession": "...",
      "role": "...",
      "employer": "...",
      "registrationNumber": "...",
      "incidents": [
        {
          "description": "...",
          "severity": "...",
          "category": "competence|honesty|boundaries|record_keeping|communication|safeguarding|scope",
          "date": "...",
          "pageReference": "...",
          "quotedEvidence": "..."
        }
      ]
    }
  ]
}`

    try {
      const response = await this.anthropic.messages.create({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 4000,
        messages: [{ role: 'user', content: prompt }],
      })

      const text = response.content[0].type === 'text' ? response.content[0].text : ''
      const jsonMatch = text.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return (parsed.professionals || []).map((p: ExtractedProfessional) => ({
          name: p.name,
          aliases: p.aliases,
          profession: p.profession,
          role: p.role,
          employer: p.employer,
          registrationNumber: p.registrationNumber,
          conductIncidents: p.conductIncidents || [],
        }))
      }
    } catch (error) {
      console.error('AI extraction failed:', error)
    }

    return this.fallbackExtraction(content, documentName, documentId)
  }

  private fallbackExtraction(
    content: string,
    documentName: string,
    documentId: string
  ): ExtractedProfessional[] {
    // Basic regex-based extraction as fallback
    const professionals: ExtractedProfessional[] = []

    const patterns = [
      /(?:social worker|SW)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
      /(?:Dr\.?|Doctor)\s+([A-Z][a-z]+\s+[A-Z][a-z]+)/gi,
      /(?:PC|Police Constable|Officer)\s+([A-Z][a-z]+)/gi,
    ]

    for (const pattern of patterns) {
      let match
      while ((match = pattern.exec(content)) !== null) {
        professionals.push({
          name: match[1],
          aliases: [],
          profession: pattern.source.includes('social')
            ? 'social_worker'
            : pattern.source.includes('Dr')
              ? 'doctor'
              : 'police_officer',
          role: 'Unknown',
          conductIncidents: [],
        })
      }
    }

    return professionals
  }
}

// Export singleton instance
export const professionalTrackerEngine = new ProfessionalTrackerEngine()
