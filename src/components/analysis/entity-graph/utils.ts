import type { EntityGraphNode } from './types'

export function getNodeColor(type: EntityGraphNode['type']): string {
  switch (type) {
    case 'professional':
      return '#D4A017'
    case 'person':
      return '#4A90E2'
    case 'organization':
      return '#F59E0B'
    case 'court':
      return '#EF4444'
    default:
      return '#6B7280'
  }
}

export function getNodeTypeAbbr(type: EntityGraphNode['type']): string {
  switch (type) {
    case 'professional':
      return 'PR'
    case 'person':
      return 'PE'
    case 'organization':
      return 'OR'
    case 'court':
      return 'CT'
    default:
      return '??'
  }
}

export function getEdgeColor(confidence: number): { stroke: string; opacity: number } {
  if (confidence >= 0.8) {
    return { stroke: '#D4A017', opacity: 0.7 }
  }
  if (confidence >= 0.5) {
    return { stroke: '#F59E0B', opacity: 0.5 }
  }
  return { stroke: '#6B7280', opacity: 0.3 }
}

export function getEntityTypeBadgeVariant(
  type: EntityGraphNode['type']
): 'info' | 'high' | 'medium' | 'critical' {
  switch (type) {
    case 'professional':
      return 'high'
    case 'person':
      return 'info'
    case 'organization':
      return 'medium'
    case 'court':
      return 'critical'
    default:
      return 'info'
  }
}

export function formatConfidence(confidence: number): string {
  return `${Math.round(confidence * 100)}%`
}
