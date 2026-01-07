'use client'

import { motion } from 'framer-motion'
import type { EntityGraphNode, ProcessedNode } from './types'
import { getNodeColor, getNodeTypeAbbr } from './utils'

interface EntityGraphNodesProps {
  processedNodes: Map<string, ProcessedNode>
  selectedNodeId?: string | null
  onNodeClick?: (node: EntityGraphNode) => void
}

export function EntityGraphNodes({
  processedNodes,
  selectedNodeId,
  onNodeClick,
}: EntityGraphNodesProps) {
  return (
    <>
      {Array.from(processedNodes.entries()).map(([key, node], index) => {
        const nodeColor = getNodeColor(node.attributes.type)
        const isProfessional = node.attributes.type === 'professional'
        const isCourt = node.attributes.type === 'court'
        const isSelected = selectedNodeId === key
        const hasRole = !!node.attributes.role
        const baseSize = 18
        const sizeBoost = Math.min(node.attributes.mentionCount * 2, 8)
        const nodeRadius = baseSize + sizeBoost

        return (
          <motion.g
            key={key}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{
              delay: 0.15 + index * 0.06,
              type: 'spring',
              stiffness: 200,
              damping: 20,
            }}
            className="cursor-pointer hover:opacity-90 transition-opacity"
            onClick={() => onNodeClick?.(node.attributes)}
          >
            <circle
              cx={node.x}
              cy={node.y}
              r={nodeRadius + 4}
              fill="transparent"
              stroke={nodeColor}
              strokeWidth={isSelected ? '2.5' : '1.5'}
              opacity={isSelected ? 0.6 : 0.3}
              filter={
                isSelected
                  ? 'url(#entitySelectedGlow)'
                  : isProfessional || isCourt
                    ? 'url(#entityCriticalGlow)'
                    : 'url(#entityGlow)'
              }
            >
              {(isProfessional || isCourt || isSelected) && (
                <>
                  <animate
                    attributeName="r"
                    values={`${nodeRadius + 4};${nodeRadius + 8};${nodeRadius + 4}`}
                    dur="3s"
                    repeatCount="indefinite"
                  />
                  <animate
                    attributeName="opacity"
                    values={isSelected ? '0.6;0.3;0.6' : '0.3;0.1;0.3'}
                    dur="3s"
                    repeatCount="indefinite"
                  />
                </>
              )}
            </circle>

            <circle
              cx={node.x}
              cy={node.y}
              r={nodeRadius}
              className="transition-colors duration-300"
              fill={isSelected ? nodeColor : '#1C1C1E'}
              stroke={nodeColor}
              strokeWidth={isSelected ? '3' : '2'}
            />

            <text
              x={node.x}
              y={node.y + 4}
              textAnchor="middle"
              fill={isSelected ? '#1C1C1E' : nodeColor}
              className="text-[10px] font-bold uppercase pointer-events-none font-mono"
            >
              {getNodeTypeAbbr(node.attributes.type)}
            </text>

            <text
              x={node.x}
              y={node.y + nodeRadius + 16}
              textAnchor="middle"
              fill="#E5E5E5"
              className="text-xs font-medium font-sans tracking-wide"
              style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
            >
              {node.attributes.name.length > 18
                ? `${node.attributes.name.slice(0, 16)}...`
                : node.attributes.name}
            </text>

            {hasRole && (
              <g>
                <rect
                  x={node.x - node.attributes.role!.length * 2.5}
                  y={node.y + nodeRadius + 22}
                  width={node.attributes.role!.length * 5 + 8}
                  height={12}
                  rx="3"
                  fill="#1C1C1E"
                  stroke={nodeColor}
                  strokeWidth="0.5"
                  opacity="0.8"
                />
                <text
                  x={node.x}
                  y={node.y + nodeRadius + 31}
                  textAnchor="middle"
                  fill={nodeColor}
                  fontSize="8"
                  fontWeight="500"
                  className="font-mono uppercase tracking-wider"
                >
                  {node.attributes.role}
                </text>
              </g>
            )}

            {node.attributes.mentionCount > 1 && (
              <g>
                <circle
                  cx={node.x + nodeRadius - 4}
                  cy={node.y - nodeRadius + 4}
                  r={8}
                  fill={nodeColor}
                  stroke="#1C1C1E"
                  strokeWidth="1.5"
                />
                <text
                  x={node.x + nodeRadius - 4}
                  y={node.y - nodeRadius + 7}
                  textAnchor="middle"
                  fill="#1C1C1E"
                  fontSize="8"
                  fontWeight="700"
                  className="font-mono"
                >
                  {node.attributes.mentionCount}
                </text>
              </g>
            )}
          </motion.g>
        )
      })}
    </>
  )
}
