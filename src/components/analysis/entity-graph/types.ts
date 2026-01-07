import type { EntityGraphNode, EntityGraphEdge } from '@/lib/engines/entity-resolution'

export type { EntityGraphNode, EntityGraphEdge }

export interface GraphNode {
  key: string
  attributes: EntityGraphNode
}

export interface GraphEdge {
  key: string
  source: string
  target: string
  attributes: EntityGraphEdge
}

export interface ProcessedNode {
  x: number
  y: number
  attributes: EntityGraphNode
}
