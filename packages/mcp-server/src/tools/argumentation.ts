/**
 * Argumentation Analysis Tool
 *
 * Toulmin structure extraction and argument chain building
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

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

/**
 * Analyze documents for arguments
 */
export async function analyzeArgumentation(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<ArgumentationResult> {
  const startTime = Date.now()

  const allArguments: ToulminArgument[] = []

  if (content) {
    const extracted = extractArguments(content, 'inline-content')
    allArguments.push(...extracted)
  } else if (documentIds && documentIds.length > 0) {
    const docs = getDocumentsByIds(documentIds)
    if (docs.length === 0) {
      return {
        arguments: [],
        chains: [],
        summary: { totalArguments: 0, strongArguments: 0, weakArguments: 0, logicalGaps: 0 },
      }
    }

    for (const doc of docs) {
      const docContent = getDocumentContent(doc.id)
      const extracted = extractArguments(docContent, doc.id)
      allArguments.push(...extracted)
    }
  } else {
    return {
      arguments: [],
      chains: [],
      summary: { totalArguments: 0, strongArguments: 0, weakArguments: 0, logicalGaps: 0 },
    }
  }

  // Build argument chains
  const chains = buildArgumentChains(allArguments)

  const summary = {
    totalArguments: allArguments.length,
    strongArguments: allArguments.filter(a => a.strength === 'strong').length,
    weakArguments: allArguments.filter(a => a.strength === 'weak').length,
    logicalGaps: chains.filter(c => c.validity === 'invalid').length,
  }

  // Store findings
  if (caseId && allArguments.length > 0) {
    const weakArgs = allArguments.filter(a => a.strength === 'weak')
    if (weakArgs.length > 0) {
      const findings = weakArgs.slice(0, 10).map(a => ({
        id: a.id,
        case_id: caseId,
        engine: 'argumentation',
        finding_type: 'weak_argument',
        title: `Weak argument: ${a.claim.slice(0, 50)}...`,
        description: `Claim lacks sufficient grounds or warrant`,
        severity: 'medium' as const,
        confidence: 0.7,
        document_ids: JSON.stringify([a.documentId]),
        evidence: JSON.stringify({ grounds: a.grounds, warrant: a.warrant }),
      }))
      storeFindings(findings)
    }
  }

  console.error(`[argumentation] Analysis complete in ${Date.now() - startTime}ms. Found ${allArguments.length} arguments.`)

  return { arguments: allArguments, chains, summary }
}

/**
 * Extract Toulmin arguments from content
 */
function extractArguments(content: string, documentId: string): ToulminArgument[] {
  const args: ToulminArgument[] = []

  // Look for claim patterns
  const claimPatterns = [
    /(?:therefore|thus|hence|consequently|it follows that|this shows that|this demonstrates that)\s+([^.]+)/gi,
    /(?:I|we)\s+(?:conclude|find|determine|believe|submit)\s+(?:that\s+)?([^.]+)/gi,
    /(?:it is|this is)\s+(?:clear|evident|obvious|apparent)\s+(?:that\s+)?([^.]+)/gi,
  ]

  // Look for grounds patterns
  const groundsPatterns = [
    /(?:because|since|as|given that|in light of)\s+([^.]+)/gi,
    /(?:the evidence shows|the facts indicate|as demonstrated by)\s+([^.]+)/gi,
  ]

  const sentences = content.split(/[.!?]+/).map(s => s.trim()).filter(s => s.length > 20)

  for (const sentence of sentences) {
    for (const pattern of claimPatterns) {
      const match = pattern.exec(sentence)
      if (match) {
        const claim = match[1].trim()

        // Look for grounds in nearby sentences
        const idx = sentences.indexOf(sentence)
        const context = sentences.slice(Math.max(0, idx - 3), idx + 2).join(' ')

        const grounds: string[] = []
        for (const gPattern of groundsPatterns) {
          const gMatches = context.matchAll(gPattern)
          for (const gMatch of gMatches) {
            grounds.push(gMatch[1].trim())
          }
        }

        // Determine strength
        let strength: 'strong' | 'moderate' | 'weak' = 'weak'
        if (grounds.length >= 2) strength = 'strong'
        else if (grounds.length === 1) strength = 'moderate'

        args.push({
          id: uuidv4(),
          claim,
          grounds,
          documentId,
          strength,
        })

        break // One argument per sentence
      }
    }
  }

  return args.slice(0, 30)
}

/**
 * Build argument chains from individual arguments
 */
function buildArgumentChains(args: ToulminArgument[]): ArgumentChain[] {
  const chains: ArgumentChain[] = []

  // Group arguments that share similar topics
  // This is simplified - production would use NLP

  if (args.length >= 2) {
    // Create at least one chain from related arguments
    chains.push({
      id: uuidv4(),
      arguments: args.slice(0, 3),
      conclusion: args[0]?.claim || '',
      validity: args.every(a => a.strength === 'strong') ? 'valid' : args.some(a => a.strength === 'weak') ? 'questionable' : 'valid',
    })
  }

  return chains
}
