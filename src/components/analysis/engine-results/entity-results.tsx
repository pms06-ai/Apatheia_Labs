'use client'

import { useMemo, useState } from 'react'
import {
  Users,
  Building2,
  User,
  Shield,
  Briefcase,
  FileText,
  ChevronRight,
  Link2,
  Hash,
  Award,
  Search,
} from 'lucide-react'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type {
  EntityEngineResult,
  NativeResolvedEntity,
  NativeEntityType,
  NativeEntityRole,
  EntityAlias,
  NativeEntityRelationship,
  EntityConfidence,
} from '@/CONTRACT'
import { cn } from '@/lib/utils'

interface EntityResultsProps {
  result: EntityEngineResult
}

const entityTypeIcons: Record<NativeEntityType, typeof User> = {
  person: User,
  organization: Building2,
  professional: Briefcase,
  court: Shield,
  police: Shield,
  agency: Building2,
  expert: Award,
  media: FileText,
  location: FileText,
  document_ref: FileText,
  other: FileText,
}

const entityTypeColors: Record<NativeEntityType, string> = {
  person: 'bg-status-info',
  organization: 'bg-institution-authority',
  professional: 'bg-institution-expert',
  court: 'bg-institution-court',
  police: 'bg-institution-police',
  agency: 'bg-institution-authority',
  expert: 'bg-institution-expert',
  media: 'bg-institution-broadcast',
  location: 'bg-charcoal-500',
  document_ref: 'bg-charcoal-500',
  other: 'bg-charcoal-600',
}

const roleLabels: Record<NativeEntityRole, string> = {
  applicant: 'Applicant',
  respondent: 'Respondent',
  subject: 'Subject',
  adjudicator: 'Adjudicator',
  expert_witness: 'Expert Witness',
  fact_witness: 'Fact Witness',
  assessment_author: 'Assessment Author',
  legal_representative: 'Legal Representative',
  litigation_friend: 'Litigation Friend',
  media_entity: 'Media Entity',
  investigator: 'Investigator',
  unknown: 'Unknown',
}

const confidenceColors: Record<EntityConfidence, string> = {
  definite: 'text-status-success',
  high: 'text-bronze-500',
  medium: 'text-charcoal-300',
  low: 'text-charcoal-400',
  speculative: 'text-charcoal-500',
}

function EntityCard({ entity }: { entity: NativeResolvedEntity }) {
  const [expanded, setExpanded] = useState(false)
  const Icon = entityTypeIcons[entity.entity_type] || User

  return (
    <Card className="border-charcoal-700 bg-charcoal-800/60 transition-all hover:border-charcoal-600">
      <div
        className="flex cursor-pointer items-start gap-4 p-4"
        onClick={() => setExpanded(!expanded)}
      >
        {/* Entity Icon */}
        <div
          className={cn(
            'flex h-12 w-12 shrink-0 items-center justify-center rounded-full',
            entityTypeColors[entity.entity_type]
          )}
        >
          <Icon className="h-6 w-6 text-white" />
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          {/* Name and Type */}
          <div className="flex items-start justify-between gap-3">
            <div>
              <h4 className="font-display text-lg text-charcoal-100">{entity.canonical_name}</h4>
              <div className="flex flex-wrap items-center gap-2 text-xs text-charcoal-400">
                <Badge variant="outline" className="text-xs">
                  {entity.entity_type.replace(/_/g, ' ')}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {roleLabels[entity.role]}
                </Badge>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-charcoal-500">{entity.mention_count} mentions</span>
              <div className={cn('transition-transform duration-200', expanded && 'rotate-90')}>
                <ChevronRight className="h-4 w-4 text-charcoal-400" />
              </div>
            </div>
          </div>

          {/* Brief Info */}
          {entity.description && !expanded && (
            <p className="line-clamp-1 text-sm text-charcoal-400">{entity.description}</p>
          )}

          {/* Quick Stats */}
          <div className="flex flex-wrap gap-4 text-xs text-charcoal-500">
            {entity.aliases.length > 0 && (
              <span className="flex items-center gap-1">
                <Hash className="h-3 w-3" />
                {entity.aliases.length} aliases
              </span>
            )}
            {entity.relationships.length > 0 && (
              <span className="flex items-center gap-1">
                <Link2 className="h-3 w-3" />
                {entity.relationships.length} relationships
              </span>
            )}
            {entity.documents_mentioned.length > 0 && (
              <span className="flex items-center gap-1">
                <FileText className="h-3 w-3" />
                {entity.documents_mentioned.length} documents
              </span>
            )}
          </div>
        </div>
      </div>

      {expanded && (
        <div className="space-y-4 border-t border-charcoal-700/50 p-4">
          {/* Description */}
          {entity.description && (
            <div className="rounded-lg border border-charcoal-700 bg-charcoal-900/50 p-3">
              <p className="text-sm text-charcoal-200">{entity.description}</p>
            </div>
          )}

          {/* Professional Registration */}
          {entity.professional_registration && (
            <div className="rounded-lg border border-bronze-600/20 bg-bronze-900/10 p-3">
              <div className="mb-1 text-xs font-medium uppercase tracking-wide text-bronze-500">
                Professional Registration
              </div>
              <div className="flex flex-wrap gap-2 text-sm text-charcoal-200">
                <span className="font-medium">{entity.professional_registration.body}</span>
                {entity.professional_registration.registration_number && (
                  <span className="font-mono text-charcoal-400">
                    #{entity.professional_registration.registration_number}
                  </span>
                )}
                {entity.professional_registration.status && (
                  <Badge variant="outline" className="text-xs">
                    {entity.professional_registration.status}
                  </Badge>
                )}
              </div>
            </div>
          )}

          {/* Aliases */}
          {entity.aliases.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal-400">
                Known Aliases ({entity.aliases.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {entity.aliases.map((alias, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-2 rounded-lg bg-charcoal-800 px-3 py-1.5"
                  >
                    <span className="text-sm text-charcoal-200">{alias.name}</span>
                    <span className="text-xs text-charcoal-500">({alias.alias_type})</span>
                    <span className={cn('text-xs', confidenceColors[alias.confidence])}>
                      {alias.confidence}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Relationships */}
          {entity.relationships.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal-400">
                Relationships ({entity.relationships.length})
              </div>
              <div className="space-y-2">
                {entity.relationships.map(rel => (
                  <div
                    key={rel.id}
                    className="flex items-center gap-3 rounded-lg bg-charcoal-800 p-3"
                  >
                    <Link2 className="h-4 w-4 shrink-0 text-bronze-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-charcoal-200">
                          {rel.target_entity_name}
                        </span>
                        <Badge variant="outline" className="text-xs">
                          {rel.relationship_type.replace(/_/g, ' ')}
                        </Badge>
                        <span className={cn('text-xs', confidenceColors[rel.confidence])}>
                          {rel.confidence}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-charcoal-400">{rel.evidence}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents Mentioned */}
          {entity.documents_mentioned.length > 0 && (
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-charcoal-400">
                Appears In ({entity.documents_mentioned.length} documents)
              </div>
              <div className="flex flex-wrap gap-2">
                {entity.documents_mentioned.slice(0, 10).map((doc, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    <FileText className="mr-1 h-3 w-3" />
                    {doc}
                  </Badge>
                ))}
                {entity.documents_mentioned.length > 10 && (
                  <span className="text-xs text-charcoal-500">
                    +{entity.documents_mentioned.length - 10} more
                  </span>
                )}
              </div>
            </div>
          )}

          {/* First Appearance */}
          {entity.first_appearance && (
            <div className="text-xs text-charcoal-500">
              First appearance: {new Date(entity.first_appearance).toLocaleDateString()}
            </div>
          )}
        </div>
      )}
    </Card>
  )
}

export function EntityResults({ result }: EntityResultsProps) {
  const [filter, setFilter] = useState<NativeEntityType | 'all'>('all')
  const [searchQuery, setSearchQuery] = useState('')

  // Filter and search entities - must be before early return
  const filteredEntities = useMemo(() => {
    if (!result.success || !result.analysis) return []
    let filtered = result.analysis.entities

    // Filter by type
    if (filter !== 'all') {
      filtered = filtered.filter(e => e.entity_type === filter)
    }

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        e =>
          e.canonical_name.toLowerCase().includes(query) ||
          e.aliases.some(a => a.name.toLowerCase().includes(query)) ||
          e.description?.toLowerCase().includes(query)
      )
    }

    // Sort by mention count
    return filtered.sort((a, b) => b.mention_count - a.mention_count)
  }, [result, filter, searchQuery])

  // Get unique entity types for filter - must be before early return
  const entityTypes = useMemo(() => {
    if (!result.success || !result.analysis) return [] as NativeEntityType[]
    const types = new Set(result.analysis.entities.map(e => e.entity_type))
    return Array.from(types)
  }, [result])

  if (!result.success || !result.analysis) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <Users className="h-12 w-12 text-charcoal-500" />
        <p className="text-charcoal-400">{result.error || 'No entity analysis available'}</p>
      </div>
    )
  }

  const { entities, summary, is_mock } = result.analysis

  return (
    <div className="space-y-6 p-6">
      {/* Mock Mode Indicator */}
      {is_mock && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-900/20 px-4 py-2 text-center text-sm text-amber-400">
          Mock data - configure AI provider for live analysis
        </div>
      )}

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4 lg:grid-cols-6">
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Total Entities</div>
          <div className="mt-1 font-display text-3xl text-charcoal-100">
            {summary.total_entities}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Persons</div>
          <div className="mt-1 font-display text-3xl text-status-info">{summary.persons}</div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Organizations</div>
          <div className="mt-1 font-display text-3xl text-institution-authority">
            {summary.organizations}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Professionals</div>
          <div className="mt-1 font-display text-3xl text-institution-expert">
            {summary.professionals}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Aliases Resolved</div>
          <div className="mt-1 font-display text-3xl text-bronze-500">
            {summary.aliases_resolved}
          </div>
        </Card>
        <Card className="border-charcoal-700 bg-charcoal-800/50 p-4">
          <div className="text-xs uppercase tracking-wide text-charcoal-400">Relationships</div>
          <div className="mt-1 font-display text-3xl text-charcoal-200">
            {summary.relationships_found}
          </div>
        </Card>
      </div>

      {/* Key Parties */}
      {summary.key_parties.length > 0 && (
        <Card className="border-charcoal-700 bg-charcoal-800/30">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm">
              <Users className="h-4 w-4 text-bronze-500" />
              Key Parties
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {summary.key_parties.map((party, idx) => (
                <Badge key={idx} variant="outline" className="gap-1 px-3 py-1">
                  <User className="h-3 w-3" />
                  {party}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search and Filter */}
      <div className="flex flex-wrap items-center gap-4">
        {/* Search */}
        <div className="relative min-w-[200px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal-500" />
          <input
            type="text"
            placeholder="Search entities..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full rounded-lg border border-charcoal-700 bg-charcoal-800 py-2 pl-10 pr-4 text-sm text-charcoal-200 placeholder-charcoal-500 focus:border-bronze-500 focus:outline-none focus:ring-1 focus:ring-bronze-500"
          />
        </div>

        {/* Filter by Type */}
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setFilter('all')}
            className={cn(
              'rounded-lg px-3 py-1.5 text-sm transition-colors',
              filter === 'all'
                ? 'bg-bronze-600/20 text-bronze-500'
                : 'text-charcoal-400 hover:text-charcoal-200'
            )}
          >
            All ({entities.length})
          </button>
          {entityTypes.map(type => (
            <button
              key={type}
              onClick={() => setFilter(type)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-sm transition-colors',
                filter === type
                  ? 'bg-bronze-600/20 text-bronze-500'
                  : 'text-charcoal-400 hover:text-charcoal-200'
              )}
            >
              {type.replace(/_/g, ' ')} ({entities.filter(e => e.entity_type === type).length})
            </button>
          ))}
        </div>
      </div>

      {/* Entities List */}
      <div className="space-y-3">
        {filteredEntities.length === 0 ? (
          <div className="py-12 text-center text-charcoal-500">No entities match your filter</div>
        ) : (
          filteredEntities.map(entity => <EntityCard key={entity.id} entity={entity} />)
        )}
      </div>

      {/* Duration */}
      <div className="text-right text-xs text-charcoal-500">
        Analysis completed in {result.duration_ms}ms
      </div>
    </div>
  )
}
