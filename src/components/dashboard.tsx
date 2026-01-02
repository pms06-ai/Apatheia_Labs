'use client'

import { useMemo } from 'react'
import { FileText, Users, AlertTriangle, Scale, Activity, ArrowUpRight } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { BiasCascadesWidget } from '@/components/dashboard/bias-cascades-widget'
import { useDocuments, useFindings } from '@/hooks/use-api'
import { useCaseStore } from '@/hooks/use-case-store'
import { PremiumFindingCard } from '@/components/analysis/premium-finding-card'
import Link from 'next/link'

export function Dashboard() {
  const { activeCase } = useCaseStore()
  const caseId = activeCase?.id || ''

  const { data: documents } = useDocuments(caseId)
  const { data: findings } = useFindings(caseId)

  // Memoize expensive calculations
  const statsData = useMemo(() => {
    const criticalFindings = findings?.filter(f => f.severity === 'critical').length || 0
    const totalFindings = findings?.length || 0
    const totalEntities = findings?.length || 0 // Use finding count as proxy until proper entity tracking

    return {
      criticalFindings,
      totalFindings,
      totalEntities,
    }
  }, [findings])

  const stats = useMemo(() => [
    {
      name: 'Documents',
      value: documents?.length.toString() || '0',
      icon: FileText,
      change: 'Indexed',
      color: 'text-bronze-400',
      bg: 'bg-gradient-to-br from-charcoal-800 to-charcoal-900',
      border: 'border-charcoal-700'
    },
    {
      name: 'Entities',
      value: statsData.totalEntities.toString(),
      icon: Users,
      change: 'Identified',
      color: 'text-bronze-500',
      bg: 'bg-gradient-to-br from-bronze-900/10 to-bronze-900/5',
      border: 'border-bronze-900/20'
    },
    {
      name: 'Critical Issues',
      value: statsData.criticalFindings.toString(),
      icon: AlertTriangle,
      change: 'High Priority',
      color: 'text-status-critical',
      bg: 'bg-gradient-to-br from-status-critical-bg/10 to-transparent',
      border: 'border-status-critical/20'
    },
    {
      name: 'Total Findings',
      value: statsData.totalFindings.toString(),
      icon: Activity,
      change: 'All Severity',
      color: 'text-charcoal-200',
      bg: 'bg-gradient-to-br from-charcoal-800 to-charcoal-900',
      border: 'border-charcoal-700'
    },
  ], [documents?.length, statsData])

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col gap-2">
        <h1 className="font-display text-3xl text-charcoal-100 tracking-tight">
          Case Dashboard
        </h1>
        <div className="flex items-center gap-3 text-sm">
          <Badge variant="outline" className="border-charcoal-600 text-charcoal-400 font-mono tracking-wider">
            {activeCase?.reference || 'NO CASE SELECTED'}
          </Badge>
          <span className="text-charcoal-500">{'//'}</span>
          <span className="text-charcoal-400 font-medium">
            {activeCase?.name || 'Please select a case from the sidebar'}
          </span>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Card key={stat.name} className={`relative overflow-hidden border ${stat.border} ${stat.bg} p-5 transition-all duration-300 hover:scale-[1.02] hover:shadow-elevated group`}>
            <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-10 transition-opacity duration-500">
              <stat.icon className="h-24 w-24 -mr-4 -mt-4 rotate-12" />
            </div>

            <div className="relative z-10">
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg bg-black/20 backdrop-blur-sm mb-3 border border-white/5`}>
                <stat.icon className={`h-5 w-5 ${stat.color}`} />
              </div>
              <div className={`font-display text-3xl text-white mb-1 tracking-tight`}>
                {stat.value}
              </div>
              <div className="flex items-center gap-2">
                <div className="text-[10px] font-bold text-charcoal-400 uppercase tracking-widest">{stat.name}</div>
                <div className="h-px flex-1 bg-gradient-to-r from-charcoal-700/50 to-transparent" />
                <div className="text-[10px] text-charcoal-500 font-mono">{stat.change}</div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-8">
        {/* Recent Findings (Width 8/12) */}
        <div className="col-span-8 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-lg text-charcoal-100">Recent Findings</h2>
            <Link href="/analysis" className="text-xs text-bronze-500 hover:text-bronze-400 flex items-center gap-1 group">
              View Analysis <ArrowUpRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
            </Link>
          </div>

          <div className="space-y-3">
            {findings && findings.length > 0 ? (
              findings.slice(0, 5).map(finding => (
                <PremiumFindingCard key={finding.id} finding={finding} />
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-charcoal-700 bg-charcoal-800/20 p-8 text-center">
                <AlertTriangle className="mx-auto h-8 w-8 text-charcoal-600 mb-2" />
                <p className="text-charcoal-400 font-medium">No findings recorded</p>
                <p className="text-sm text-charcoal-500 mt-1">Run an analysis engine to populate this list.</p>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar Widgets (Width 4/12) */}
        <div className="col-span-4 space-y-6">

          {/* Bias Widget */}
          <div className="space-y-2">
            <h2 className="font-display text-lg text-charcoal-100">Bias Cascades</h2>
            <BiasCascadesWidget />
          </div>

          {/* Quick Actions */}
          <Card className="border-charcoal-700 bg-gradient-to-br from-charcoal-800 to-charcoal-900 p-0 overflow-hidden">
            <div className="border-b border-charcoal-700/50 px-4 py-3 bg-charcoal-900/50">
              <h2 className="text-xs font-bold text-charcoal-400 uppercase tracking-widest">Quick Actions</h2>
            </div>
            <div className="p-2 space-y-1">
              <Link href="/documents" className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-charcoal-700/50 group">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-bg-tertiary text-charcoal-400 group-hover:text-charcoal-100 transition-colors">
                  <FileText className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-charcoal-200 group-hover:text-white">Upload Document</div>
                  <div className="text-xs text-charcoal-500">Ingest new evidence</div>
                </div>
                <ArrowUpRight className="h-3 w-3 text-charcoal-600 group-hover:text-charcoal-400" />
              </Link>

              <Link href="/analysis" className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-charcoal-700/50 group">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-bg-tertiary text-charcoal-400 group-hover:text-bronze-500 transition-colors">
                  <Activity className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-charcoal-200 group-hover:text-white">Run Analysis</div>
                  <div className="text-xs text-charcoal-500">Execute engines</div>
                </div>
                <ArrowUpRight className="h-3 w-3 text-charcoal-600 group-hover:text-charcoal-400" />
              </Link>

              <Link href="/analysis" className="flex w-full items-center gap-3 rounded-lg p-3 text-left transition hover:bg-charcoal-700/50 group">
                <div className="flex h-8 w-8 items-center justify-center rounded bg-bg-tertiary text-charcoal-400 group-hover:text-bronze-500 transition-colors">
                  <Scale className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium text-charcoal-200 group-hover:text-white">Generate Report</div>
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
