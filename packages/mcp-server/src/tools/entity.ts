/**
 * Entity Resolution Tool
 *
 * Identify and canonicalize people, organizations, and locations
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface ResolvedEntity {
  id: string
  canonicalName: string
  type: 'person' | 'organization' | 'location'
  aliases: string[]
  mentions: { documentId: string; context: string }[]
  credibilityScore?: number
}

export interface EntityResolutionResult {
  entities: ResolvedEntity[]
  linkages: { entity1: string; entity2: string; relationship: string }[]
  summary: {
    totalEntities: number
    byType: { person: number; organization: number; location: number }
  }
}

/**
 * Analyze documents for entities
 */
export async function analyzeEntities(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<EntityResolutionResult> {
  const startTime = Date.now()

  const entities: Map<string, ResolvedEntity> = new Map()

  if (content) {
    // Analyze direct content
    const extracted = extractEntities(content, 'inline-content')
    for (const entity of extracted) {
      const key = entity.canonicalName.toLowerCase()
      entities.set(key, entity)
    }
  } else if (documentIds && documentIds.length > 0) {
    const docs = getDocumentsByIds(documentIds)
    if (docs.length === 0) {
      return {
        entities: [],
        linkages: [],
        summary: { totalEntities: 0, byType: { person: 0, organization: 0, location: 0 } },
      }
    }

    for (const doc of docs) {
      const docContent = getDocumentContent(doc.id)
      const extracted = extractEntities(docContent, doc.id)

      for (const entity of extracted) {
        const key = entity.canonicalName.toLowerCase()
        const existing = entities.get(key)

        if (existing) {
          // Merge mentions and aliases
          existing.mentions.push(...entity.mentions)
          for (const alias of entity.aliases) {
            if (!existing.aliases.includes(alias)) {
              existing.aliases.push(alias)
            }
          }
        } else {
          entities.set(key, entity)
        }
      }
    }
  } else {
    return {
      entities: [],
      linkages: [],
      summary: { totalEntities: 0, byType: { person: 0, organization: 0, location: 0 } },
    }
  }

  const entitiesArray = [...entities.values()]

  // Find linkages between entities
  const linkages = findEntityLinkages(entitiesArray)

  const summary = {
    totalEntities: entitiesArray.length,
    byType: {
      person: entitiesArray.filter(e => e.type === 'person').length,
      organization: entitiesArray.filter(e => e.type === 'organization').length,
      location: entitiesArray.filter(e => e.type === 'location').length,
    },
  }

  // Store findings
  if (caseId && entitiesArray.length > 0) {
    const findings = entitiesArray.slice(0, 20).map(e => ({
      id: e.id,
      case_id: caseId,
      engine: 'entity_resolution',
      finding_type: e.type,
      title: `Entity: ${e.canonicalName}`,
      description: `${e.type} with ${e.aliases.length} aliases across ${e.mentions.length} mentions`,
      severity: 'low' as const,
      confidence: 0.8,
      document_ids: JSON.stringify([...new Set(e.mentions.map(m => m.documentId))]),
      evidence: JSON.stringify({ aliases: e.aliases, mentionCount: e.mentions.length }),
    }))
    storeFindings(findings)
  }

  console.error(`[entity] Analysis complete in ${Date.now() - startTime}ms. Found ${entitiesArray.length} entities.`)

  return { entities: entitiesArray, linkages, summary }
}

/**
 * Extract entities from content
 */
function extractEntities(content: string, documentId: string): ResolvedEntity[] {
  const entities: ResolvedEntity[] = []
  const seen = new Set<string>()

  // Person patterns (titles + names)
  const personPatterns = [
    /(?:Mr|Mrs|Ms|Miss|Dr|Prof|Officer|DI|DC|PC|Sgt|Inspector)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/g,
    /([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s+(?:said|stated|reported|explained|confirmed))/g,
  ]

  for (const pattern of personPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const name = match[1] || match[0]
      const cleanName = name.trim()
      if (cleanName.length > 3 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase())

        // Get context
        const idx = content.indexOf(match[0])
        const context = content.slice(Math.max(0, idx - 50), idx + match[0].length + 50)

        entities.push({
          id: uuidv4(),
          canonicalName: cleanName,
          type: 'person',
          aliases: [],
          mentions: [{ documentId, context }],
        })
      }
    }
  }

  // Organization patterns
  const orgPatterns = [
    /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Council|Authority|Trust|Service|Department|Police|Court))/g,
    /((?:the\s+)?[A-Z][A-Z]+(?:\s+[A-Z][A-Z]+)?)/g, // Acronyms
  ]

  for (const pattern of orgPatterns) {
    const matches = content.matchAll(pattern)
    for (const match of matches) {
      const name = match[1] || match[0]
      const cleanName = name.trim().replace(/^the\s+/i, '')
      if (cleanName.length > 2 && !seen.has(cleanName.toLowerCase())) {
        seen.add(cleanName.toLowerCase())

        const idx = content.indexOf(match[0])
        const context = content.slice(Math.max(0, idx - 50), idx + match[0].length + 50)

        entities.push({
          id: uuidv4(),
          canonicalName: cleanName,
          type: 'organization',
          aliases: [],
          mentions: [{ documentId, context }],
        })
      }
    }
  }

  return entities.slice(0, 50)
}

/**
 * Find relationships between entities
 */
function findEntityLinkages(entities: ResolvedEntity[]): { entity1: string; entity2: string; relationship: string }[] {
  const linkages: { entity1: string; entity2: string; relationship: string }[] = []

  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const e1 = entities[i]
      const e2 = entities[j]

      // Check if entities appear in same context
      for (const m1 of e1.mentions) {
        if (m1.context.includes(e2.canonicalName)) {
          linkages.push({
            entity1: e1.canonicalName,
            entity2: e2.canonicalName,
            relationship: 'co-mentioned',
          })
          break
        }
      }
    }
  }

  return linkages.slice(0, 20)
}
