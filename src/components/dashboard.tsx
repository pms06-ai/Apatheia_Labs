'use client'

import { useMemo, memo } from 'react'
import { FileText, Users, AlertTriangle, Scale, Activity, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BiasCascadesWidget } from '@/components/dashboard/bias-cascades-widget'
import { useDocuments, useFindings } from '@/hooks/use-api'
import { useCaseStore } from '@/hooks/use-case-store'
import { PremiumFindingCard } from '@/components/analysis/premium-finding-card'
import { Link } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'

interface StatCardData {
  name: string
  value: string
  icon: LucideIcon
  change: string
  color: string
  bg: string
  border: string
}

/**
 * Stats card component - memoized to prevent re-renders when stats haven't changed
 */
const StatsCard = memo(function StatsCard({ stat }: { stat: StatCardData }) {
  const Icon = stat.icon
  return (
    <Card
      className={`relative overflow-hidden border ${stat.border} ${stat.bg} group p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-elevated`}
    >
      <div className="absolute right-0 top-0 p-4 opacity-0 transition-opacity duration-500 group-hover:opacity-10">
        <Icon className="-mr-4 -mt-4 h-24 w-24 rotate-12" />
      </div>

      <div className="relative z-10">
        <div
          className={`mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-white/5 bg-black/20 backdrop-blur-sm`}
        >
          <Icon className={`h-5 w-5 ${stat.color}`} />
        </div>
        <div className={`mb-1 font-display text-3xl tracking-tight text-white`}>{stat.value}</div>
        <div className="flex items-center gap-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-charcoal-400">
            {stat.name}
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-charcoal-700/50 to-transparent" />
          <div className="font-mono text-[10px] text-charcoal-500">{stat.change}</div>
        </div>
      </div>
    </Card>
  )
})
StatsCard.displayName = 'StatsCard'

export function Dashboard() {
  const { activeCase } = useCaseStore()
  const caseId = activeCase?.id || ''

  const { data: documents } = useDocuments(caseId)
  const { data: findings } = useFindings(caseId)

  // Memoize expensive calculations
  const statsData = useMemo(() => {
    const criticalFindings = findings?.filter(f => f.severity === 'critical').length || 0
    const totalFindings = findings?.length || 0

    // Extract unique entity IDs from all findings
    const uniqueEntityIds = new Set<string>()
    findings?.forEach(f => {
      f.entity_ids?.forEach(id => uniqueEntityIds.add(id))
    })
    const totalEntities = uniqueEntityIds.size

    return {
      criticalFindings,
      totalFindings,
      totalEntities,
    }
  }, [findings])

  const stats = useMemo(
    () => [
      {
        name: 'Documents',
        value: documents?.length.toString() || '0',
        icon: FileText,
        change: 'Indexed',
        color: 'text-bronze-400',
        bg: 'bg-gradient-to-br from-charcoal-800 to-charcoal-900',
        border: 'border-charcoal-700',
      },
      {
        name: 'Entities',
        value: statsData.totalEntities.toString(),
        icon: Users,
        change: 'Identified',
        color: 'text-bronze-500',
        bg: 'bg-gradient-to-br from-bronze-900/10 to-bronze-900/5',
        border: 'border-bronze-900/20',
      },
      {
        name: 'Critical Issues',
        value: statsData.criticalFindings.toString(),
        icon: AlertTriangle,
        change: 'High Priority',
        color: 'text-status-critical',
        bg: 'bg-gradient-to-br from-status-critical-bg/10 to-transparent',
        border: 'border-status-critical/20',
      },
      {
        name: 'Total Findings',
        value: statsData.totalFindings.toString(),
        icon: Activity,
        change: 'All Severity',
        color: 'text-charcoal-200',
        bg: 'bg-gradient-to-br from-charcoal-800 to-charcoal-900',
        border: 'border-charcoal-700',
      },
    ],
    [documents?.length, statsData]
  )

  // Memoize recent findings to avoid recalculating on every render
  const recentFindings = useMemo(() => findings?.slice(0, 5) || [], [findings])

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl tracking-tight text-charcoal-100">Case Dashboard</h1>
        <div className="flex items-center gap-3 text-sm">
          <Badge
            variant="outline"
            className="border-charcoal-600 font-mono tracking-wider text-charcoal-400"
          >
            {activeCase?.reference || 'NO CASE SELECTED'}
          </Badge>
          <span className="text-charcoal-500">{'//'}</span>
          <span className="font-medium text-charcoal-400">
            {activeCase?.name || 'Please select a case from the sidebar'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map(stat => (
          <StatsCard key={stat.name} stat={stat} />
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Recent Findings (Width 8/12) */}
        <div className="col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-charcoal-100">Recent Findings</h2>
            <Link
              to="/analysis"
              className="group flex items-center gap-1 text-xs text-bronze-500 hover:text-bronze-400"
            >
              View Analysis{' '}
              <ArrowUpRight className="h-3 w-3 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {recentFindings.length > 0 ? (
              recentFindings.map(finding => (
                <PremiumFindingCard key={finding.id} finding={finding} />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-charcoal-700 bg-charcoal-800/20 p-8 text-center">
                <AlertTriangle className="mx-auto mb-2 h-8 w-8 text-charcoal-600" />
                <p className="font-medium text-charcoal-400">No findings recorded</p>
                <p className="mt-1 text-sm text-charcoal-500">
                  Run an analysis engine to populate this list.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets (Width 4/12) */}
        <div className="col-span-4 space-y-6">
          {/* Bias Widget */}
          <div className="space-y-2">
            <h2 className="font-display text-lg text-charcoal-100">Bias Cascades</h2>
            <BiasCascadesWidget caseId={caseId} />
          </div>

          {/* Quick Actions */}
          <Card className="overflow-hidden border-charcoal-700 bg-gradient-to-br from-charcoal-800 to-charcoal-900 p-0">
            <div className="border-b border-charcoal-700/50 bg-charcoal-900/50 px-4 py-3">
              <h2 className="text-xs font-bold uppercase tracking-widest text-charcoal-400">
                Quick Actions
              </h2>
            </div>
            <div className="space-y-1 p-2">
              <Link
                to="/documents"
                className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-charcoal-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-bg-tertiary text-charcoal-400 transition-colors group-hover:text-charcoal-100">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-charcoal-200 group-hover:text-white">
                    Upload Document
                  </div>
                  <div className="text-xs text-charcoal-500">Ingest new evidence</div>
                </div>
                <ArrowUpRight className="h-3 w-3 text-charcoal-600 group-hover:text-charcoal-400" />
              </Link>

              <Link
                to="/analysis"
                className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-charcoal-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-bg-tertiary text-charcoal-400 transition-colors group-hover:text-bronze-500">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-charcoal-200 group-hover:text-white">
                    Run Analysis
                  </div>
                  <div className="text-xs text-charcoal-500">Execute engines</div>
                </div>
                <ArrowUpRight className="h-3 w-3 text-charcoal-600 group-hover:text-charcoal-400" />
              </Link>

              <Link
                to="/analysis"
                className="group flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-charcoal-700/50"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded bg-bg-tertiary text-charcoal-400 transition-colors group-hover:text-bronze-500">
                  <Scale className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-charcoal-200 group-hover:text-white">
                    Generate Report
                  </div>
                  <div className="text-xs text-charcoal-500">Download PDF</div>
                </div>
                <ArrowUpRight className="h-3 w-3 text-charcoal-600 group-hover:text-charcoal-400" />
              </Link>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
