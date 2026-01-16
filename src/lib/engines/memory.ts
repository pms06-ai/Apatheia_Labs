/**
 * MEMORY ENGINE (Μν)
 * "Institutional Memory"
 *
 * Tracks how information persists (or disappears) across institutional records.
 * Identifies gaps in record-keeping, selective memory, and information that
 * should have been recorded but wasn't.
 *
 * Core Question: What should have been recorded but wasn't?
 *
 * Status: PLANNED - Stub implementation
 */

import type { Document } from '@/CONTRACT'

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * A memory gap - information that should exist but doesn't
 */
export interface MemoryGap {
  /** Gap ID */
  id: string
  /** Type of gap */
  gapType: 'missing_record' | 'incomplete_entry' | 'disappeared_information' | 'selective_recording'
  /** Description of what's missing */
  description: string
  /** Expected source of information */
  expectedSource: string
  /** Time period of gap */
  timePeriod: {
    start: string
    end: string
  }
  /** Evidence suggesting this gap exists */
  evidence: {
    documentId: string
    excerpt: string
    reasoning: string
  }[]
  /** Severity of the gap */
  severity: 'low' | 'medium' | 'high' | 'critical'
  /** Whether gap favors a particular party */
  beneficiary?: string
}

/**
 * A memory trace - information that persists across records
 */
export interface MemoryTrace {
  /** Trace ID */
  id: string
  /** The information being traced */
  information: string
  /** Documents where this appears */
  appearances: {
    documentId: string
    date: string
    version: string
    changes?: string
  }[]
  /** Whether information is consistent across appearances */
  isConsistent: boolean
  /** Changes/mutations detected */
  mutations: {
    from: string
    to: string
    documentId: string
    date: string
  }[]
}

/**
 * Recording pattern analysis
 */
export interface RecordingPattern {
  /** Entity responsible for recording */
  recordingEntity: string
  /** Type of records */
  recordType: string
  /** Expected frequency */
  expectedFrequency: string
  /** Actual frequency */
  actualFrequency: string
  /** Gaps in recording */
  gapPeriods: { start: string; end: string }[]
  /** Compliance rate (0-1) */
  complianceRate: number
}

/**
 * Memory analysis result
 */
export interface MemoryAnalysisResult {
  /** Case ID */
  caseId: string
  /** Identified memory gaps */
  gaps: MemoryGap[]
  /** Information traces */
  traces: MemoryTrace[]
  /** Recording patterns */
  patterns: RecordingPattern[]
  /** Summary statistics */
  statistics: {
    totalGaps: number
    criticalGaps: number
    gapsPerInstitution: Record<string, number>
    avgComplianceRate: number
  }
  /** Directional analysis */
  directionalAnalysis: {
    gapsBenefitingParty: Record<string, number>
    biasScore: number
    biasDirection: 'neutral' | 'prosecution' | 'defense'
  }
  /** Timestamp */
  analyzedAt: string
}

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Expected record types by institution */
const EXPECTED_RECORDS: Record<string, string[]> = {
  'social services': [
    'case notes',
    'assessment',
    'review',
    'visit record',
    'supervision',
    'child protection',
    'referral',
    'strategy meeting',
    'core group',
  ],
  police: [
    'incident report',
    'witness statement',
    'crime report',
    'interview',
    'disclosure',
    'investigation log',
    'arrest record',
    'charge sheet',
  ],
  court: [
    'hearing',
    'order',
    'judgment',
    'position statement',
    'bundle',
    'application',
    'directions',
    'final order',
  ],
  cafcass: [
    'safeguarding letter',
    'section 7 report',
    'wishes and feelings',
    'analysis',
    'recommendation',
    'addendum',
  ],
  medical: [
    'consultation',
    'examination',
    'report',
    'referral',
    'discharge',
    'prescription',
    'test results',
  ],
}

/** Keywords indicating record types */
const _RECORD_TYPE_PATTERNS: Record<string, string[]> = {
  visit: ['visit', 'visited', 'home visit', 'contact visit'],
  assessment: ['assessment', 'assessed', 'evaluation'],
  meeting: ['meeting', 'conference', 'strategy', 'core group', 'review'],
  report: ['report', 'statement', 'summary'],
  correspondence: ['letter', 'email', 'communication'],
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function generateId(): string {
  return `mem-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

function extractDates(text: string): string[] {
  // Match various date formats
  const patterns = [
    /\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/g, // DD/MM/YYYY, DD-MM-YYYY
    /\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}/g, // YYYY-MM-DD
    /(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}/gi,
    /\d{1,2}\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi,
  ]

  const dates: string[] = []
  for (const pattern of patterns) {
    const matches = text.match(pattern) || []
    dates.push(...matches)
  }

  return [...new Set(dates)]
}

function detectInstitution(text: string): string {
  const lower = text.toLowerCase()
  if (lower.includes('social') || lower.includes('children services')) return 'social services'
  if (lower.includes('police') || lower.includes('constabulary')) return 'police'
  if (lower.includes('court') || lower.includes('tribunal')) return 'court'
  if (lower.includes('cafcass')) return 'cafcass'
  if (lower.includes('gp') || lower.includes('hospital') || lower.includes('nhs')) return 'medical'
  return 'unknown'
}

function extractKeyPhrases(text: string): string[] {
  // Extract important phrases (capitalized sequences, quoted text)
  const phrases: string[] = []

  // Capitalized phrases (potential key facts)
  const capitalPhrases = text.match(/[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+/g) || []
  phrases.push(...capitalPhrases)

  // Quoted text
  const quoted = text.match(/"[^"]+"|'[^']+'/g) || []
  phrases.push(...quoted.map(q => q.slice(1, -1)))

  return [...new Set(phrases)].slice(0, 20)
}

function detectGapType(context: string): MemoryGap['gapType'] {
  const lower = context.toLowerCase()
  if (lower.includes('no record') || lower.includes('not recorded')) return 'missing_record'
  if (lower.includes('incomplete') || lower.includes('partial')) return 'incomplete_entry'
  if (lower.includes('removed') || lower.includes('deleted') || lower.includes('lost'))
    return 'disappeared_information'
  return 'selective_recording'
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE IMPLEMENTATION
// ═══════════════════════════════════════════════════════════════════════════

export const memoryEngine = {
  /**
   * Analyze institutional memory patterns
   * Identifies gaps in record-keeping and traces information persistence
   * @param documents - Documents to analyze
   * @param caseId - Case ID
   * @returns Memory analysis result
   */
  async analyzeMemory(documents: Document[], caseId: string): Promise<MemoryAnalysisResult> {
    if (documents.length === 0) {
      return {
        caseId,
        gaps: [],
        traces: [],
        patterns: [],
        statistics: {
          totalGaps: 0,
          criticalGaps: 0,
          gapsPerInstitution: {},
          avgComplianceRate: 1.0,
        },
        directionalAnalysis: {
          gapsBenefitingParty: {},
          biasScore: 0,
          biasDirection: 'neutral',
        },
        analyzedAt: new Date().toISOString(),
      }
    }

    // Step 1: Identify memory gaps
    const gaps = await this.identifyGaps(documents, [])

    // Step 2: Trace key information across documents
    const keyPhrases = documents.flatMap(d => extractKeyPhrases(d.extracted_text || ''))
    const uniquePhrases = [...new Set(keyPhrases)].slice(0, 10)
    const traces: MemoryTrace[] = []
    for (const phrase of uniquePhrases) {
      const phraseTraces = await this.traceInformation(documents, phrase)
      traces.push(...phraseTraces)
    }

    // Step 3: Analyze recording patterns
    const patterns = await this.analyzeRecordingPatterns(documents)

    // Step 4: Calculate statistics
    const gapsPerInstitution: Record<string, number> = {}
    for (const gap of gaps) {
      const inst = gap.expectedSource
      gapsPerInstitution[inst] = (gapsPerInstitution[inst] || 0) + 1
    }

    const complianceRates = patterns.map(p => p.complianceRate)
    const avgComplianceRate =
      complianceRates.length > 0
        ? complianceRates.reduce((a, b) => a + b, 0) / complianceRates.length
        : 1.0

    // Step 5: Directional analysis
    const gapsBenefitingParty: Record<string, number> = {}
    let prosecutionGaps = 0
    let defenseGaps = 0

    for (const gap of gaps) {
      if (gap.beneficiary) {
        gapsBenefitingParty[gap.beneficiary] = (gapsBenefitingParty[gap.beneficiary] || 0) + 1
        if (
          gap.beneficiary.toLowerCase().includes('prosecution') ||
          gap.beneficiary.toLowerCase().includes('local authority')
        ) {
          prosecutionGaps++
        } else {
          defenseGaps++
        }
      }
    }

    const total = prosecutionGaps + defenseGaps
    const biasScore = total > 0 ? (prosecutionGaps - defenseGaps) / total : 0
    const biasDirection = biasScore > 0.1 ? 'prosecution' : biasScore < -0.1 ? 'defense' : 'neutral'

    return {
      caseId,
      gaps,
      traces,
      patterns,
      statistics: {
        totalGaps: gaps.length,
        criticalGaps: gaps.filter(g => g.severity === 'critical').length,
        gapsPerInstitution,
        avgComplianceRate,
      },
      directionalAnalysis: {
        gapsBenefitingParty,
        biasScore,
        biasDirection,
      },
      analyzedAt: new Date().toISOString(),
    }
  },

  /**
   * Identify memory gaps by comparing expected vs actual records
   */
  async identifyGaps(documents: Document[], expectedRecords: string[]): Promise<MemoryGap[]> {
    const gaps: MemoryGap[] = []

    // Group documents by institution
    const byInstitution: Record<string, Document[]> = {}
    for (const doc of documents) {
      const inst = detectInstitution(doc.extracted_text || '')
      if (!byInstitution[inst]) byInstitution[inst] = []
      byInstitution[inst].push(doc)
    }

    // Check for missing expected records
    for (const [institution, expected] of Object.entries(EXPECTED_RECORDS)) {
      const institutionDocs = byInstitution[institution] || []

      if (
        institutionDocs.length === 0 &&
        documents.some(d => (d.extracted_text || '').toLowerCase().includes(institution))
      ) {
        // Institution is mentioned but has no records
        gaps.push({
          id: generateId(),
          gapType: 'missing_record',
          description: `No records from ${institution} despite references`,
          expectedSource: institution,
          timePeriod: { start: '', end: '' },
          evidence: [
            {
              documentId: documents[0].id,
              excerpt: `References to ${institution} found`,
              reasoning: 'Institution mentioned but no direct records available',
            },
          ],
          severity: 'high',
          beneficiary: undefined,
        })
        continue
      }

      // Check for specific record types
      const allText = institutionDocs
        .map(d => d.extracted_text || '')
        .join(' ')
        .toLowerCase()
      for (const recordType of expected) {
        if (!allText.includes(recordType)) {
          // Check if it's referenced elsewhere
          const referencedElsewhere = documents.some(
            d =>
              !institutionDocs.includes(d) &&
              (d.extracted_text || '').toLowerCase().includes(recordType)
          )

          if (referencedElsewhere) {
            gaps.push({
              id: generateId(),
              gapType: 'missing_record',
              description: `${recordType} from ${institution} referenced but not provided`,
              expectedSource: institution,
              timePeriod: { start: '', end: '' },
              evidence: [
                {
                  documentId: '',
                  excerpt: `Reference to "${recordType}" found in other documents`,
                  reasoning: 'Cross-reference indicates missing source document',
                },
              ],
              severity: 'medium',
              beneficiary: undefined,
            })
          }
        }
      }
    }

    // Detect gaps mentioned in text
    for (const doc of documents) {
      const text = doc.extracted_text || ''
      const gapIndicators = [
        'no record of',
        'not recorded',
        'no notes',
        'missing',
        'unavailable',
        'could not locate',
        'not found',
        'gap in',
        'absence of',
      ]

      for (const indicator of gapIndicators) {
        const regex = new RegExp(`${indicator}[^.]*`, 'gi')
        const matches = text.match(regex) || []

        for (const match of matches) {
          const gapType = detectGapType(match)
          const institution = detectInstitution(match)

          // Determine who benefits from the gap
          let beneficiary: string | undefined
          const lower = match.toLowerCase()
          if (
            lower.includes('exculpatory') ||
            lower.includes('positive') ||
            lower.includes('cleared')
          ) {
            beneficiary = 'prosecution/LA'
          } else if (
            lower.includes('concern') ||
            lower.includes('risk') ||
            lower.includes('allegation')
          ) {
            beneficiary = 'defense/parent'
          }

          gaps.push({
            id: generateId(),
            gapType,
            description: match.slice(0, 150),
            expectedSource: institution,
            timePeriod: { start: '', end: '' },
            evidence: [
              {
                documentId: doc.id,
                excerpt: match,
                reasoning: `Gap indicator "${indicator}" detected`,
              },
            ],
            severity:
              gapType === 'disappeared_information'
                ? 'critical'
                : gapType === 'missing_record'
                  ? 'high'
                  : 'medium',
            beneficiary,
          })
        }
      }
    }

    return gaps
  },

  /**
   * Trace how specific information appears (or disappears) across documents
   */
  async traceInformation(documents: Document[], information: string): Promise<MemoryTrace[]> {
    const traces: MemoryTrace[] = []
    const appearances: MemoryTrace['appearances'] = []

    // Sort documents by date
    const sortedDocs = [...documents].sort((a, b) => {
      const dateA = a.metadata?.date ? new Date(String(a.metadata.date)).getTime() : 0
      const dateB = b.metadata?.date ? new Date(String(b.metadata.date)).getTime() : 0
      return dateA - dateB
    })

    let lastVersion = information
    const mutations: MemoryTrace['mutations'] = []

    for (const doc of sortedDocs) {
      const text = doc.extracted_text || ''
      const lower = text.toLowerCase()
      const searchTerm = information.toLowerCase()

      // Check for exact or fuzzy match
      if (lower.includes(searchTerm)) {
        // Extract the context around the match
        const idx = lower.indexOf(searchTerm)
        const context = text.slice(
          Math.max(0, idx - 50),
          Math.min(text.length, idx + information.length + 50)
        )

        appearances.push({
          documentId: doc.id,
          date: String(doc.metadata?.date || ''),
          version: context.trim(),
          changes: lastVersion !== context ? 'Modified' : undefined,
        })

        // Detect mutations
        if (lastVersion !== context && appearances.length > 1) {
          mutations.push({
            from: lastVersion.slice(0, 80),
            to: context.slice(0, 80),
            documentId: doc.id,
            date: String(doc.metadata?.date || ''),
          })
        }

        lastVersion = context
      }
    }

    if (appearances.length >= 2) {
      traces.push({
        id: generateId(),
        information,
        appearances,
        isConsistent: mutations.length === 0,
        mutations,
      })
    }

    return traces
  },

  /**
   * Analyze recording patterns by institution
   */
  async analyzeRecordingPatterns(documents: Document[]): Promise<RecordingPattern[]> {
    const patterns: RecordingPattern[] = []

    // Group by institution
    const byInstitution: Record<string, Document[]> = {}
    for (const doc of documents) {
      const inst = detectInstitution(doc.extracted_text || '')
      if (!byInstitution[inst]) byInstitution[inst] = []
      byInstitution[inst].push(doc)
    }

    for (const [institution, docs] of Object.entries(byInstitution)) {
      if (institution === 'unknown' || docs.length === 0) continue

      // Analyze dates
      const allDates: Date[] = []
      for (const doc of docs) {
        const dates = extractDates(doc.extracted_text || '')
        dates.forEach(d => {
          const parsed = new Date(d)
          if (!isNaN(parsed.getTime())) allDates.push(parsed)
        })
        if (doc.metadata?.date) {
          const parsed = new Date(String(doc.metadata.date))
          if (!isNaN(parsed.getTime())) allDates.push(parsed)
        }
      }

      if (allDates.length < 2) continue

      allDates.sort((a, b) => a.getTime() - b.getTime())

      // Find gaps between records
      const gapPeriods: { start: string; end: string }[] = []
      for (let i = 1; i < allDates.length; i++) {
        const gap = (allDates[i].getTime() - allDates[i - 1].getTime()) / (1000 * 60 * 60 * 24)
        if (gap > 30) {
          // More than 30 days
          gapPeriods.push({
            start: allDates[i - 1].toISOString().split('T')[0],
            end: allDates[i].toISOString().split('T')[0],
          })
        }
      }

      // Determine expected frequency
      const expectedRecordTypes = EXPECTED_RECORDS[institution] || []
      const expectedFrequency = expectedRecordTypes.some(r =>
        ['visit', 'review', 'supervision'].includes(r)
      )
        ? 'Weekly/Fortnightly'
        : 'Monthly'

      // Calculate compliance
      const totalDays =
        (allDates[allDates.length - 1].getTime() - allDates[0].getTime()) / (1000 * 60 * 60 * 24)
      const gapDays = gapPeriods.reduce((sum, g) => {
        const start = new Date(g.start).getTime()
        const end = new Date(g.end).getTime()
        return sum + (end - start) / (1000 * 60 * 60 * 24)
      }, 0)
      const complianceRate = totalDays > 0 ? 1 - gapDays / totalDays : 1.0

      patterns.push({
        recordingEntity: institution,
        recordType: expectedRecordTypes.join(', ') || 'General records',
        expectedFrequency,
        actualFrequency: `${docs.length} records over ${Math.round(totalDays)} days`,
        gapPeriods,
        complianceRate: Math.max(0, Math.min(1, complianceRate)),
      })
    }

    return patterns
  },
}

export default memoryEngine
