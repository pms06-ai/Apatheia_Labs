'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { EntityGraphData, EntityGraphNode, EntityGraphEdge } from '@/lib/engines/entity-resolution'

interface EntityGraphViewerProps {
    graphData: EntityGraphData
    onNodeClick?: (node: EntityGraphNode) => void
    onCloseDetail?: () => void
    selectedNodeId?: string | null
}

/**
 * Get node color based on entity type
 */
function getNodeColor(type: EntityGraphNode['type']): string {
    switch (type) {
        case 'professional':
            return '#D4A017' // Bronze - matches expert in network-graph
        case 'person':
            return '#4A90E2' // Blue
        case 'organization':
            return '#F59E0B' // Amber - matches social_services
        case 'court':
            return '#EF4444' // Red - matches police
        default:
            return '#6B7280' // Gray
    }
}

/**
 * Get node type abbreviation for display
 */
function getNodeTypeAbbr(type: EntityGraphNode['type']): string {
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

/**
 * Get edge color based on confidence
 */
function getEdgeColor(confidence: number): { stroke: string; opacity: number } {
    if (confidence >= 0.8) {
        return { stroke: '#D4A017', opacity: 0.7 } // Bronze for high confidence
    }
    if (confidence >= 0.5) {
        return { stroke: '#F59E0B', opacity: 0.5 } // Amber for medium
    }
    return { stroke: '#6B7280', opacity: 0.3 } // Gray for low
}

/**
 * Get badge variant for entity type
 */
function getEntityTypeBadgeVariant(type: EntityGraphNode['type']): 'info' | 'high' | 'medium' | 'critical' {
    switch (type) {
        case 'professional':
            return 'high' // Bronze/amber
        case 'person':
            return 'info' // Blue
        case 'organization':
            return 'medium' // Yellow
        case 'court':
            return 'critical' // Red
        default:
            return 'info'
    }
}

/**
 * Format confidence score as percentage
 */
function formatConfidence(confidence: number): string {
    return `${Math.round(confidence * 100)}%`
}

/**
 * EntityGraphViewer Component
 *
 * Renders an interactive entity graph showing cross-document connections.
 * Displays entity nodes with type-based colors and linkage edges with confidence scores.
 * Follows the visual pattern of NetworkGraph component.
 */
export function EntityGraphViewer({
    graphData,
    onNodeClick,
    onCloseDetail,
    selectedNodeId
}: EntityGraphViewerProps) {
    // Graph dimensions
    const width = 700
    const height = 500
    const centerX = width / 2
    const centerY = height / 2

    // Calculate node positions using circular layout
    // Separate by type for better visual grouping
    const nodesByType = new Map<string, typeof graphData.nodes>()
    for (const node of graphData.nodes) {
        const type = node.attributes.type
        if (!nodesByType.has(type)) {
            nodesByType.set(type, [])
        }
        nodesByType.get(type)!.push(node)
    }

    // Calculate positions for each node
    const processedNodes = new Map<string, { x: number; y: number; attributes: EntityGraphNode }>()
    let globalIndex = 0
    const totalNodes = graphData.nodes.length
    const baseRadius = Math.min(width, height) / 2 - 80

    // Place nodes in a circular layout
    for (const node of graphData.nodes) {
        const angle = (globalIndex / Math.max(totalNodes, 1)) * 2 * Math.PI - Math.PI / 2
        // Vary radius slightly based on node type for visual separation
        const typeOffset = node.attributes.type === 'professional' ? 0 :
            node.attributes.type === 'person' ? -20 :
                node.attributes.type === 'organization' ? 20 : -10
        const radius = baseRadius + typeOffset

        processedNodes.set(node.key, {
            x: centerX + radius * Math.cos(angle),
            y: centerY + radius * Math.sin(angle),
            attributes: node.attributes
        })
        globalIndex++
    }

    // Find selected entity for detail panel
    const selectedEntity = selectedNodeId
        ? graphData.nodes.find(n => n.attributes.id === selectedNodeId)?.attributes
        : null

    // Handle empty graph
    if (graphData.nodes.length === 0) {
        return (
            <Card className="overflow-hidden bg-[#0f0f10] border-charcoal-700 p-0 relative shadow-inner">
                <div className="absolute inset-0 bg-gradient-to-br from-bronze-900/10 via-transparent to-charcoal-900/50 pointer-events-none" />
                <div className="relative flex items-center justify-center h-[400px]">
                    <div className="text-charcoal-400 text-sm font-mono">
                        No entities to display. Run entity resolution first.
                    </div>
                </div>
            </Card>
        )
    }

    return (
        <Card className="overflow-hidden bg-[#0f0f10] border-charcoal-700 p-0 relative shadow-inner">
            {/* Ambient Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-br from-bronze-900/10 via-transparent to-charcoal-900/50 pointer-events-none" />

            <div className="relative w-full overflow-x-auto">
                <svg
                    width={width}
                    height={height}
                    className="mx-auto"
                    viewBox={`0 0 ${width} ${height}`}
                >
                    <defs>
                        {/* Gradient for high confidence links */}
                        <linearGradient id="entityLinkGradientHigh" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4B5563" stopOpacity="0.2" />
                            <stop offset="50%" stopColor="#D4A017" stopOpacity="0.6" />
                            <stop offset="100%" stopColor="#4B5563" stopOpacity="0.2" />
                        </linearGradient>

                        {/* Gradient for medium confidence links */}
                        <linearGradient id="entityLinkGradientMedium" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4B5563" stopOpacity="0.15" />
                            <stop offset="50%" stopColor="#F59E0B" stopOpacity="0.4" />
                            <stop offset="100%" stopColor="#4B5563" stopOpacity="0.15" />
                        </linearGradient>

                        {/* Gradient for low confidence links */}
                        <linearGradient id="entityLinkGradientLow" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#4B5563" stopOpacity="0.1" />
                            <stop offset="50%" stopColor="#6B7280" stopOpacity="0.3" />
                            <stop offset="100%" stopColor="#4B5563" stopOpacity="0.1" />
                        </linearGradient>

                        {/* Glow filter for high confidence edges */}
                        <filter id="entityEdgeGlowHigh" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="2" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Glow filter for nodes */}
                        <filter id="entityGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Critical glow for professional/court nodes */}
                        <filter id="entityCriticalGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="5" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>

                        {/* Selected node glow */}
                        <filter id="entitySelectedGlow" x="-50%" y="-50%" width="200%" height="200%">
                            <feGaussianBlur stdDeviation="8" result="coloredBlur" />
                            <feMerge>
                                <feMergeNode in="coloredBlur" />
                                <feMergeNode in="SourceGraphic" />
                            </feMerge>
                        </filter>
                    </defs>

                    {/* Linkage Edges */}
                    {graphData.edges.map((edge, i) => {
                        const sourceNode = processedNodes.get(edge.source)
                        const targetNode = processedNodes.get(edge.target)

                        if (!sourceNode || !targetNode) return null

                        const confidence = edge.attributes.confidence
                        const edgeStyle = getEdgeColor(confidence)
                        const isHighConfidence = confidence >= 0.8
                        const isLowConfidence = confidence < 0.5

                        // Calculate edge width based on confidence - more differentiation
                        // High confidence (>0.8): thick and prominent
                        // Medium confidence (0.5-0.8): moderate
                        // Low confidence (<0.5): thin and subtle
                        const strokeWidth = isHighConfidence ? 3 :
                            isLowConfidence ? 1 : 1.8

                        // Get gradient based on confidence
                        const gradientId = isHighConfidence ? 'url(#entityLinkGradientHigh)' :
                            isLowConfidence ? 'url(#entityLinkGradientLow)' : 'url(#entityLinkGradientMedium)'

                        // Apply glow filter only to high confidence edges for brightness
                        const edgeFilter = isHighConfidence ? 'url(#entityEdgeGlowHigh)' : undefined

                        // Format confidence as percentage
                        const confidencePercent = `${Math.round(confidence * 100)}%`

                        // Calculate label position (midpoint)
                        const labelX = (sourceNode.x + targetNode.x) / 2
                        const labelY = (sourceNode.y + targetNode.y) / 2

                        return (
                            <g key={`edge-${edge.key}-${i}`}>
                                {/* Edge line with confidence-based styling */}
                                <motion.line
                                    initial={{ pathLength: 0, opacity: 0 }}
                                    animate={{
                                        pathLength: 1,
                                        opacity: isHighConfidence ? 0.85 : isLowConfidence ? 0.25 : edgeStyle.opacity
                                    }}
                                    transition={{ duration: 1.2, delay: i * 0.03, ease: "easeInOut" }}
                                    x1={sourceNode.x}
                                    y1={sourceNode.y}
                                    x2={targetNode.x}
                                    y2={targetNode.y}
                                    stroke={gradientId}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    filter={edgeFilter}
                                />

                                {/* Confidence label on edge */}
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

                    {/* Entity Nodes */}
                    {Array.from(processedNodes.entries()).map(([key, node], i) => {
                        const nodeColor = getNodeColor(node.attributes.type)
                        const isProfessional = node.attributes.type === 'professional'
                        const isCourt = node.attributes.type === 'court'
                        const isSelected = selectedNodeId === key
                        const hasRole = !!node.attributes.role

                        // Node size varies by mention count
                        const baseSize = 18
                        const sizeBoost = Math.min(node.attributes.mentionCount * 2, 8)
                        const nodeRadius = baseSize + sizeBoost

                        return (
                            <motion.g
                                key={key}
                                initial={{ scale: 0, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{
                                    delay: 0.15 + i * 0.06,
                                    type: 'spring',
                                    stiffness: 200,
                                    damping: 20
                                }}
                                className="cursor-pointer hover:opacity-90 transition-opacity"
                                onClick={() => onNodeClick?.(node.attributes)}
                            >
                                {/* Outer Ring / Glow */}
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={nodeRadius + 4}
                                    fill="transparent"
                                    stroke={nodeColor}
                                    strokeWidth={isSelected ? "2.5" : "1.5"}
                                    opacity={isSelected ? 0.6 : 0.3}
                                    filter={
                                        isSelected ? "url(#entitySelectedGlow)" :
                                            (isProfessional || isCourt) ? "url(#entityCriticalGlow)" : "url(#entityGlow)"
                                    }
                                >
                                    {/* Pulse Animation for professionals and courts */}
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
                                                values={isSelected ? "0.6;0.3;0.6" : "0.3;0.1;0.3"}
                                                dur="3s"
                                                repeatCount="indefinite"
                                            />
                                        </>
                                    )}
                                </circle>

                                {/* Main Node Body */}
                                <circle
                                    cx={node.x}
                                    cy={node.y}
                                    r={nodeRadius}
                                    className="transition-colors duration-300"
                                    fill={isSelected ? nodeColor : "#1C1C1E"}
                                    stroke={nodeColor}
                                    strokeWidth={isSelected ? "3" : "2"}
                                />

                                {/* Icon/Type Abbreviation inside node */}
                                <text
                                    x={node.x}
                                    y={node.y + 4}
                                    textAnchor="middle"
                                    fill={isSelected ? "#1C1C1E" : nodeColor}
                                    className="text-[10px] font-bold uppercase pointer-events-none font-mono"
                                >
                                    {getNodeTypeAbbr(node.attributes.type)}
                                </text>

                                {/* Entity Name Label below node */}
                                <text
                                    x={node.x}
                                    y={node.y + nodeRadius + 16}
                                    textAnchor="middle"
                                    fill="#E5E5E5"
                                    className="text-xs font-medium font-sans tracking-wide"
                                    style={{ textShadow: '0px 2px 4px rgba(0,0,0,0.8)' }}
                                >
                                    {/* Truncate long names */}
                                    {node.attributes.name.length > 18
                                        ? `${node.attributes.name.slice(0, 16)}...`
                                        : node.attributes.name
                                    }
                                </text>

                                {/* Role badge (if applicable) */}
                                {hasRole && (
                                    <g>
                                        <rect
                                            x={node.x - (node.attributes.role!.length * 2.5)}
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

                                {/* Mention count badge */}
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
                </svg>
            </div>

            {/* Legend - Floating Bottom */}
            <div className="absolute bottom-4 left-0 right-0 flex flex-col items-center gap-2 px-4">
                {/* Edge Confidence Legend */}
                <div className="flex items-center gap-3 text-[10px] text-charcoal-400 font-mono tracking-wider uppercase">
                    <span className="text-charcoal-500">Linkage Confidence:</span>
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-charcoal-700/50 backdrop-blur-sm">
                        <div className="w-6 h-[3px] rounded-full bg-bronze-500 shadow-[0_0_6px_rgba(212,160,23,0.6)]"></div>
                        <span>High (&gt;80%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-charcoal-700/50 backdrop-blur-sm">
                        <div className="w-6 h-[2px] rounded-full bg-status-high opacity-60"></div>
                        <span>Medium</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 px-2.5 py-1 rounded-full border border-charcoal-700/50 backdrop-blur-sm">
                        <div className="w-6 h-[1px] rounded-full bg-charcoal-500 opacity-40"></div>
                        <span>Low (&lt;50%)</span>
                    </div>
                </div>
                {/* Entity Type Legend */}
                <div className="flex items-center gap-4 text-[10px] text-charcoal-400 font-mono tracking-wider uppercase">
                    <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-charcoal-700/50 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-bronze-500 shadow-[0_0_8px_rgba(212,160,23,0.5)]"></div>
                        Professional
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-charcoal-700/50 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-[#4A90E2] shadow-[0_0_8px_rgba(74,144,226,0.5)]"></div>
                        Person
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-charcoal-700/50 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-status-high shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        Organization
                    </div>
                    <div className="flex items-center gap-1.5 bg-black/40 px-3 py-1 rounded-full border border-charcoal-700/50 backdrop-blur-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-status-critical shadow-[0_0_8px_rgba(239,68,68,0.5)]"></div>
                        Court
                    </div>
                </div>
            </div>

            {/* Graph Statistics */}
            <div className="absolute top-4 right-4 flex gap-2 text-[10px] text-charcoal-500 font-mono">
                <span>{graphData.metadata.nodeCount} entities</span>
                <span>|</span>
                <span>{graphData.metadata.edgeCount} linkages</span>
            </div>

            {/* Entity Detail Panel */}
            <AnimatePresence>
                {selectedEntity && (
                    <motion.div
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="absolute top-4 left-4 w-72 bg-[#1C1C1E]/95 border border-charcoal-700 rounded-lg shadow-xl backdrop-blur-sm overflow-hidden"
                    >
                        {/* Panel Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-charcoal-700/50 bg-charcoal-900/50">
                            <div className="flex items-center gap-2">
                                <div
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: getNodeColor(selectedEntity.type) }}
                                />
                                <span className="font-medium text-charcoal-100 text-sm truncate max-w-[180px]">
                                    {selectedEntity.name}
                                </span>
                            </div>
                            <button
                                onClick={() => onCloseDetail?.()}
                                className="text-charcoal-400 hover:text-charcoal-200 transition-colors p-1 hover:bg-charcoal-700/50 rounded"
                                aria-label="Close detail panel"
                            >
                                <svg
                                    className="w-4 h-4"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M6 18L18 6M6 6l12 12"
                                    />
                                </svg>
                            </button>
                        </div>

                        {/* Panel Content */}
                        <div className="p-4 space-y-4">
                            {/* Entity Type & Confidence */}
                            <div className="flex items-center justify-between">
                                <Badge variant={getEntityTypeBadgeVariant(selectedEntity.type)}>
                                    {selectedEntity.type}
                                </Badge>
                                <div className="flex items-center gap-1.5 text-xs text-charcoal-400">
                                    <span>Confidence:</span>
                                    <span className={
                                        selectedEntity.confidence >= 0.8
                                            ? 'text-status-success font-semibold'
                                            : selectedEntity.confidence >= 0.5
                                                ? 'text-status-high font-semibold'
                                                : 'text-charcoal-300'
                                    }>
                                        {formatConfidence(selectedEntity.confidence)}
                                    </span>
                                </div>
                            </div>

                            {/* Role (if applicable) */}
                            {selectedEntity.role && (
                                <div className="space-y-1">
                                    <label className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wider">
                                        Role
                                    </label>
                                    <div className="text-sm text-charcoal-200">
                                        {selectedEntity.role}
                                    </div>
                                </div>
                            )}

                            {/* Aliases Section */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wider flex items-center gap-2">
                                    Known Aliases
                                    <span className="text-charcoal-600">({selectedEntity.aliases.length})</span>
                                </label>
                                {selectedEntity.aliases.length > 0 ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {selectedEntity.aliases.map((alias, index) => (
                                            <span
                                                key={`alias-${index}`}
                                                className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-charcoal-800 text-charcoal-300 border border-charcoal-700/50"
                                            >
                                                {alias}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-charcoal-500 italic">
                                        No aliases found
                                    </div>
                                )}
                            </div>

                            {/* Document Mentions Section */}
                            <div className="space-y-2">
                                <label className="text-[10px] text-charcoal-500 font-mono uppercase tracking-wider flex items-center gap-2">
                                    Document Mentions
                                    <span className="text-charcoal-600">({selectedEntity.documentIds.length})</span>
                                </label>
                                {selectedEntity.documentIds.length > 0 ? (
                                    <div className="space-y-1 max-h-24 overflow-y-auto pr-1 custom-scrollbar">
                                        {selectedEntity.documentIds.map((docId, index) => (
                                            <div
                                                key={`doc-${index}`}
                                                className="flex items-center gap-2 px-2 py-1.5 rounded text-xs bg-charcoal-800/50 border border-charcoal-700/30 hover:border-charcoal-600/50 transition-colors"
                                            >
                                                <svg
                                                    className="w-3 h-3 text-charcoal-500 flex-shrink-0"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    viewBox="0 0 24 24"
                                                >
                                                    <path
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                        strokeWidth={2}
                                                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                    />
                                                </svg>
                                                <span className="text-charcoal-300 truncate font-mono">
                                                    {docId.length > 20 ? `${docId.slice(0, 20)}...` : docId}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-charcoal-500 italic">
                                        No document mentions
                                    </div>
                                )}
                            </div>

                            {/* Mention Count Summary */}
                            <div className="pt-2 border-t border-charcoal-700/50">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-charcoal-500">Total Mentions</span>
                                    <span className="font-semibold text-charcoal-200">
                                        {selectedEntity.mentionCount}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    )
}

export default EntityGraphViewer
