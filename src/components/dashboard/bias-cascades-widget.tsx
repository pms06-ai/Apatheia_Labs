'use client'

import { useMemo, memo } from 'react'
import { motion } from 'framer-motion'
import { Card } from '@/components/ui/card'
import { ArrowDown, AlertCircle, BarChart3 } from 'lucide-react'
import { useFindings } from '@/hooks/use-api'
import type { Finding, Severity } from '@/CONTRACT'

interface BiasCascadesWidgetProps {
  caseId: string
}

interface CascadeStage {
  stage: string
  bias: string
  description: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  count: number
}

/**
 * Transform bias findings into cascade stages grouped by severity
 * and calculate a cumulative error factor
 */
function transformToCascade(findings: Finding[]): { stages: CascadeStage[]; factor: number } {
  if (!findings.length) return { stages: [], factor: 0 }

  // Group findings by severity level to show escalation
  const bySeverity: Record<string, Finding[]> = {
    low: [],
    medium: [],
    high: [],
    critical: [],
  }

  findings.forEach(f => {
    const sev = f.severity || 'medium'
    if (sev in bySeverity) {
      bySeverity[sev].push(f)
    }
  })

  const stages: CascadeStage[] = []
  let cumulativeCount = 0

  // Build cascade from low to critical severity
  const severityOrder: Array<{ key: Severity; label: string }> = [
    { key: 'low', label: 'Initial Assessment' },
    { key: 'medium', label: 'Investigation' },
    { key: 'high', label: 'Institutional Review' },
    { key: 'critical', label: 'Final Determination' },
  ]

  severityOrder.forEach(({ key, label }) => {
    const items = bySeverity[key] || []
    if (items.length > 0) {
      cumulativeCount += items.length
      const firstFinding = items[0]
      stages.push({
        stage: label,
        bias: firstFinding.finding_type || 'Bias Detected',
        description: firstFinding.description || firstFinding.title,
        severity: key as CascadeStage['severity'],
        count: cumulativeCount,
      })
    }
  })

  // Calculate amplification factor (ratio of final to initial count)
  const factor = stages.length > 1 ? stages[stages.length - 1].count / stages[0].count : 1

  return { stages, factor }
}

/**
 * Cascade step component - memoized for performance in list rendering
 */
const CascadeStep = memo(function CascadeStep({
  step,
  index,
  isLast,
}: {
  step: CascadeStage
  index: number
  isLast: boolean
}) {
  return (
    <div className="relative pb-5 last:pb-0">
      {/* Animated Connector Line */}
      {!isLast && (
        <motion.div
          initial={{ height: 0 }}
          animate={{ height: '100%' }}
          transition={{ duration: 0.5, delay: index * 0.2 }}
          className="absolute bottom-[-10px] left-[13px] top-7 w-0.5 bg-gradient-to-b from-bronze-500/50 to-status-critical/50 shadow-[0_0_8px_rgba(239,68,68,0.2)]"
        />
      )}

      <motion.div
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: index * 0.15 }}
        className="relative z-10 flex items-start gap-3"
      >
        {/* Node */}
        <div
          className={`relative flex h-7 w-7 shrink-0 items-center justify-center rounded-full border shadow-lg backdrop-blur-md transition-all duration-500 ${
            step.severity === 'critical'
              ? 'border-status-critical bg-status-critical/10 text-status-critical shadow-status-critical/20'
              : step.severity === 'high'
                ? 'border-status-high bg-status-high/10 text-status-high shadow-status-high/20'
                : 'border-bronze-500 bg-bronze-500/10 text-bronze-500 shadow-bronze-500/20'
          } `}
        >
          <span className="font-mono text-xs font-bold">{step.count}</span>
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 border-b border-charcoal-800/50 pb-4 pt-0.5 last:border-0 last:pb-0">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-charcoal-200">{step.stage}</span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider ${
                step.severity === 'critical'
                  ? 'bg-status-critical/10 text-status-critical'
                  : step.severity === 'high'
                    ? 'bg-status-high/10 text-status-high'
                    : 'bg-bronze-500/10 text-bronze-500'
              }`}
            >
              {step.bias}
            </span>
          </div>
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-charcoal-400">
            {step.description}
          </p>
        </div>
      </motion.div>
    </div>
  )
})
CascadeStep.displayName = 'CascadeStep'

/**
 * Bias cascades widget - shows amplification of bias through investigation stages
 */
export function BiasCascadesWidget({ caseId }: BiasCascadesWidgetProps) {
  const { data: findings } = useFindings(caseId)

  // Filter to bias_detection engine findings and transform
  const { cascadeData, cumulativeFactor } = useMemo(() => {
    const biasFindings = findings?.filter(f => f.engine === 'bias_detection') || []
    const { stages, factor } = transformToCascade(biasFindings)
    return { cascadeData: stages, cumulativeFactor: factor }
  }, [findings])

  // Show empty state if no data
  if (cascadeData.length === 0) {
    return (
      <Card className="flex h-full flex-col overflow-hidden border-charcoal-700 bg-charcoal-800/40 backdrop-blur-sm">
        <div className="border-b border-charcoal-700/50 bg-gradient-to-r from-charcoal-800 to-charcoal-900 px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-sm uppercase tracking-wide text-charcoal-100">
                Bias Amplification
              </h2>
              <p className="text-[10px] text-charcoal-400">Systematic prejudice tracking</p>
            </div>
            <BarChart3 className="h-4 w-4 text-charcoal-500" />
          </div>
        </div>
        <div className="flex flex-1 items-center justify-center p-6">
          <div className="text-center">
            <BarChart3 className="mx-auto mb-2 h-8 w-8 text-charcoal-600" />
            <p className="text-sm text-charcoal-400">No bias analysis data</p>
            <p className="mt-1 text-xs text-charcoal-500">
              Run the bias detection engine to populate this view
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <Card className="flex h-full flex-col overflow-hidden border-charcoal-700 bg-charcoal-800/40 backdrop-blur-sm">
      <div className="border-b border-charcoal-700/50 bg-gradient-to-r from-charcoal-800 to-charcoal-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-display text-sm uppercase tracking-wide text-charcoal-100">
              Bias Amplification
            </h2>
            <p className="text-[10px] text-charcoal-400">Systematic prejudice tracking</p>
          </div>
          <AlertCircle className="h-4 w-4 text-status-critical" />
        </div>
      </div>

      <div className="relative flex-1 space-y-0 p-4">
        {/* Background Track Line */}
        <div className="absolute bottom-6 left-[29px] top-6 w-0.5 bg-charcoal-700/30" />

        {cascadeData.map((step, index) => (
          <CascadeStep
            key={step.stage}
            step={step}
            index={index}
            isLast={index === cascadeData.length - 1}
          />
        ))}
      </div>

      <div className="border-t border-charcoal-700/50 bg-gradient-to-b from-charcoal-800/80 to-charcoal-900 px-4 py-3">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs text-charcoal-400">CUMULATIVE ERROR</span>
          <div className="flex items-center gap-2 font-display text-sm font-bold text-status-critical">
            <ArrowDown className="h-4 w-4 animate-bounce" />
            {cumulativeFactor.toFixed(1)}x Factor
          </div>
        </div>
      </div>
    </Card>
  )
}
