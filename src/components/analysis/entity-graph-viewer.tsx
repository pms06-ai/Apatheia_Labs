'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Card } from '@/components/ui/card'
import type { EntityGraphData, EntityGraphNode } from '@/lib/engines/entity-resolution'
import type { ProcessedNode } from './entity-graph/types'
import { EntityGraphSVG } from './entity-graph/entity-graph-svg'
import { EntityDetailPanel } from './entity-graph/entity-detail-panel'

interface EntityGraphViewerProps {
    graphData: EntityGraphData
    onNodeClick?: (node: EntityGraphNode) => void
    onCloseDetail?: () => void
    selectedNodeId?: string | null
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
    const processedNodes = new Map<string, ProcessedNode>()
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
                <EntityGraphSVG
                    width={width}
                    height={height}
                    edges={graphData.edges}
                    processedNodes={processedNodes}
                    selectedNodeId={selectedNodeId}
                    onNodeClick={onNodeClick}
                />
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
                    >
                        <EntityDetailPanel
                            selectedEntity={selectedEntity}
                            onCloseDetail={onCloseDetail}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </Card>
    )
}

export default EntityGraphViewer
