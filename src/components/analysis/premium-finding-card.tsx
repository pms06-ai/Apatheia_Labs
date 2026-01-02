'use client'

import { useState } from 'react'
import { ChevronRight, FileText, ExternalLink, Activity, Scale } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge, EngineBadge } from '@/components/ui/badge'
import type { Finding } from '@/CONTRACT'
import { formatDate } from '@/lib/utils'

interface PremiumFindingCardProps {
    finding: Finding
    onSelect?: (finding: Finding) => void
}

export function PremiumFindingCard({ finding, onSelect }: PremiumFindingCardProps) {
    const [isExpanded, setIsExpanded] = useState(false)



    const severityBorder = {
        critical: 'border-l-status-critical',
        high: 'border-l-status-high',
        medium: 'border-l-status-medium',
        low: 'border-l-status-low'
    }

    return (
        <div
            className={`group relative transition-all duration-300 ${isExpanded ? 'my-4' : 'my-2'}`}
        >
            <div className={`absolute -inset-[1px] rounded-lg opacity-0 transition duration-300 group-hover:opacity-100 bg-gradient-to-r from-bronze-600/20 via-transparent to-transparent blur-sm`} />

            <Card
                className={`relative overflow-hidden border border-charcoal-700 bg-charcoal-800/80 backdrop-blur-sm transition-all duration-300 
        ${isExpanded ? 'border-bronze-600/30 bg-charcoal-800' : 'hover:border-bronze-600/30'}`}
            >
                {/* Main interactive header */}
                <div
                    onClick={() => setIsExpanded(!isExpanded)}
                    className={`relative flex cursor-pointer items-start gap-4 p-4 ${severityBorder[finding.severity as keyof typeof severityBorder]} border-l-4`}
                >
                    {/* Expand Icon with animation */}
                    <div className={`mt-1 text-bronze-500 transition-transform duration-300 ${isExpanded ? 'rotate-90' : ''}`}>
                        <ChevronRight className="h-5 w-5" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-2">

                        {/* Top Meta Row */}
                        <div className="flex items-center gap-3 text-xs font-mono text-charcoal-400">
                            <span className="flex items-center gap-1.5 text-bronze-400">
                                <Activity className="h-3 w-3" />
                                {finding.id}
                            </span>
                            <span>•</span>
                            <span>{formatDate(finding.created_at)}</span>
                        </div>

                        {/* Title & Badges */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <h3 className="font-display text-lg font-medium text-charcoal-100 group-hover:text-bronze-100 transition-colors">
                                {finding.title}
                            </h3>
                            <div className="flex items-center gap-2">
                                <EngineBadge engine={finding.engine} />
                                <Badge variant={finding.severity as any} className="uppercase tracking-wider font-mono text-[10px] px-2">
                                    {finding.severity}
                                </Badge>
                                {finding.confidence && (
                                    <Badge variant="outline" className="text-[10px] px-2 bg-charcoal-900/50 border-charcoal-600">
                                        {Math.round(finding.confidence * 100)}% conf
                                    </Badge>
                                )}
                            </div>
                        </div>

                        {/* Preview Description */}
                        {!isExpanded && (
                            <p className="text-sm text-charcoal-400 line-clamp-1 font-serif italic text-charcoal-300/80">
                                {finding.description}
                            </p>
                        )}
                    </div>
                </div>

                {/* Expanded Content Area */}
                <div className={`grid transition-all duration-300 ease-in-out ${isExpanded ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                    <div className="overflow-hidden">
                        <div className="border-t border-charcoal-700/50 p-6 space-y-6">

                            {/* Full Description */}
                            <div className="space-y-2">
                                <h4 className="flex items-center gap-2 text-xs font-mono uppercase tracking-widest text-bronze-500">
                                    <FileText className="h-3 w-3" /> Analysis
                                </h4>
                                <p className="text-charcoal-200 leading-relaxed font-serif text-lg">
                                    {finding.description}
                                </p>
                            </div>

                            {/* Technical Evidence Grid */}
                            {finding.evidence && (
                                <div className="bg-charcoal-900/50 rounded border border-charcoal-700/50 p-4 font-mono text-xs">
                                    <div className="flex items-center justify-between mb-3 pb-2 border-b border-charcoal-700/50">
                                        <span className="text-bronze-400 uppercase tracking-wider">Evidence Payload</span>
                                        <span className="text-charcoal-500">
                                            {finding.engine.replace('_', ' ').toUpperCase()}
                                        </span>
                                    </div>

                                    {/* Coordination Evidence */}
                                    {finding.engine === 'coordination' && (
                                        <div className="space-y-4">
                                            {(finding.evidence as any).phrase && (
                                                <div>
                                                    <div className="text-charcoal-500 mb-1">Shared Phrase</div>
                                                    <div className="text-bronze-200 bg-bronze-500/10 p-2 rounded border border-bronze-500/20 italic">
                                                        "{(finding.evidence as any).phrase}"
                                                    </div>
                                                </div>
                                            )}
                                            {(finding.evidence as any).documents && (
                                                <div>
                                                    <div className="text-charcoal-500 mb-1">Involved Documents</div>
                                                    <div className="flex flex-wrap gap-2">
                                                        {(finding.evidence as any).documents.map((d: any, i: number) => (
                                                            <div key={i} className="flex flex-col bg-charcoal-800 p-2 rounded border border-charcoal-600">
                                                                <span className="text-charcoal-200 font-medium">{d.institution}</span>
                                                                <span className="text-charcoal-400 text-[10px]">{d.documentName}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {(finding.evidence as any).source && (finding.evidence as any).target && (
                                                <div className="flex items-center gap-4 p-3 bg-charcoal-800 rounded">
                                                    <div className="text-right">
                                                        <div className="text-charcoal-200 font-bold">{(finding.evidence as any).source}</div>
                                                        <div className="text-charcoal-500 text-[10px]">SOURCE</div>
                                                    </div>
                                                    <div className="h-px flex-1 bg-gradient-to-r from-charcoal-600 via-bronze-500 to-charcoal-600 relative">
                                                        <ChevronRight className="absolute -right-1 -top-2 h-4 w-4 text-bronze-500" />
                                                    </div>
                                                    <div>
                                                        <div className="text-charcoal-200 font-bold">{(finding.evidence as any).target}</div>
                                                        <div className="text-charcoal-500 text-[10px]">TARGET</div>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Omission Evidence */}
                                    {finding.engine === 'omission' && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div className="bg-status-success/5 border border-status-success/20 p-3 rounded">
                                                <div className="text-status-success text-[10px] uppercase tracking-wide mb-2 font-bold">Original Source</div>
                                                <div className="text-charcoal-200 italic border-l-2 border-status-success pl-2">
                                                    "{(finding.evidence as any).sourceContent}"
                                                </div>
                                            </div>
                                            <div className="bg-status-critical/5 border border-status-critical/20 p-3 rounded">
                                                <div className="text-status-critical text-[10px] uppercase tracking-wide mb-2 font-bold">Report (Omitted)</div>
                                                <div className="text-charcoal-200 italic border-l-2 border-status-critical pl-2">
                                                    "{(finding.evidence as any).reportContent}"
                                                </div>
                                            </div>
                                            {(finding.evidence as any).omittedContent && (
                                                <div className="md:col-span-2 bg-charcoal-800 border border-charcoal-600 p-3 rounded mt-2">
                                                    <div className="text-charcoal-400 text-[10px] uppercase tracking-wide mb-1">Specifically Omitted</div>
                                                    <div className="text-bronze-100 font-medium">
                                                        "{(finding.evidence as any).omittedContent}"
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Contradiction Evidence */}
                                    {finding.engine === 'contradiction' && (finding.evidence as any).claim1 && (
                                        <div className="space-y-4">
                                            <div className="relative">
                                                <div className="absolute left-1/2 -ml-px h-full w-0.5 bg-charcoal-700 hidden md:block"></div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                                    <div className="bg-charcoal-800 p-3 rounded border border-charcoal-600 relative">
                                                        <div className="absolute top-3 right-full mr-4 hidden md:block text-charcoal-500 font-mono text-[10px]">CLAIM 1</div>
                                                        <p className="text-charcoal-200">"{(finding.evidence as any).claim1.text}"</p>
                                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-bronze-500">
                                                            <FileText className="h-3 w-3" />
                                                            {(finding.evidence as any).claim1.author}
                                                        </div>
                                                    </div>
                                                    <div className="bg-charcoal-800 p-3 rounded border border-charcoal-600 relative">
                                                        <div className="absolute top-3 left-full ml-4 hidden md:block text-charcoal-500 font-mono text-[10px]">CLAIM 2</div>
                                                        <p className="text-charcoal-200">"{(finding.evidence as any).claim2.text}"</p>
                                                        <div className="mt-2 flex items-center gap-2 text-[10px] text-bronze-500">
                                                            <FileText className="h-3 w-3" />
                                                            {(finding.evidence as any).claim2.author}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="text-center">
                                                <Badge variant="critical" className="bg-status-critical/10 text-status-critical border-status-critical/20">
                                                    Conflict: {(finding.evidence as any).implication || (finding.evidence as any).explanation}
                                                </Badge>
                                            </div>
                                        </div>
                                    )}

                                    {/* Fallback JSON for other engines or if structure is mismatch */}
                                    {!['coordination', 'omission', 'contradiction'].includes(finding.engine) && (
                                        <pre className="text-charcoal-300 overflow-x-auto mt-2">
                                            {JSON.stringify(finding.evidence, null, 2)}
                                        </pre>
                                    )}
                                </div>
                            )}

                            {/* Footer Actions & Tags */}
                            <div className="flex items-center justify-between pt-4 border-t border-charcoal-700/50">
                                <div className="flex flex-wrap gap-2">
                                    {finding.regulatory_targets?.map(target => (
                                        <span key={target} className="flex items-center gap-1.5 bg-charcoal-700/50 px-2 py-1 rounded text-xs text-charcoal-300 border border-charcoal-600">
                                            <Scale className="h-3 w-3 text-bronze-500" />
                                            {target}
                                        </span>
                                    ))}
                                    {finding.document_ids?.map(doc => (
                                        <span key={doc} className="flex items-center gap-1.5 bg-charcoal-700/50 px-2 py-1 rounded text-xs text-charcoal-300 border border-charcoal-600">
                                            <FileText className="h-3 w-3 text-charcoal-400" />
                                            {doc}
                                        </span>
                                    ))}
                                </div>

                                <button
                                    onClick={() => onSelect?.(finding)}
                                    className="flex items-center gap-2 bg-bronze-600 hover:bg-bronze-500 text-charcoal-900 px-4 py-2 rounded text-sm font-medium transition-colors"
                                >
                                    View Full Details <ExternalLink className="h-4 w-4" />
                                </button>
                            </div>

                        </div>
                    </div>
                </div>

            </Card>

            {/* Decorative side line for timeline effect */}
            <div className="absolute -left-3 top-6 bottom-6 w-px bg-charcoal-700/50 hidden md:block" />
            <div className={`absolute -left-[14px] top-8 h-2 w-2 rounded-full border border-charcoal-600 bg-charcoal-900 hidden md:block transition-colors duration-300 ${isExpanded ? 'border-bronze-500 bg-bronze-600' : ''}`} />

        </div>
    )
}
