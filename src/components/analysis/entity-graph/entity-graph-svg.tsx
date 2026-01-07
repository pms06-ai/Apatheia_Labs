'use client'

import type { EntityGraphNode, GraphEdge, ProcessedNode } from './types'
import { EntityGraphEdges } from './entity-graph-edges'
import { EntityGraphNodes } from './entity-graph-nodes'

interface EntityGraphSvgProps {
  width: number
  height: number
  edges: GraphEdge[]
  processedNodes: Map<string, ProcessedNode>
  selectedNodeId?: string | null
  onNodeClick?: (node: EntityGraphNode) => void
}

export function EntityGraphSVG({
  width,
  height,
  edges,
  processedNodes,
  selectedNodeId,
  onNodeClick,
}: EntityGraphSvgProps) {
  return (
    <svg width={width} height={height} className="mx-auto" viewBox={`0 0 ${width} ${height}`}>
      <defs>
        <linearGradient id="entityLinkGradientHigh" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4B5563" stopOpacity="0.2" />
          <stop offset="50%" stopColor="#D4A017" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#4B5563" stopOpacity="0.2" />
        </linearGradient>

        <linearGradient id="entityLinkGradientMedium" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4B5563" stopOpacity="0.15" />
          <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.4" />
          <stop offset="100%" stopColor="#4B5563" stopOpacity="0.15" />
        </linearGradient>

        <linearGradient id="entityLinkGradientLow" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4B5563" stopOpacity="0.1" />
          <stop offset="50%" stopColor="#6B7280" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#4B5563" stopOpacity="0.1" />
        </linearGradient>

        <filter id="entityEdgeGlowHigh" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="entityGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="entityCriticalGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="5" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        <filter id="entitySelectedGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="8" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <EntityGraphEdges edges={edges} processedNodes={processedNodes} />
      <EntityGraphNodes
        processedNodes={processedNodes}
        selectedNodeId={selectedNodeId}
        onNodeClick={onNodeClick}
      />
    </svg>
  )
}
