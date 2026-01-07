'use client'

import { motion } from 'framer-motion'
import type { GraphEdge, ProcessedNode } from './types'
import { getEdgeColor } from './utils'

interface EntityGraphEdgesProps {
  edges: GraphEdge[]
  processedNodes: Map<string, ProcessedNode>
}

export function EntityGraphEdges({ edges, processedNodes }: EntityGraphEdgesProps) {
  return (
    <>
      {edges.map((edge, index) => {
        const edgeAttributes = edge.attributes as { confidence?: number; confidence_score?: number }
        const confidence = edgeAttributes.confidence ?? edgeAttributes.confidence_score ?? 0
        const sourceNode = processedNodes.get(edge.source)
        const targetNode = processedNodes.get(edge.target)

        if (!sourceNode || !targetNode) return null

        const edgeStyle = getEdgeColor(confidence)
        const isHighConfidence = confidence >= 0.8
        const isLowConfidence = confidence < 0.5
        const strokeWidth = isHighConfidence ? 3 : isLowConfidence ? 1 : 1.8
        const gradientId = isHighConfidence
          ? 'url(#entityLinkGradientHigh)'
          : isLowConfidence
            ? 'url(#entityLinkGradientLow)'
            : 'url(#entityLinkGradientMedium)'
        const edgeFilter = isHighConfidence ? 'url(#entityEdgeGlowHigh)' : undefined
        const confidencePercent = `${Math.round(confidence * 100)}%`
        const labelX = (sourceNode.x + targetNode.x) / 2
        const labelY = (sourceNode.y + targetNode.y) / 2

        return (
          <g key={`edge-${edge.key}-${index}`}>
            <motion.line
              initial={{ pathLength: 0, opacity: 0 }}
              animate={{
                pathLength: 1,
                opacity: isHighConfidence ? 0.85 : isLowConfidence ? 0.25 : edgeStyle.opacity,
              }}
              transition={{ duration: 1.2, delay: index * 0.03, ease: 'easeInOut' }}
              x1={sourceNode.x}
              y1={sourceNode.y}
              x2={targetNode.x}
              y2={targetNode.y}
              stroke={gradientId}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              filter={edgeFilter}
            />

            <g>
              <rect
                x={labelX - 18}
                y={labelY - 8}
                width={36}
                height={16}
                rx="4"
                fill="#1C1C1E"
                stroke={edgeStyle.stroke}
                strokeWidth="0.5"
                opacity="0.9"
              />
              <text
                x={labelX}
                y={labelY + 4}
                textAnchor="middle"
                fill={edgeStyle.stroke}
                fontSize="9"
                fontWeight="600"
                className="font-mono"
              >
                {confidencePercent}
              </text>
            </g>
          </g>
        )
      })}
    </>
  )
}
