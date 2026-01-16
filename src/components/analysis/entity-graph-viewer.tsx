'use client'

import { useState, useCallback, useMemo, memo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Filter, Network, List, ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { EntityRelationshipGraph } from './entity-graph/entity-relationship-graph'
import { EntityDetailPanel } from './entity-graph/entity-detail-panel'
import type { EntityGraphData, EntityGraphNode } from '@/lib/engines/entity-resolution'
import type { EntityEngineResult, NativeResolvedEntity, NativeEntityType } from '@/CONTRACT'
import type { ProcessedNode } from './entity-graph/types'
import { EntityGraphSVG } from './entity-graph/entity-graph-svg'

// ============================================
// PROPS INTERFACES
// ============================================

interface EntityGraphViewerProps {
  graphData?: EntityGraphData
  onNodeClick?: (node: EntityGraphNode) => void
  onCloseDetail?: () => void
  selectedNodeId?: string | null
}

interface NativeEntityGraphViewerProps {
  result: EntityEngineResult
  width?: number
  height?: number
}

// ============================================
// LEGACY COMPONENT (TypeScript engine)
// ============================================

/**
 * EntityGraphViewer Component (Legacy - TypeScript engine)
 *
 * Renders an interactive entity graph showing cross-document connections.
 * Displays entity nodes with type-based colors and linkage edges with confidence scores.
 * Follows the visual pattern of NetworkGraph component.
 */
export function EntityGraphViewer({
  graphData,
  onNodeClick,
  onCloseDetail,
  selectedNodeId,
}: EntityGraphViewerProps) {
  // Handle empty/undefined graphData
  if (!graphData || graphData.nodes.length === 0) {
    return (
      <Card className="relative overflow-hidden border-charcoal-700 bg-bg-primary p-0 shadow-inner">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bronze-900/10 via-transparent to-charcoal-900/50" />
        <div className="relative flex h-[400px] items-center justify-center">
          <div className="font-mono text-sm text-charcoal-400">
            No entities to display. Run entity resolution first.
          </div>
        </div>
      </Card>
    )
  }

  // Graph dimensions
  const width = 700
  const height = 500
  const centerX = width / 2
  const centerY = height / 2

  // Calculate node positions using circular layout
  const processedNodes = new Map<string, ProcessedNode>()
  let globalIndex = 0
  const totalNodes = graphData.nodes.length
  const baseRadius = Math.min(width, height) / 2 - 80

  // Place nodes in a circular layout
  for (const node of graphData.nodes) {
    const angle = (globalIndex / Math.max(totalNodes, 1)) * 2 * Math.PI - Math.PI / 2
    const typeOffset =
      node.attributes.type === 'professional'
        ? 0
        : node.attributes.type === 'person'
          ? -20
          : node.attributes.type === 'organization'
            ? 20
            : -10
    const radius = baseRadius + typeOffset

    processedNodes.set(node.key, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
      attributes: node.attributes,
    })
    globalIndex++
  }

  // Find selected entity for detail panel
  const selectedEntity = selectedNodeId
    ? graphData.nodes.find(n => n.attributes.id === selectedNodeId)?.attributes
    : null

  return (
    <Card className="relative overflow-hidden border-charcoal-700 bg-bg-primary p-0 shadow-inner">
      {/* Ambient Background Gradient */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bronze-900/10 via-transparent to-charcoal-900/50" />

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
        <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider text-charcoal-400">
          <span className="text-charcoal-500">Linkage Confidence:</span>
          <div className="flex items-center gap-1.5 rounded-full border border-charcoal-700/50 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
            <div className="h-[3px] w-6 rounded-full bg-bronze-500 shadow-[0_0_6px_rgba(212,160,23,0.6)]" />
            <span>High (&gt;80%)</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-charcoal-700/50 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
            <div className="h-[2px] w-6 rounded-full bg-status-high opacity-60" />
            <span>Medium</span>
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-charcoal-700/50 bg-black/40 px-2.5 py-1 backdrop-blur-sm">
            <div className="h-[1px] w-6 rounded-full bg-charcoal-500 opacity-40" />
            <span>Low (&lt;50%)</span>
          </div>
        </div>
        {/* Entity Type Legend */}
        <div className="flex items-center gap-4 font-mono text-[10px] uppercase tracking-wider text-charcoal-400">
          <div className="flex items-center gap-1.5 rounded-full border border-charcoal-700/50 bg-black/40 px-3 py-1 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-bronze-500 shadow-[0_0_8px_rgba(212,160,23,0.5)]" />
            Professional
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-charcoal-700/50 bg-black/40 px-3 py-1 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-status-info shadow-[0_0_8px_rgba(74,144,226,0.5)]" />
            Person
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-charcoal-700/50 bg-black/40 px-3 py-1 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-status-high shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            Organization
          </div>
          <div className="flex items-center gap-1.5 rounded-full border border-charcoal-700/50 bg-black/40 px-3 py-1 backdrop-blur-sm">
            <div className="h-1.5 w-1.5 rounded-full bg-status-critical shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            Court
          </div>
        </div>
      </div>

      {/* Graph Statistics */}
      <div className="absolute right-4 top-4 flex gap-2 font-mono text-[10px] text-charcoal-500">
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
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <EntityDetailPanel selectedEntity={selectedEntity} onCloseDetail={onCloseDetail} />
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
  )
}

// ============================================
// NATIVE COMPONENT (Rust backend)
// ============================================

/**
 * NativeEntityGraphViewer Component (Native - Rust backend)
 *
 * Uses EntityEngineResult from runEntityEngine command.
 * Provides force-directed graph visualization with entity relationships.
 */
export function NativeEntityGraphViewer({
  result,
  width = 800,
  height = 600,
}: NativeEntityGraphViewerProps) {
  const [selectedEntity, setSelectedEntity] = useState<NativeResolvedEntity | null>(null)
  const [viewMode, setViewMode] = useState<'graph' | 'list'>('graph')
  const [filterTypes, setFilterTypes] = useState<NativeEntityType[]>([])
  const [showFilterMenu, setShowFilterMenu] = useState(false)

  // Get available entity types from results
  const availableTypes = useMemo(() => {
    if (!result.success || !result.analysis) return []
    const types = new Set(result.analysis.entities.map(e => e.entity_type))
    return Array.from(types) as NativeEntityType[]
  }, [result])

  // Handle entity selection
  const handleNodeSelect = useCallback((entity: NativeResolvedEntity | null) => {
    setSelectedEntity(entity)
  }, [])

  // Handle filter toggle
  const toggleFilter = useCallback((type: NativeEntityType) => {
    setFilterTypes(prev => {
      if (prev.includes(type)) {
        return prev.filter(t => t !== type)
      } else {
        return [...prev, type]
      }
    })
  }, [])

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilterTypes([])
  }, [])

  if (!result.success || !result.analysis) {
    return (
      <Card className="relative overflow-hidden border-charcoal-700 bg-bg-primary p-0 shadow-inner">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bronze-900/10 via-transparent to-charcoal-900/50" />
        <div className="relative flex h-[400px] items-center justify-center">
          <div className="font-mono text-sm text-charcoal-400">
            {result.error || 'No entity data available. Run entity engine first.'}
          </div>
        </div>
      </Card>
    )
  }

  const { entities, summary, is_mock } = result.analysis

  if (entities.length === 0) {
    return (
      <Card className="relative overflow-hidden border-charcoal-700 bg-bg-primary p-0 shadow-inner">
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-bronze-900/10 via-transparent to-charcoal-900/50" />
        <div className="relative flex h-[400px] items-center justify-center">
          <div className="font-mono text-sm text-charcoal-400">
            No entities found in the analyzed documents.
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* Mock Mode Indicator */}
      {is_mock && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2 text-center text-sm text-amber-400">
          Mock data - configure AI provider for live analysis
        </div>
      )}

      {/* Controls Bar */}
      <div className="flex items-center justify-between gap-4">
        {/* View Toggle */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setViewMode('graph')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              viewMode === 'graph'
                ? 'bg-bronze-600/20 text-bronze-500'
                : 'text-charcoal-400 hover:text-charcoal-200'
            }`}
          >
            <Network className="h-4 w-4" />
            Graph
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors ${
              viewMode === 'list'
                ? 'bg-bronze-600/20 text-bronze-500'
                : 'text-charcoal-400 hover:text-charcoal-200'
            }`}
          >
            <List className="h-4 w-4" />
            List
          </button>
        </div>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition-colors ${
              filterTypes.length > 0
                ? 'border-bronze-500/50 bg-bronze-600/20 text-bronze-500'
                : 'border-charcoal-600 text-charcoal-400 hover:border-charcoal-500 hover:text-charcoal-200'
            }`}
          >
            <Filter className="h-4 w-4" />
            <span>Filter{filterTypes.length > 0 ? ` (${filterTypes.length})` : ''}</span>
            <ChevronDown className="h-4 w-4" />
          </button>

          <AnimatePresence>
            {showFilterMenu && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="absolute right-0 top-full z-20 mt-2 w-48 rounded-lg border border-charcoal-600 bg-charcoal-800 p-2 shadow-xl"
              >
                <div className="mb-2 flex items-center justify-between border-b border-charcoal-700 pb-2">
                  <span className="font-mono text-xs uppercase text-charcoal-400">
                    Entity Types
                  </span>
                  {filterTypes.length > 0 && (
                    <button
                      onClick={clearFilters}
                      className="text-xs text-bronze-500 hover:text-bronze-400"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="space-y-1">
                  {availableTypes.map(type => {
                    const count = entities.filter(e => e.entity_type === type).length
                    const isActive = filterTypes.includes(type)

                    return (
                      <button
                        key={type}
                        onClick={() => toggleFilter(type)}
                        className={`flex w-full items-center justify-between rounded px-2 py-1.5 text-sm transition-colors ${
                          isActive
                            ? 'bg-bronze-600/20 text-bronze-500'
                            : 'text-charcoal-300 hover:bg-charcoal-700'
                        }`}
                      >
                        <span className="capitalize">{type.replace(/_/g, ' ')}</span>
                        <Badge variant={isActive ? 'default' : 'outline'} className="ml-2 text-xs">
                          {count}
                        </Badge>
                      </button>
                    )
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Stats */}
        <div className="flex gap-4 font-mono text-xs text-charcoal-500">
          <span>{summary.total_entities} entities</span>
          <span>{summary.relationships_found} relationships</span>
          <span>{summary.aliases_resolved} aliases</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative flex-1 overflow-hidden">
        {viewMode === 'graph' ? (
          <div className="flex h-full gap-4">
            {/* Graph */}
            <div className={`flex-1 ${selectedEntity ? 'w-2/3' : 'w-full'}`}>
              <EntityRelationshipGraph
                result={result}
                width={selectedEntity ? width * 0.65 : width}
                height={height}
                selectedNodeId={selectedEntity?.id}
                onNodeSelect={handleNodeSelect}
                filterTypes={filterTypes.length > 0 ? filterTypes : undefined}
              />
            </div>

            {/* Detail Panel */}
            <AnimatePresence>
              {selectedEntity && (
                <motion.div
                  initial={{ opacity: 0, x: 20, width: 0 }}
                  animate={{ opacity: 1, x: 0, width: 'auto' }}
                  exit={{ opacity: 0, x: 20, width: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="w-80 shrink-0"
                >
                  <NativeEntityDetailPanel
                    entity={selectedEntity}
                    onClose={() => setSelectedEntity(null)}
                  />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <EntityListView
            entities={entities}
            filterTypes={filterTypes}
            selectedEntity={selectedEntity}
            onEntitySelect={handleNodeSelect}
          />
        )}
      </div>
    </div>
  )
}

// ============================================
// ENTITY LIST VIEW
// ============================================

interface EntityListViewProps {
  entities: NativeResolvedEntity[]
  filterTypes: NativeEntityType[]
  selectedEntity: NativeResolvedEntity | null
  onEntitySelect: (entity: NativeResolvedEntity | null) => void
}

function EntityListView({
  entities,
  filterTypes,
  selectedEntity,
  onEntitySelect,
}: EntityListViewProps) {
  const filteredEntities = useMemo(() => {
    let result = entities

    if (filterTypes.length > 0) {
      result = result.filter(e => filterTypes.includes(e.entity_type))
    }

    // Sort by mention count
    return result.sort((a, b) => b.mention_count - a.mention_count)
  }, [entities, filterTypes])

  return (
    <div className="scrollbar-thin scrollbar-thumb-charcoal-600 h-full overflow-y-auto">
      <div className="space-y-2 p-4">
        {filteredEntities.map(entity => (
          <EntityListItem
            key={entity.id}
            entity={entity}
            isSelected={selectedEntity?.id === entity.id}
            onClick={() => onEntitySelect(selectedEntity?.id === entity.id ? null : entity)}
          />
        ))}
      </div>
    </div>
  )
}

interface EntityListItemProps {
  entity: NativeResolvedEntity
  isSelected: boolean
  onClick: () => void
}

/**
 * Entity list item component - memoized to prevent re-renders in large entity lists
 */
const EntityListItem = memo(function EntityListItem({
  entity,
  isSelected,
  onClick,
}: EntityListItemProps) {
  return (
    <div
      onClick={onClick}
      className={`cursor-pointer rounded-lg border p-3 transition-all ${
        isSelected
          ? 'border-bronze-500/50 bg-bronze-900/20'
          : 'border-charcoal-700 bg-charcoal-800/60 hover:border-charcoal-600'
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-medium text-charcoal-100">{entity.canonical_name}</span>
            <Badge variant="outline" className="text-xs capitalize">
              {entity.entity_type.replace(/_/g, ' ')}
            </Badge>
          </div>
          {entity.description && (
            <p className="mt-1 line-clamp-1 text-sm text-charcoal-400">{entity.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-charcoal-500">
            <span>{entity.mention_count} mentions</span>
            {entity.aliases.length > 0 && <span>{entity.aliases.length} aliases</span>}
            {entity.relationships.length > 0 && (
              <span>{entity.relationships.length} relationships</span>
            )}
          </div>
        </div>
      </div>
    </div>
  )
})
EntityListItem.displayName = 'EntityListItem'

// ============================================
// NATIVE ENTITY DETAIL PANEL
// ============================================

interface NativeEntityDetailPanelProps {
  entity: NativeResolvedEntity
  onClose: () => void
}

function NativeEntityDetailPanel({ entity, onClose }: NativeEntityDetailPanelProps) {
  return (
    <Card className="h-full overflow-hidden border-charcoal-700 bg-charcoal-800/95 backdrop-blur-sm">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-charcoal-700/50 bg-charcoal-900/50 px-4 py-3">
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-medium text-charcoal-100">{entity.canonical_name}</h3>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="outline" className="text-xs capitalize">
              {entity.entity_type.replace(/_/g, ' ')}
            </Badge>
            <Badge variant="outline" className="text-xs capitalize">
              {entity.role.replace(/_/g, ' ')}
            </Badge>
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-charcoal-400 transition-colors hover:bg-charcoal-700/50 hover:text-charcoal-200"
          aria-label="Close detail panel"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>

      {/* Content */}
      <div className="scrollbar-thin scrollbar-thumb-charcoal-600 h-full overflow-y-auto p-4">
        <div className="space-y-4">
          {/* Description */}
          {entity.description && (
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
              <p className="text-sm text-charcoal-200">{entity.description}</p>
            </div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-2 text-center">
              <div className="font-display text-lg text-charcoal-100">{entity.mention_count}</div>
              <div className="text-xs text-charcoal-500">Mentions</div>
            </div>
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-2 text-center">
              <div className="font-display text-lg text-charcoal-100">
                {entity.documents_mentioned.length}
              </div>
              <div className="text-xs text-charcoal-500">Documents</div>
            </div>
          </div>

          {/* Professional Registration */}
          {entity.professional_registration && (
            <div className="space-y-2">
              <label className="font-mono text-[10px] uppercase tracking-wider text-charcoal-500">
                Professional Registration
              </label>
              <div className="rounded-lg border border-bronze-600/20 bg-bronze-900/10 p-3">
                <div className="font-medium text-bronze-500">
                  {entity.professional_registration.body}
                </div>
                {entity.professional_registration.registration_number && (
                  <div className="mt-1 font-mono text-sm text-charcoal-300">
                    #{entity.professional_registration.registration_number}
                  </div>
                )}
                {entity.professional_registration.status && (
                  <Badge variant="outline" className="mt-2 text-xs">
                    {entity.professional_registration.status}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Aliases */}
          {entity.aliases.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-charcoal-500">
                Known Aliases
                <span className="text-charcoal-600">({entity.aliases.length})</span>
              </label>
              <div className="flex flex-wrap gap-1.5">
                {entity.aliases.map((alias, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center rounded border border-charcoal-700/50 bg-charcoal-800 px-2 py-0.5 text-xs text-charcoal-300"
                  >
                    {alias.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {entity.relationships.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-charcoal-500">
                Relationships
                <span className="text-charcoal-600">({entity.relationships.length})</span>
              </label>
              <div className="space-y-2">
                {entity.relationships.map(rel => (
                  <div
                    key={rel.id}
                    className="rounded-lg border border-charcoal-700/50 bg-charcoal-800/50 p-2"
                  >
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-charcoal-200">
                        {rel.target_entity_name}
                      </span>
                      <Badge variant="outline" className="text-xs capitalize">
                        {rel.relationship_type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <p className="mt-1 text-xs text-charcoal-400">{rel.evidence}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {entity.documents_mentioned.length > 0 && (
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-charcoal-500">
                Documents
                <span className="text-charcoal-600">({entity.documents_mentioned.length})</span>
              </label>
              <div className="scrollbar-thin scrollbar-thumb-charcoal-600 max-h-24 space-y-1 overflow-y-auto">
                {entity.documents_mentioned.slice(0, 10).map((docId, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded border border-charcoal-700/30 bg-charcoal-800/50 px-2 py-1.5 text-xs"
                  >
                    <svg
                      className="h-3 w-3 shrink-0 text-charcoal-500"
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
                    <span className="truncate font-mono text-charcoal-300">
                      {docId.length > 25 ? `${docId.slice(0, 22)}...` : docId}
                    </span>
                  </div>
                ))}
                {entity.documents_mentioned.length > 10 && (
                  <div className="text-xs text-charcoal-500">
                    +{entity.documents_mentioned.length - 10} more
                  </div>
                )}
              </div>
            </div>
          )}

          {/* First Appearance */}
          {entity.first_appearance && (
            <div className="pt-2 text-xs text-charcoal-500">
              First seen: {new Date(entity.first_appearance).toLocaleDateString()}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}

export default EntityGraphViewer
