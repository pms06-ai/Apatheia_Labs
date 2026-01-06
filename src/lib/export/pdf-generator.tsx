/**
 * PDF Export Generator
 *
 * Generates legally-defensible PDF documents using @react-pdf/renderer.
 * Includes cover page, findings, contradictions, entities, citations,
 * audit trail, and methodology sections.
 *
 * Based on patterns from premium-finding-card.tsx and export type definitions.
 */

import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from '@react-pdf/renderer'
import type {
  ExportData,
  ExportFinding,
  ExportContradiction,
  ExportEntity,
  ExportOptions,
  AuditTrail,
  MethodologyStatement,
  ExportSummary,
  Citation,
} from '@/lib/types/export'
import { DEFAULT_EXPORT_OPTIONS } from '@/lib/types/export'
import type { Severity, Engine } from '@/CONTRACT'

// ============================================
// FONT REGISTRATION
// ============================================

// Register fonts (using built-in fonts for compatibility)
Font.register({
  family: 'Times-Roman',
  src: 'Times-Roman',
})

// ============================================
// STYLE DEFINITIONS
// ============================================

const colors = {
  primary: '#1a1a2e',
  secondary: '#2d3748',
  accent: '#b8860b',
  text: '#1a202c',
  textSecondary: '#4a5568',
  textMuted: '#718096',
  border: '#e2e8f0',
  critical: '#dc2626',
  high: '#ea580c',
  medium: '#ca8a04',
  low: '#16a34a',
  info: '#2563eb',
  background: '#ffffff',
  backgroundAlt: '#f8fafc',
}

const styles = StyleSheet.create({
  // Page layout
  page: {
    flexDirection: 'column',
    backgroundColor: colors.background,
    paddingTop: 50,
    paddingBottom: 60,
    paddingHorizontal: 50,
    fontFamily: 'Times-Roman',
    fontSize: 11,
    lineHeight: 1.5,
  },

  // Header and footer
  header: {
    position: 'absolute',
    top: 20,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 8,
  },
  headerText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  footer: {
    position: 'absolute',
    bottom: 25,
    left: 50,
    right: 50,
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: 8,
  },
  footerText: {
    fontSize: 9,
    color: colors.textMuted,
  },
  pageNumber: {
    fontSize: 9,
    color: colors.textSecondary,
  },

  // Cover page
  coverPage: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  coverTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  coverSubtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 40,
    textAlign: 'center',
  },
  coverMeta: {
    marginTop: 60,
    alignItems: 'center',
  },
  coverMetaText: {
    fontSize: 11,
    color: colors.textMuted,
    marginBottom: 4,
  },

  // Section headers
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
    marginTop: 20,
    borderBottomWidth: 2,
    borderBottomColor: colors.accent,
    paddingBottom: 6,
  },
  subsectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 8,
    marginTop: 16,
  },

  // Body text
  paragraph: {
    fontSize: 11,
    color: colors.text,
    marginBottom: 8,
    textAlign: 'justify',
  },
  label: {
    fontSize: 10,
    color: colors.textMuted,
    marginBottom: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Finding card
  findingCard: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.backgroundAlt,
    borderRadius: 4,
    borderLeftWidth: 4,
    borderLeftColor: colors.medium,
  },
  findingCardCritical: {
    borderLeftColor: colors.critical,
  },
  findingCardHigh: {
    borderLeftColor: colors.high,
  },
  findingCardMedium: {
    borderLeftColor: colors.medium,
  },
  findingCardLow: {
    borderLeftColor: colors.low,
  },
  findingCardInfo: {
    borderLeftColor: colors.info,
  },
  findingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  findingTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    flex: 1,
    marginRight: 8,
  },
  findingBadge: {
    fontSize: 8,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
    textTransform: 'uppercase',
  },
  findingDescription: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 6,
  },
  findingMeta: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  findingMetaItem: {
    fontSize: 9,
    color: colors.textMuted,
  },

  // Contradiction table
  table: {
    marginTop: 12,
    marginBottom: 12,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    padding: 8,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    padding: 8,
  },
  tableRowAlt: {
    backgroundColor: colors.backgroundAlt,
  },
  tableCell: {
    fontSize: 10,
    color: colors.text,
  },
  tableCellTitle: {
    width: '25%',
  },
  tableCellSource: {
    width: '25%',
  },
  tableCellText: {
    width: '40%',
  },
  tableCellSeverity: {
    width: '10%',
    textAlign: 'center',
  },

  // Quote block
  quoteBlock: {
    marginVertical: 8,
    paddingLeft: 12,
    borderLeftWidth: 3,
    borderLeftColor: colors.accent,
  },
  quoteText: {
    fontSize: 10,
    fontStyle: 'italic',
    color: colors.textSecondary,
    marginBottom: 4,
  },
  quoteCitation: {
    fontSize: 9,
    color: colors.textMuted,
  },

  // Entity section
  entityCard: {
    marginBottom: 12,
    padding: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 4,
  },
  entityName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 4,
  },
  entityType: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  entityRole: {
    fontSize: 10,
    color: colors.textSecondary,
    marginBottom: 4,
  },

  // Audit trail
  auditTrailStep: {
    marginBottom: 8,
    paddingLeft: 12,
    borderLeftWidth: 2,
    borderLeftColor: colors.border,
  },
  auditStepType: {
    fontSize: 9,
    fontWeight: 'bold',
    color: colors.accent,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  auditStepDescription: {
    fontSize: 10,
    color: colors.text,
    marginBottom: 2,
  },
  auditStepMeta: {
    fontSize: 8,
    color: colors.textMuted,
  },

  // Summary statistics
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginVertical: 12,
  },
  statBox: {
    width: '33%',
    padding: 10,
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 9,
    color: colors.textMuted,
    textTransform: 'uppercase',
  },

  // Citations list
  citationItem: {
    marginBottom: 6,
    paddingLeft: 16,
  },
  citationNumber: {
    position: 'absolute',
    left: 0,
    fontSize: 10,
    color: colors.textMuted,
  },
  citationText: {
    fontSize: 10,
    color: colors.text,
  },

  // Methodology
  methodologySection: {
    marginBottom: 16,
  },
  bulletList: {
    marginLeft: 16,
    marginBottom: 8,
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  bullet: {
    fontSize: 10,
    marginRight: 8,
    color: colors.accent,
  },
  bulletText: {
    fontSize: 10,
    color: colors.text,
    flex: 1,
  },

  // Severity badges
  severityCritical: {
    backgroundColor: colors.critical,
    color: colors.background,
  },
  severityHigh: {
    backgroundColor: colors.high,
    color: colors.background,
  },
  severityMedium: {
    backgroundColor: colors.medium,
    color: colors.background,
  },
  severityLow: {
    backgroundColor: colors.low,
    color: colors.background,
  },
  severityInfo: {
    backgroundColor: colors.info,
    color: colors.background,
  },
})

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get severity-specific style for finding cards
 */
function getSeverityStyle(severity: Severity | null | undefined) {
  switch (severity) {
    case 'critical':
      return styles.findingCardCritical
    case 'high':
      return styles.findingCardHigh
    case 'medium':
      return styles.findingCardMedium
    case 'low':
      return styles.findingCardLow
    case 'info':
      return styles.findingCardInfo
    default:
      return {}
  }
}

/**
 * Get severity badge style
 */
function getSeverityBadgeStyle(severity: Severity | null | undefined) {
  switch (severity) {
    case 'critical':
      return styles.severityCritical
    case 'high':
      return styles.severityHigh
    case 'medium':
      return styles.severityMedium
    case 'low':
      return styles.severityLow
    case 'info':
      return styles.severityInfo
    default:
      return {}
  }
}

/**
 * Format engine name for display
 */
function formatEngineName(engine: Engine): string {
  const labels: Record<Engine, string> = {
    entity_resolution: 'Entity Resolution',
    temporal_parser: 'Temporal Analysis',
    argumentation: 'Argumentation Analysis',
    bias_detection: 'Bias Detection',
    contradiction: 'Contradiction Detection',
    accountability: 'Accountability Analysis',
    professional_tracker: 'Professional Tracker',
    omission: 'Omission Detection',
    expert_witness: 'Expert Witness Analysis',
    documentary: 'Documentary Analysis',
    narrative: 'Narrative Analysis',
    coordination: 'Coordination Analysis',
    evidence_chain: 'Evidence Chain Analysis',
  }
  return labels[engine] || engine
}

/**
 * Truncate text to specified length
 */
function truncateText(text: string | null | undefined, maxLength: number): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

// ============================================
// PDF COMPONENTS
// ============================================

/**
 * Page header component
 */
function PageHeader({ title, caseRef }: { title: string; caseRef: string }) {
  return (
    <View style={styles.header} fixed>
      <Text style={styles.headerText}>{title}</Text>
      <Text style={styles.headerText}>Case Ref: {caseRef}</Text>
    </View>
  )
}

/**
 * Page footer with page numbers
 */
function PageFooter({ generatedAt }: { generatedAt: string }) {
  return (
    <View style={styles.footer} fixed>
      <Text style={styles.footerText}>Generated: {generatedAt}</Text>
      <Text
        style={styles.pageNumber}
        render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
      />
    </View>
  )
}

/**
 * Cover page component
 */
function CoverPage({
  summary,
  options,
}: {
  summary: ExportSummary
  options: ExportOptions
}) {
  const title = options.customTitle || 'Evidence Export Package'
  const subtitle = options.customSubtitle || summary.caseName

  return (
    <Page size="A4" style={styles.page}>
      <View style={styles.coverPage}>
        <Text style={styles.coverTitle}>{title}</Text>
        <Text style={styles.coverSubtitle}>{subtitle}</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.documentCount}</Text>
            <Text style={styles.statLabel}>Documents</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.findingCount}</Text>
            <Text style={styles.statLabel}>Findings</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{summary.contradictionCount}</Text>
            <Text style={styles.statLabel}>Contradictions</Text>
          </View>
        </View>

        <View style={styles.coverMeta}>
          <Text style={styles.coverMetaText}>
            Case Reference: {summary.caseReference}
          </Text>
          <Text style={styles.coverMetaText}>
            Generated: {new Date(summary.generatedAt).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          {options.authorName && (
            <Text style={styles.coverMetaText}>
              Prepared by: {options.authorName}
            </Text>
          )}
          <Text style={styles.coverMetaText}>
            Entities Identified: {summary.entityCount}
          </Text>
        </View>
      </View>
    </Page>
  )
}

/**
 * Executive summary section
 */
function ExecutiveSummary({ summary }: { summary: ExportSummary }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <Text style={styles.paragraph}>
        This evidence export package contains analysis of {summary.documentCount}{' '}
        documents related to case &quot;{summary.caseName}&quot; (Reference: {summary.caseReference}).
        The analysis identified {summary.findingCount} findings across multiple
        analysis engines, {summary.contradictionCount} contradictions between sources,
        and {summary.entityCount} distinct entities.
      </Text>

      <Text style={styles.subsectionTitle}>Findings by Severity</Text>
      <View style={styles.statsGrid}>
        {(['critical', 'high', 'medium', 'low'] as Severity[]).map((severity) => (
          <View key={severity} style={styles.statBox}>
            <Text style={styles.statValue}>
              {summary.findingsBySeverity[severity] || 0}
            </Text>
            <Text style={styles.statLabel}>{severity.toUpperCase()}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}

/**
 * Single finding card component
 */
function FindingCard({ exportFinding }: { exportFinding: ExportFinding }) {
  const { finding, citations, quotes } = exportFinding

  return (
    <View style={[styles.findingCard, getSeverityStyle(finding.severity)]}>
      <View style={styles.findingHeader}>
        <Text style={styles.findingTitle}>{finding.title}</Text>
        {finding.severity && (
          <Text style={[styles.findingBadge, getSeverityBadgeStyle(finding.severity)]}>
            {finding.severity}
          </Text>
        )}
      </View>

      {finding.description && (
        <Text style={styles.findingDescription}>
          {truncateText(finding.description, 500)}
        </Text>
      )}

      <View style={styles.findingMeta}>
        <Text style={styles.findingMetaItem}>
          Engine: {formatEngineName(finding.engine)}
        </Text>
        {finding.confidence !== null && finding.confidence !== undefined && (
          <Text style={styles.findingMetaItem}>
            Confidence: {Math.round(finding.confidence * 100)}%
          </Text>
        )}
        <Text style={styles.findingMetaItem}>ID: {finding.id}</Text>
      </View>

      {quotes.length > 0 && (
        <View style={styles.quoteBlock}>
          <Text style={styles.label}>Supporting Evidence</Text>
          {quotes.slice(0, 2).map((quote, idx) => (
            <View key={idx}>
              <Text style={styles.quoteText}>
                &quot;{truncateText(quote.text, 200)}&quot;
              </Text>
              <Text style={styles.quoteCitation}>{quote.citation.formatted}</Text>
            </View>
          ))}
        </View>
      )}

      {citations.length > 0 && (
        <View style={{ marginTop: 6 }}>
          <Text style={styles.label}>Citations</Text>
          {citations.slice(0, 3).map((citation, idx) => (
            <Text key={idx} style={styles.citationText}>
              [{idx + 1}] {citation.formatted}
            </Text>
          ))}
        </View>
      )}
    </View>
  )
}

/**
 * Findings section
 */
function FindingsSection({ findings }: { findings: ExportFinding[] }) {
  if (findings.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Findings</Text>
        <Text style={styles.paragraph}>No findings available to export.</Text>
      </View>
    )
  }

  // Group findings by severity
  const grouped = findings.reduce(
    (acc, finding) => {
      const severity = finding.finding.severity || 'info'
      if (!acc[severity]) acc[severity] = []
      acc[severity].push(finding)
      return acc
    },
    {} as Record<string, ExportFinding[]>
  )

  const severityOrder: Severity[] = ['critical', 'high', 'medium', 'low', 'info']

  return (
    <View>
      <Text style={styles.sectionTitle}>Findings</Text>
      <Text style={styles.paragraph}>
        The following findings were identified through automated analysis.
        Findings are grouped by severity level.
      </Text>

      {severityOrder.map((severity) => {
        const severityFindings = grouped[severity]
        if (!severityFindings || severityFindings.length === 0) return null

        return (
          <View key={severity}>
            <Text style={styles.subsectionTitle}>
              {severity.charAt(0).toUpperCase() + severity.slice(1)} Severity ({severityFindings.length})
            </Text>
            {severityFindings.map((exportFinding) => (
              <FindingCard key={exportFinding.finding.id} exportFinding={exportFinding} />
            ))}
          </View>
        )
      })}
    </View>
  )
}

/**
 * Contradictions table section
 */
function ContradictionsSection({
  contradictions,
}: {
  contradictions: ExportContradiction[]
}) {
  if (contradictions.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Contradictions</Text>
        <Text style={styles.paragraph}>No contradictions detected.</Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Contradictions</Text>
      <Text style={styles.paragraph}>
        The following contradictions were detected between sources. Each entry
        shows conflicting statements from different documents or entities.
      </Text>

      <View style={styles.table}>
        <View style={styles.tableHeader}>
          <Text style={[styles.tableHeaderCell, styles.tableCellTitle]}>Title</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCellSource]}>Source A</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCellSource]}>Source B</Text>
          <Text style={[styles.tableHeaderCell, styles.tableCellSeverity]}>Severity</Text>
        </View>

        {contradictions.map((item, idx) => (
          <View
            key={item.contradiction.id}
            style={[styles.tableRow, idx % 2 === 1 ? styles.tableRowAlt : {}]}
          >
            <View style={styles.tableCellTitle}>
              <Text style={styles.tableCell}>
                {truncateText(item.contradiction.title, 50)}
              </Text>
            </View>
            <View style={styles.tableCellSource}>
              <Text style={styles.tableCell}>
                {truncateText(item.sourceACitation.documentName, 40)}
              </Text>
              <Text style={[styles.tableCell, { fontSize: 8, color: colors.textMuted }]}>
                {truncateText(item.contradiction.source_a_text, 60)}
              </Text>
            </View>
            <View style={styles.tableCellSource}>
              <Text style={styles.tableCell}>
                {truncateText(item.sourceBCitation.documentName, 40)}
              </Text>
              <Text style={[styles.tableCell, { fontSize: 8, color: colors.textMuted }]}>
                {truncateText(item.contradiction.source_b_text, 60)}
              </Text>
            </View>
            <View style={styles.tableCellSeverity}>
              <Text
                style={[
                  styles.findingBadge,
                  getSeverityBadgeStyle(item.contradiction.severity),
                  { fontSize: 7 },
                ]}
              >
                {item.contradiction.severity || 'N/A'}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Contradiction Details</Text>
      {contradictions.slice(0, 10).map((item) => (
        <View key={item.contradiction.id} style={styles.findingCard}>
          <Text style={styles.findingTitle}>{item.contradiction.title}</Text>
          {item.contradiction.description && (
            <Text style={styles.findingDescription}>
              {item.contradiction.description}
            </Text>
          )}

          <View style={{ flexDirection: 'row', marginTop: 8 }}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={styles.label}>Source A</Text>
              <View style={styles.quoteBlock}>
                <Text style={styles.quoteText}>
                  &quot;{truncateText(item.contradiction.source_a_text, 150)}&quot;
                </Text>
                <Text style={styles.quoteCitation}>
                  {item.sourceACitation.formatted}
                </Text>
              </View>
            </View>
            <View style={{ flex: 1, paddingLeft: 8 }}>
              <Text style={styles.label}>Source B</Text>
              <View style={styles.quoteBlock}>
                <Text style={styles.quoteText}>
                  &quot;{truncateText(item.contradiction.source_b_text, 150)}&quot;
                </Text>
                <Text style={styles.quoteCitation}>
                  {item.sourceBCitation.formatted}
                </Text>
              </View>
            </View>
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Entities section
 */
function EntitiesSection({ entities }: { entities: ExportEntity[] }) {
  if (entities.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Entity Reference</Text>
        <Text style={styles.paragraph}>No entities identified.</Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Entity Reference</Text>
      <Text style={styles.paragraph}>
        The following entities were identified across the analyzed documents.
        Entity mentions are tracked with document references.
      </Text>

      {entities.map((exportEntity) => (
        <View key={exportEntity.entity.id} style={styles.entityCard}>
          <Text style={styles.entityName}>{exportEntity.entity.canonical_name}</Text>
          <Text style={styles.entityType}>{exportEntity.entity.entity_type}</Text>

          {exportEntity.entity.role && (
            <Text style={styles.entityRole}>Role: {exportEntity.entity.role}</Text>
          )}

          {exportEntity.entity.institution && (
            <Text style={styles.entityRole}>
              Institution: {exportEntity.entity.institution}
            </Text>
          )}

          {exportEntity.documentReferences.length > 0 && (
            <View style={{ marginTop: 6 }}>
              <Text style={styles.label}>Document References</Text>
              {exportEntity.documentReferences.slice(0, 5).map((ref, idx) => (
                <Text key={idx} style={styles.findingMetaItem}>
                  - {ref.document.filename} ({ref.mentionCount} mentions)
                </Text>
              ))}
            </View>
          )}

          {exportEntity.relatedFindings.length > 0 && (
            <Text style={styles.findingMetaItem}>
              Related Findings: {exportEntity.relatedFindings.length}
            </Text>
          )}
        </View>
      ))}
    </View>
  )
}

/**
 * Audit trail section
 */
function AuditTrailSection({ auditTrails }: { auditTrails: AuditTrail[] }) {
  if (auditTrails.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Audit Trail</Text>
        <Text style={styles.paragraph}>No audit trails available.</Text>
      </View>
    )
  }

  return (
    <View>
      <Text style={styles.sectionTitle}>Audit Trail</Text>
      <Text style={styles.paragraph}>
        The audit trail documents the analytical reasoning process from source
        documents to conclusions. Each finding includes a chain of reasoning
        showing evidence extraction, analysis, and conclusion steps.
      </Text>

      {auditTrails.slice(0, 10).map((trail) => (
        <View key={trail.findingId} style={{ marginBottom: 16 }}>
          <Text style={styles.subsectionTitle}>Finding: {trail.findingId}</Text>
          <Text style={styles.paragraph}>{trail.summary}</Text>
          <Text style={styles.findingMetaItem}>
            Overall Confidence: {Math.round(trail.overallConfidence * 100)}%
          </Text>

          <View style={{ marginTop: 8 }}>
            <Text style={styles.label}>Reasoning Chain</Text>
            {trail.steps.map((step, idx) => (
              <View key={step.id} style={styles.auditTrailStep}>
                <Text style={styles.auditStepType}>
                  {idx + 1}. {step.stepType.replace(/_/g, ' ')}
                </Text>
                <Text style={styles.auditStepDescription}>{step.description}</Text>
                {step.confidence !== null && (
                  <Text style={styles.auditStepMeta}>
                    Confidence: {Math.round(step.confidence * 100)}%
                  </Text>
                )}
              </View>
            ))}
          </View>
        </View>
      ))}
    </View>
  )
}

/**
 * Citations and references section
 */
function CitationsSection({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) {
    return (
      <View>
        <Text style={styles.sectionTitle}>Citations &amp; References</Text>
        <Text style={styles.paragraph}>No citations available.</Text>
      </View>
    )
  }

  // Deduplicate citations by documentId
  const uniqueCitations = Array.from(
    new Map(citations.map((c) => [c.documentId, c])).values()
  )

  return (
    <View>
      <Text style={styles.sectionTitle}>Citations &amp; References</Text>
      <Text style={styles.paragraph}>
        The following documents were cited in this analysis. Citations follow
        Bluebook legal citation format.
      </Text>

      {uniqueCitations.map((citation, idx) => (
        <View key={citation.documentId} style={styles.citationItem}>
          <Text style={styles.citationNumber}>[{idx + 1}]</Text>
          <Text style={styles.citationText}>{citation.formatted}</Text>
        </View>
      ))}
    </View>
  )
}

/**
 * Methodology section
 */
function MethodologySection({ methodology }: { methodology: MethodologyStatement }) {
  return (
    <View>
      <Text style={styles.sectionTitle}>Methodology</Text>

      <View style={styles.methodologySection}>
        <Text style={styles.paragraph}>{methodology.introduction}</Text>
      </View>

      <Text style={styles.subsectionTitle}>Data Sources</Text>
      <View style={styles.bulletList}>
        {methodology.dataSources.map((source, idx) => (
          <View key={idx} style={styles.bulletItem}>
            <Text style={styles.bullet}>-</Text>
            <Text style={styles.bulletText}>
              <Text style={{ fontWeight: 'bold' }}>{source.sourceType}:</Text>{' '}
              {source.description} ({source.documentCount} documents)
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Analysis Methods</Text>
      <View style={styles.bulletList}>
        {methodology.analysisMethods.map((method, idx) => (
          <View key={idx} style={styles.bulletItem}>
            <Text style={styles.bullet}>-</Text>
            <Text style={styles.bulletText}>
              <Text style={{ fontWeight: 'bold' }}>{method.displayName}:</Text>{' '}
              {method.description}
            </Text>
          </View>
        ))}
      </View>

      <Text style={styles.subsectionTitle}>Confidence Levels</Text>
      <Text style={styles.paragraph}>{methodology.confidenceExplanation}</Text>

      {methodology.limitations.length > 0 && (
        <>
          <Text style={styles.subsectionTitle}>Limitations</Text>
          <View style={styles.bulletList}>
            {methodology.limitations.map((limitation, idx) => (
              <View key={idx} style={styles.bulletItem}>
                <Text style={styles.bullet}>-</Text>
                <Text style={styles.bulletText}>{limitation}</Text>
              </View>
            ))}
          </View>
        </>
      )}

      <View style={{ marginTop: 12 }}>
        <Text style={styles.findingMetaItem}>
          Methodology Version: {methodology.version}
        </Text>
        <Text style={styles.findingMetaItem}>
          Last Updated: {new Date(methodology.lastUpdated).toLocaleDateString()}
        </Text>
      </View>
    </View>
  )
}

// ============================================
// MAIN PDF DOCUMENT
// ============================================

/**
 * Main PDF document component
 */
export function EvidenceExportPDF({
  data,
  options = DEFAULT_EXPORT_OPTIONS,
}: {
  data: ExportData
  options?: ExportOptions
}) {
  const sectionEnabled = (sectionId: string) => {
    const section = options.sections.find((s) => s.id === sectionId)
    return section ? section.included : true
  }

  const generatedAt = new Date(data.summary.generatedAt).toLocaleDateString('en-GB')

  // Collect all citations from findings
  const allCitations = data.findings.flatMap((f) => f.citations)

  return (
    <Document
      title={options.customTitle || 'Evidence Export Package'}
      author={options.authorName || 'Apatheia Labs'}
      subject={`Case: ${data.summary.caseReference}`}
      creator="Apatheia Labs Evidence Export System"
    >
      {/* Cover Page */}
      {sectionEnabled('cover') && (
        <CoverPage summary={data.summary} options={options} />
      )}

      {/* Content Pages */}
      <Page size="A4" style={styles.page}>
        {options.includePageNumbers && (
          <>
            <PageHeader
              title={options.customTitle || 'Evidence Export'}
              caseRef={data.summary.caseReference}
            />
            <PageFooter generatedAt={generatedAt} />
          </>
        )}

        {/* Executive Summary */}
        {sectionEnabled('summary') && <ExecutiveSummary summary={data.summary} />}

        {/* Methodology */}
        {sectionEnabled('methodology') && options.includeMethodology && (
          <MethodologySection methodology={data.methodology} />
        )}

        {/* Findings */}
        {sectionEnabled('findings') && (
          <FindingsSection findings={data.findings} />
        )}

        {/* Contradictions */}
        {sectionEnabled('contradictions') && (
          <ContradictionsSection contradictions={data.contradictions} />
        )}

        {/* Entities */}
        {sectionEnabled('entities') && (
          <EntitiesSection entities={data.entities} />
        )}

        {/* Audit Trail */}
        {sectionEnabled('auditTrail') && options.includeAuditTrails && (
          <AuditTrailSection auditTrails={data.auditTrails} />
        )}

        {/* Citations */}
        {sectionEnabled('citations') && (
          <CitationsSection citations={allCitations} />
        )}

        {/* Timestamp watermark */}
        {options.includeTimestamp && (
          <View style={{ marginTop: 24, borderTopWidth: 1, borderTopColor: colors.border, paddingTop: 12 }}>
            <Text style={styles.footerText}>
              This document was generated automatically by Apatheia Labs Evidence Export System
              on {new Date(data.summary.generatedAt).toISOString()}.
            </Text>
          </View>
        )}
      </Page>
    </Document>
  )
}

// ============================================
// PDF GENERATION FUNCTION
// ============================================

/**
 * Generate a PDF blob from export data.
 *
 * @param data - The export data package
 * @param options - Export options
 * @returns Promise resolving to PDF Blob
 */
export async function generatePDFBlob(
  data: ExportData,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<Blob> {
  const document = <EvidenceExportPDF data={data} options={options} />
  const blob = await pdf(document).toBlob()
  return blob
}

/**
 * Generate a PDF buffer from export data (for server-side use).
 *
 * @param data - The export data package
 * @param options - Export options
 * @returns Promise resolving to PDF buffer as Uint8Array
 */
export async function generatePDFBuffer(
  data: ExportData,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<Uint8Array> {
  const document = <EvidenceExportPDF data={data} options={options} />
  const blob = await pdf(document).toBlob()
  const arrayBuffer = await blob.arrayBuffer()
  return new Uint8Array(arrayBuffer)
}
