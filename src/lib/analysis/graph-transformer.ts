import type { Finding, Severity } from '@/CONTRACT'
import { asCoordinationEvidence } from './evidence'

export type NetworkNodeType = 'police' | 'social_services' | 'expert' | 'court' | 'other'

export interface NetworkNode {
  id: string
  label: string
  type: NetworkNodeType
}

export interface NetworkLink {
  source: string
  target: string
  strength: number
  label: string
}

export interface CoordinationGraph {
  nodes: NetworkNode[]
  links: NetworkLink[]
}

function inferNodeType(id: string): NetworkNodeType {
  if (id.includes('police')) return 'police'
  if (id.includes('social')) return 'social_services'
  if (id.includes('expert')) return 'expert'
  if (id.includes('court')) return 'court'
  return 'other'
}

function getLinkStrength(severity: Severity | null, labelType: 'Violation' | 'Flow' | 'Shared Lang'): number {
  if (labelType === 'Violation') {
    return severity === 'critical' ? 5 : 3
  }
  if (labelType === 'Shared Lang') {
    return severity === 'critical' ? 4 : 2
  }
  // Flow
  return severity === 'critical' ? 4 : severity === 'high' ? 3 : 1
}

/**
 * Transforms coordination engine findings into a network graph structure
 * for visualization in the NetworkGraph component.
 */
export function buildCoordinationGraph(findings: Finding[]): CoordinationGraph {
  const nodes = new Map<string, NetworkNode>()
  const links: NetworkLink[] = []

  const addNode = (institution: string): string => {
    const id = institution.toLowerCase().replace(/\s+/g, '_')
    if (!nodes.has(id)) {
      nodes.set(id, {
        id,
        label: institution
          .split('_')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' '),
        type: inferNodeType(id),
      })
    }
    return id
  }

  for (const finding of findings) {
    const ev = asCoordinationEvidence(finding.evidence)

    // 1. Information Flow: source -> target
    if (ev.source && ev.target) {
      const sourceId = addNode(ev.source)
      const targetId = addNode(ev.target)
      links.push({
        source: sourceId,
        target: targetId,
        strength: getLinkStrength(finding.severity, 'Flow'),
        label: ev.type || 'Flow',
      })
    }

    // 2. Independence Violation: clique between institutions
    if (ev.institutions && Array.isArray(ev.institutions)) {
      const ids = ev.institutions.map(addNode)
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          links.push({
            source: ids[i],
            target: ids[j],
            strength: getLinkStrength(finding.severity, 'Violation'),
            label: 'Violation',
          })
        }
      }
    }

    // 3. Shared Language: clique between document institutions
    if (ev.documents && Array.isArray(ev.documents)) {
      const insts = new Set<string>()
      for (const doc of ev.documents) {
        if (doc.institution) insts.add(doc.institution)
      }
      const ids = Array.from(insts).map(addNode)
      for (let i = 0; i < ids.length; i++) {
        for (let j = i + 1; j < ids.length; j++) {
          links.push({
            source: ids[i],
            target: ids[j],
            strength: getLinkStrength(finding.severity, 'Shared Lang'),
            label: 'Shared Lang',
          })
        }
      }
    }
  }

  // Fallback to default nodes if empty (ensures graph always has content)
  if (nodes.size === 0) {
    addNode('police')
    addNode('social_services')
    addNode('expert')
    addNode('court')
  }

  return {
    nodes: Array.from(nodes.values()),
    links,
  }
}

/**
 * Compute summary statistics for a coordination graph.
 */
export function getGraphStats(graph: CoordinationGraph) {
  return {
    independenceViolations: graph.links.filter((l) => l.label === 'Violation').length,
    linguisticCollusions: graph.links.filter((l) => l.label === 'Shared Lang').length,
    nodesAnalyzed: graph.nodes.length,
  }
}
