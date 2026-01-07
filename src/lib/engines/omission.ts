/**
 * OMISSION DETECTION ENGINE (Ο - παράλειψις)
 * "What Was Left Out"
 * 
 * Identifies systematic gaps in professional reports by comparing
 * source documents against reports that cite or reference them.
 * 
 * Core Question: Did omissions systematically favor one narrative?
 */

import { generateJSON } from '@/lib/ai-client'
import { supabaseAdmin } from '@/lib/supabase/server'
import type { Document } from '@/CONTRACT'

// Types for this engine
export interface OmissionFinding {
  id: string
  type: 'complete_omission' | 'selective_quote' | 'context_removal' | 'temporal_gap'
  severity: 'critical' | 'high' | 'medium' | 'low'
  sourceDocId: string
  reportDocId: string
  sourceContent: string
  reportContent?: string
  omittedContent: string
  biasDirection?: 'pro_applicant' | 'pro_respondent' | 'pro_authority' | 'neutral'
  significance: number // 0-100
  explanation: string
  pageRef?: {
    source: number
    report: number
  }
}

export interface OmissionAnalysisResult {
  findings: OmissionFinding[]
  summary: {
    totalOmissions: number
    criticalCount: number
    biasScore: number // -100 to +100 (negative = pro-respondent, positive = pro-applicant)
    systematicPattern: boolean
    affectedTopics: string[]
  }
  methodology: string
}

// Prompts for the engine
const OMISSION_DETECTION_PROMPT = `You are an expert forensic document analyst specializing in identifying omissions in professional reports.

TASK: Compare the SOURCE DOCUMENT against the PROFESSIONAL REPORT to identify what was omitted, selectively quoted, or had context removed.

SOURCE DOCUMENT:
{source_content}

PROFESSIONAL REPORT (that references/cites the source):
{report_content}

Analyze for these omission types:
1. COMPLETE_OMISSION: Information in source entirely absent from report
2. SELECTIVE_QUOTE: Partial quotation that changes meaning
3. CONTEXT_REMOVAL: Quote used but surrounding context omitted
4. TEMPORAL_GAP: Events/dates in source not reflected in report timeline

For each omission found, provide:
- type: The omission type
- severity: critical/high/medium/low based on impact on findings
- sourceContent: The original text from source
- omittedContent: What was left out
- reportContent: How it appears in report (if at all)
- biasDirection: Which party benefits from this omission
- significance: 0-100 score of how much this affects conclusions
- explanation: Why this omission matters

Focus on omissions that:
- Affect credibility assessments
- Remove exculpatory information
- Change the meaning of statements
- Omit professional opinions or findings
- Skip over timeline gaps

Respond in JSON format:
{
  "omissions": [...],
  "overallBiasDirection": "pro_applicant" | "pro_respondent" | "pro_authority" | "neutral",
  "systematicPattern": true/false,
  "patternExplanation": "..."
}`

const SELECTIVE_QUOTE_PROMPT = `Analyze this quotation for selective editing:

ORIGINAL SOURCE TEXT:
{original}

AS QUOTED IN REPORT:
{quoted}

Identify:
1. What words/sentences were removed?
2. Does the removal change the meaning?
3. What context is missing?
4. Does the edited quote support a different conclusion than the full text?

Respond in JSON:
{
  "isSelective": boolean,
  "removedContent": "...",
  "meaningChanged": boolean,
  "originalMeaning": "...",
  "quotedMeaning": "...",
  "beneficiary": "applicant" | "respondent" | "authority" | "unclear"
}`

/**
 * Main omission detection function
 */
export async function detectOmissions(
  sourceDoc: Document,
  reportDoc: Document,
  caseId: string
): Promise<OmissionAnalysisResult> {
  // Get document content from chunks
  const [sourceChunks, reportChunks] = await Promise.all([
    getDocumentChunks(sourceDoc.id),
    getDocumentChunks(reportDoc.id)
  ])

  const sourceContent = sourceChunks.map((c: { content: string }) => c.content).join('\n\n')
  const reportContent = reportChunks.map((c: { content: string }) => c.content).join('\n\n')

  // Perform analysis
  let result;

  if (process.env.NEXT_PUBLIC_SUPABASE_URL?.includes('placeholder')) {
    console.log('[MOCK ENGINE] Using Mock Omission Detection')
    // Simulate API latency
    await new Promise(resolve => setTimeout(resolve, 1500))

    result = {
      omissions: [
        {
          type: 'complete_omission',
          severity: 'critical',
          sourceContent: 'The father has correctly attended all scheduled contact sessions since January.',
          omittedContent: 'The father has correctly attended all scheduled contact sessions since January.',
          reportContent: 'Father has had some contact.',
          biasDirection: 'pro_respondent',
          significance: 85,
          explanation: 'The report minimizes the consistency of contact, omitting the specific confirmation of full attendance.',
          pageRef: { source: 3, report: 5 }
        },
        {
          type: 'context_removal',
          severity: 'high',
          sourceContent: 'While there were initial concerns about hygiene, these have been largely addressed by the implementation of the new routine.',
          omittedContent: 'these have been largely addressed by the implementation of the new routine',
          reportContent: 'There were concerns about hygiene.',
          biasDirection: 'pro_authority',
          significance: 75,
          explanation: 'Removes the qualifying context that the issue was resolved.',
          pageRef: { source: 4, report: 6 }
        }
      ],
      systematicPattern: true,
      overallBiasDirection: 'pro_authority'
    }
  } else {
    // Real AI Analysis via Router
    const analysisPrompt = OMISSION_DETECTION_PROMPT
      .replace('{source_content}', sourceContent)
      .replace('{report_content}', reportContent)

    result = await generateJSON('You are an expert forensic document analyst.', analysisPrompt)
  }

  // Process and validate findings
  const findings: OmissionFinding[] = result.omissions.map((o: any, idx: number) => ({
    id: `omission-${sourceDoc.id.slice(0, 8)}-${idx}`,
    type: o.type,
    severity: o.severity,
    sourceDocId: sourceDoc.id,
    reportDocId: reportDoc.id,
    sourceContent: o.sourceContent,
    reportContent: o.reportContent,
    omittedContent: o.omittedContent,
    biasDirection: o.biasDirection,
    significance: o.significance,
    explanation: o.explanation,
    pageRef: o.pageRef
  }))

  // Calculate bias score
  const biasScore = calculateBiasScore(findings)

  return {
    findings,
    summary: {
      totalOmissions: findings.length,
      criticalCount: findings.filter(f => f.severity === 'critical').length,
      biasScore,
      systematicPattern: result.systematicPattern,
      affectedTopics: extractTopics(findings)
    },
    methodology: 'Source-to-report comparison with selective quoting detection'
  }
}

/**
 * Detect selective quoting in a specific passage
 */
export async function analyzeSelectiveQuote(
  original: string,
  quoted: string
): Promise<{
  isSelective: boolean
  severity: 'critical' | 'high' | 'medium' | 'low'
  analysis: any
}> {
  const prompt = SELECTIVE_QUOTE_PROMPT
    .replace('{original}', original)
    .replace('{quoted}', quoted)

  const analysis = await generateJSON('Analyze this quotation for selective editing.', prompt)

  // Determine severity
  let severity: 'critical' | 'high' | 'medium' | 'low' = 'low'
  if (analysis.meaningChanged && analysis.beneficiary !== 'unclear') {
    severity = 'critical'
  } else if (analysis.meaningChanged) {
    severity = 'high'
  } else if (analysis.isSelective) {
    severity = 'medium'
  }

  return {
    isSelective: analysis.isSelective,
    severity,
    analysis
  }
}

/**
 * Compare disclosure list against documents to find undisclosed items
 */
export async function findUndisclosedDocuments(
  disclosureList: string[],
  availableDocIds: string[],
  caseId: string
): Promise<{
  disclosed: string[]
  undisclosed: string[]
  partiallyDisclosed: { docId: string; missingPages: number[] }[]
}> {
  // Get metadata for all available documents
  const { data: docs } = await supabaseAdmin
    .from('documents')
    .select('id, filename, page_count, metadata')
    .in('id', availableDocIds)

  const disclosed: string[] = []
  const undisclosed: string[] = []
  const partiallyDisclosed: { docId: string; missingPages: number[] }[] = []

  for (const doc of docs || []) {
    const isInDisclosure = disclosureList.some(item =>
      item.toLowerCase().includes(doc.filename.toLowerCase()) ||
      doc.filename.toLowerCase().includes(item.toLowerCase())
    )

    if (isInDisclosure) {
      disclosed.push(doc.id)
    } else {
      undisclosed.push(doc.id)
    }
  }

  return { disclosed, undisclosed, partiallyDisclosed }
}

/**
 * Batch analyze all reports against their sources
 */
export async function runFullOmissionAnalysis(
  caseId: string,
  reportDocIds: string[],
  sourceDocIds: string[]
): Promise<OmissionAnalysisResult[]> {
  const results: OmissionAnalysisResult[] = []

  // Get all documents
  const { data: reports } = await supabaseAdmin
    .from('documents')
    .select('*')
    .in('id', reportDocIds)

  const { data: sources } = await supabaseAdmin
    .from('documents')
    .select('*')
    .in('id', sourceDocIds)

  if (!reports || !sources) return results

  // For each report, compare against relevant sources
  for (const report of reports) {
    // Determine which sources this report should reference
    const relevantSources = sources.filter((s: Document) =>
      shouldCompare(report, s)
    )

    for (const source of relevantSources) {
      try {
        const result = await detectOmissions(source, report, caseId)
        results.push(result)

        // Store findings in database
        await storeFindingsInDatabase(caseId, result.findings)
      } catch (error) {
        console.error(`Error analyzing ${source.id} vs ${report.id}:`, error)
      }
    }
  }

  return results
}

// Helper functions

async function getDocumentChunks(docId: string) {
  const { data } = await supabaseAdmin
    .from('document_chunks')
    .select('content, chunk_index, page_number')
    .eq('document_id', docId)
    .order('chunk_index')

  return data || []
}

function calculateBiasScore(findings: OmissionFinding[]): number {
  let score = 0

  for (const finding of findings) {
    const weight = finding.significance / 100
    const severityMultiplier =
      finding.severity === 'critical' ? 4 :
        finding.severity === 'high' ? 2 :
          finding.severity === 'medium' ? 1 : 0.5

    switch (finding.biasDirection) {
      case 'pro_applicant':
        score += weight * severityMultiplier * 10
        break
      case 'pro_respondent':
        score -= weight * severityMultiplier * 10
        break
      case 'pro_authority':
        score += weight * severityMultiplier * 5
        break
    }
  }

  // Clamp to -100 to +100
  return Math.max(-100, Math.min(100, score))
}

function extractTopics(findings: OmissionFinding[]): string[] {
  const topics = new Set<string>()

  for (const finding of findings) {
    // Extract key topics from the omitted content
    const words = finding.omittedContent.toLowerCase().split(/\s+/)
    const keyTerms = ['allegation', 'police', 'nfa', 'witness', 'evidence',
      'statement', 'assessment', 'finding', 'conclusion', 'opinion',
      'credibility', 'disclosure', 'safeguarding', 'welfare']

    for (const term of keyTerms) {
      if (words.some(w => w.includes(term))) {
        topics.add(term)
      }
    }
  }

  return Array.from(topics)
}

function shouldCompare(report: Document, source: Document): boolean {
  // Logic to determine if a report should reference a source
  // Based on document types and metadata

  const reportTypes = ['expert_report', 'social_work_assessment', 'threshold_document']
  const sourceTypes = ['police_bundle', 'witness_statement', 'disclosure', 'transcript']

  if (!reportTypes.includes(report.doc_type || '')) return false
  if (!sourceTypes.includes(source.doc_type || '')) return false

  // Check if source predates report
  if (source.created_at && report.created_at) {
    return new Date(source.created_at) < new Date(report.created_at)
  }

  return true
}

async function storeFindingsInDatabase(caseId: string, findings: OmissionFinding[]) {
  const dbFindings = findings.map(f => ({
    case_id: caseId,
    engine: 'omission',
    title: `${f.type.replace('_', ' ')} detected`,
    description: f.explanation,
    severity: f.severity,
    confidence: f.significance / 100,
    document_ids: [f.sourceDocId, f.reportDocId],
    evidence: {
      type: f.type,
      sourceContent: f.sourceContent,
      omittedContent: f.omittedContent,
      reportContent: f.reportContent,
      biasDirection: f.biasDirection
    }
  }))

  const { error } = await supabaseAdmin
    .from('findings')
    .insert(dbFindings)

  if (error) {
    console.error('Error storing omission findings:', error)
  }
}

export const omissionEngine = {
  detectOmissions,
  analyzeSelectiveQuote,
  findUndisclosedDocuments,
  runFullOmissionAnalysis
}
