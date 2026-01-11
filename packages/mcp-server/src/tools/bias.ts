/**
 * Bias Detection Tool
 *
 * Statistical bias analysis including framing ratio and significance testing
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import type { BiasAnalysisResult, Severity } from '../types/index.js'
import { v4 as uuidv4 } from 'uuid'

/**
 * Analyze documents for bias
 */
export async function analyzeBias(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<BiasAnalysisResult> {
  const startTime = Date.now()

  // Collect content to analyze
  const contentsToAnalyze: string[] = []

  if (content) {
    contentsToAnalyze.push(content)
  } else if (documentIds && documentIds.length > 0) {
    const docs = getDocumentsByIds(documentIds)
    if (docs.length === 0) {
      return {
        framingRatio: 1,
        statisticalSignificance: { zScore: 0, pValue: 1 },
        biasIndicators: [],
        summary: {
          overallBias: 'none',
          direction: 'balanced',
          confidence: 0,
        },
      }
    }
    for (const doc of docs) {
      contentsToAnalyze.push(getDocumentContent(doc.id))
    }
  } else {
    return {
      framingRatio: 1,
      statisticalSignificance: { zScore: 0, pValue: 1 },
      biasIndicators: [],
      summary: {
        overallBias: 'none',
        direction: 'balanced',
        confidence: 0,
      },
    }
  }

  // Analyze each content
  let totalProsecution = 0
  let totalDefense = 0
  const indicators: { indicator: string; count: number; examples: string[] }[] = []

  for (const contentItem of contentsToAnalyze) {
    const analysis = analyzeDocumentBias(contentItem)

    totalProsecution += analysis.prosecutionCount
    totalDefense += analysis.defenseCount

    for (const ind of analysis.indicators) {
      const existing = indicators.find(i => i.indicator === ind.indicator)
      if (existing) {
        existing.count += ind.count
        existing.examples.push(...ind.examples)
      } else {
        indicators.push(ind)
      }
    }
  }

  // Calculate framing ratio
  const framingRatio = totalDefense > 0 ? totalProsecution / totalDefense : totalProsecution

  // Calculate z-score for significance
  const total = totalProsecution + totalDefense
  const expected = total / 2
  const stdDev = Math.sqrt(total * 0.5 * 0.5)
  const zScore = stdDev > 0 ? (totalProsecution - expected) / stdDev : 0

  // Convert z-score to p-value (two-tailed)
  const pValue = 2 * (1 - normalCDF(Math.abs(zScore)))

  // Determine overall bias
  let overallBias: 'strong' | 'moderate' | 'weak' | 'none' = 'none'
  if (Math.abs(zScore) >= 3.29) overallBias = 'strong'
  else if (Math.abs(zScore) >= 2.58) overallBias = 'moderate'
  else if (Math.abs(zScore) >= 1.96) overallBias = 'weak'

  const direction = framingRatio > 1.5 ? 'prosecution' : framingRatio < 0.67 ? 'defense' : 'balanced'

  const result: BiasAnalysisResult = {
    framingRatio: Math.round(framingRatio * 100) / 100,
    statisticalSignificance: {
      zScore: Math.round(zScore * 100) / 100,
      pValue: pValue < 0.00001 ? 0.00001 : Math.round(pValue * 100000) / 100000,
    },
    biasIndicators: indicators.slice(0, 10).map(i => ({
      ...i,
      examples: i.examples.slice(0, 3),
    })),
    summary: {
      overallBias,
      direction,
      confidence: Math.round((1 - pValue) * 100) / 100,
    },
  }

  // Store findings
  if (caseId && overallBias !== 'none') {
    storeFindings([{
      id: uuidv4(),
      case_id: caseId,
      engine: 'bias_detection',
      finding_type: 'framing_bias',
      title: `${overallBias} ${direction} bias detected (${framingRatio}:1 ratio)`,
      description: `Statistical analysis reveals ${overallBias} bias toward ${direction} with z-score of ${zScore.toFixed(2)} (p < ${pValue.toFixed(5)})`,
      severity: overallBias === 'strong' ? 'critical' : overallBias === 'moderate' ? 'high' : 'medium',
      confidence: 1 - pValue,
      document_ids: JSON.stringify(documentIds),
      evidence: JSON.stringify(result),
    }])
  }

  console.error(`[bias] Analysis complete in ${Date.now() - startTime}ms. Framing ratio: ${framingRatio}:1`)

  return result
}

/**
 * Analyze single document for bias indicators
 */
function analyzeDocumentBias(content: string): {
  prosecutionCount: number
  defenseCount: number
  indicators: { indicator: string; count: number; examples: string[] }[]
} {
  const lower = content.toLowerCase()
  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 10)

  let prosecutionCount = 0
  let defenseCount = 0
  const indicators: { indicator: string; count: number; examples: string[] }[] = []

  // Prosecution-favoring patterns
  const prosecutionPatterns: [string, RegExp][] = [
    ['Accusatory language', /alleged|accused|suspect|perpetrator|offender/gi],
    ['Negative characterization', /failed to|refused|denied|aggressive|hostile/gi],
    ['Certainty markers', /clearly|obviously|undoubtedly|certainly|definitely/gi],
    ['Prior conduct emphasis', /history of|pattern of|previous|prior/gi],
  ]

  // Defense-favoring patterns
  const defensePatterns: [string, RegExp][] = [
    ['Exculpatory language', /innocent|cleared|exonerated|no evidence|cooperat/gi],
    ['Mitigating language', /however|although|despite|nevertheless|but/gi],
    ['Uncertainty markers', /allegedly|reportedly|claimed|suggested|appeared/gi],
    ['Context provision', /context|background|circumstances|situation/gi],
  ]

  for (const [name, pattern] of prosecutionPatterns) {
    const matches = content.match(pattern) || []
    if (matches.length > 0) {
      prosecutionCount += matches.length

      const examples = sentences
        .filter(s => pattern.test(s))
        .slice(0, 3)

      indicators.push({
        indicator: `Prosecution: ${name}`,
        count: matches.length,
        examples,
      })
    }
  }

  for (const [name, pattern] of defensePatterns) {
    const matches = content.match(pattern) || []
    if (matches.length > 0) {
      defenseCount += matches.length

      const examples = sentences
        .filter(s => pattern.test(s))
        .slice(0, 3)

      indicators.push({
        indicator: `Defense: ${name}`,
        count: matches.length,
        examples,
      })
    }
  }

  return { prosecutionCount, defenseCount, indicators }
}

/**
 * Normal cumulative distribution function
 */
function normalCDF(x: number): number {
  const a1 = 0.254829592
  const a2 = -0.284496736
  const a3 = 1.421413741
  const a4 = -1.453152027
  const a5 = 1.061405429
  const p = 0.3275911

  const sign = x < 0 ? -1 : 1
  x = Math.abs(x) / Math.sqrt(2)

  const t = 1.0 / (1.0 + p * x)
  const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x)

  return 0.5 * (1.0 + sign * y)
}
