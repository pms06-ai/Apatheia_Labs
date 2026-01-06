/**
 * DOCX Export Generator
 *
 * Generates legally-defensible Word documents using the docx library.
 * Includes cover page, findings, contradictions, entities, citations,
 * audit trail, and methodology sections.
 *
 * Based on patterns from pdf-generator.tsx and export type definitions.
 */

import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  Table,
  TableRow,
  TableCell,
  WidthType,
  AlignmentType,
  HeadingLevel,
  BorderStyle,
  ShadingType,
  PageBreak,
  Header,
  Footer,
  PageNumber,
  convertInchesToTwip,
  TableOfContents,
  StyleLevel,
} from 'docx'
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
import type {
  Severity,
  Engine,
  Case,
  Document as CaseDocument,
  Entity,
  Finding,
  Contradiction,
  Omission,
} from '@/CONTRACT'
import { getDataLayer } from '@/lib/data'
import {
  formatCitation,
  formatQuote,
  createPlaceholderCitation,
  CitationTracker,
} from '@/lib/export/citation-formatter'
import {
  generateAuditTrail,
  createAuditTrailContext,
} from '@/lib/export/audit-trail'

// ============================================
// STYLE CONSTANTS
// ============================================

const colors = {
  primary: '1a1a2e',
  secondary: '2d3748',
  accent: 'b8860b',
  text: '1a202c',
  textSecondary: '4a5568',
  textMuted: '718096',
  border: 'e2e8f0',
  critical: 'dc2626',
  high: 'ea580c',
  medium: 'ca8a04',
  low: '16a34a',
  info: '2563eb',
  background: 'ffffff',
  backgroundAlt: 'f8fafc',
}

const fontSizes = {
  title: 56, // 28pt * 2 (half-points)
  subtitle: 32, // 16pt * 2
  heading1: 36, // 18pt * 2
  heading2: 28, // 14pt * 2
  body: 22, // 11pt * 2
  small: 20, // 10pt * 2
  footnote: 18, // 9pt * 2
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Get severity color for styling
 */
function getSeverityColor(severity: Severity | null | undefined): string {
  switch (severity) {
    case 'critical':
      return colors.critical
    case 'high':
      return colors.high
    case 'medium':
      return colors.medium
    case 'low':
      return colors.low
    case 'info':
      return colors.info
    default:
      return colors.textMuted
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
function truncateText(
  text: string | null | undefined,
  maxLength: number
): string {
  if (!text) return ''
  if (text.length <= maxLength) return text
  return text.substring(0, maxLength - 3) + '...'
}

/**
 * Format date for display
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString)
  return date.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

/**
 * Create a styled heading paragraph
 */
function createHeading(
  text: string,
  level: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_1
): Paragraph {
  return new Paragraph({
    text,
    heading: level,
    spacing: { before: 400, after: 200 },
  })
}

/**
 * Create a styled body paragraph
 */
function createBodyParagraph(text: string, options: {
  bold?: boolean
  italic?: boolean
  color?: string
  size?: number
  spacing?: { before?: number; after?: number }
} = {}): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        bold: options.bold,
        italics: options.italic,
        color: options.color || colors.text,
        size: options.size || fontSizes.body,
      }),
    ],
    spacing: options.spacing || { before: 120, after: 120 },
  })
}

/**
 * Create a bullet list item
 */
function createBulletItem(text: string, level: number = 0): Paragraph {
  return new Paragraph({
    children: [
      new TextRun({
        text,
        size: fontSizes.body,
        color: colors.text,
      }),
    ],
    bullet: { level },
    spacing: { before: 60, after: 60 },
  })
}

/**
 * Create a quote block paragraph
 */
function createQuoteBlock(
  quoteText: string,
  citation: string
): Paragraph[] {
  return [
    new Paragraph({
      children: [
        new TextRun({
          text: `"${truncateText(quoteText, 300)}"`,
          italics: true,
          size: fontSizes.small,
          color: colors.textSecondary,
        }),
      ],
      indent: { left: convertInchesToTwip(0.5) },
      border: {
        left: {
          color: colors.accent,
          space: 10,
          size: 24,
          style: BorderStyle.SINGLE,
        },
      },
      spacing: { before: 120, after: 60 },
    }),
    new Paragraph({
      children: [
        new TextRun({
          text: `— ${citation}`,
          size: fontSizes.footnote,
          color: colors.textMuted,
        }),
      ],
      indent: { left: convertInchesToTwip(0.5) },
      spacing: { before: 0, after: 120 },
    }),
  ]
}

// ============================================
// DOCUMENT SECTIONS
// ============================================

/**
 * Create cover page content
 */
function createCoverPage(
  summary: ExportSummary,
  options: ExportOptions
): Paragraph[] {
  const title = options.customTitle || 'Evidence Export Package'
  const subtitle = options.customSubtitle || summary.caseName

  const paragraphs: Paragraph[] = [
    // Spacer
    new Paragraph({ children: [], spacing: { before: 2000 } }),

    // Title
    new Paragraph({
      children: [
        new TextRun({
          text: title,
          bold: true,
          size: fontSizes.title,
          color: colors.primary,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 300 },
    }),

    // Subtitle
    new Paragraph({
      children: [
        new TextRun({
          text: subtitle,
          size: fontSizes.subtitle,
          color: colors.textSecondary,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 800 },
    }),

    // Statistics
    new Paragraph({
      children: [
        new TextRun({
          text: `${summary.documentCount} Documents  |  ${summary.findingCount} Findings  |  ${summary.contradictionCount} Contradictions`,
          size: fontSizes.body,
          color: colors.textMuted,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 1600 },
    }),

    // Case reference
    new Paragraph({
      children: [
        new TextRun({
          text: `Case Reference: ${summary.caseReference}`,
          size: fontSizes.body,
          color: colors.textMuted,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),

    // Generated date
    new Paragraph({
      children: [
        new TextRun({
          text: `Generated: ${formatDate(summary.generatedAt)}`,
          size: fontSizes.body,
          color: colors.textMuted,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 100 },
    }),
  ]

  // Author name if provided
  if (options.authorName) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `Prepared by: ${options.authorName}`,
            size: fontSizes.body,
            color: colors.textMuted,
          }),
        ],
        alignment: AlignmentType.CENTER,
        spacing: { after: 100 },
      })
    )
  }

  // Entity count
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Entities Identified: ${summary.entityCount}`,
          size: fontSizes.body,
          color: colors.textMuted,
        }),
      ],
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    })
  )

  // Page break after cover
  paragraphs.push(new Paragraph({ children: [new PageBreak()] }))

  return paragraphs
}

/**
 * Create executive summary section
 */
function createExecutiveSummary(summary: ExportSummary): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('Executive Summary', HeadingLevel.HEADING_1),

    createBodyParagraph(
      `This evidence export package contains analysis of ${summary.documentCount} ` +
        `documents related to case "${summary.caseName}" (Reference: ${summary.caseReference}). ` +
        `The analysis identified ${summary.findingCount} findings across multiple ` +
        `analysis engines, ${summary.contradictionCount} contradictions between sources, ` +
        `and ${summary.entityCount} distinct entities.`
    ),

    createHeading('Findings by Severity', HeadingLevel.HEADING_2),
  ]

  // Severity breakdown
  const severities: Severity[] = ['critical', 'high', 'medium', 'low', 'info']
  for (const severity of severities) {
    const count = summary.findingsBySeverity[severity] || 0
    if (count > 0) {
      paragraphs.push(
        createBulletItem(
          `${severity.charAt(0).toUpperCase() + severity.slice(1)}: ${count}`
        )
      )
    }
  }

  return paragraphs
}

/**
 * Create a single finding section
 */
function createFindingSection(exportFinding: ExportFinding): Paragraph[] {
  const { finding, citations, quotes } = exportFinding
  const paragraphs: Paragraph[] = []

  // Finding title with severity badge
  const severityText = finding.severity
    ? ` [${finding.severity.toUpperCase()}]`
    : ''

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: finding.title,
          bold: true,
          size: fontSizes.heading2,
          color: colors.primary,
        }),
        new TextRun({
          text: severityText,
          bold: true,
          size: fontSizes.small,
          color: getSeverityColor(finding.severity),
        }),
      ],
      spacing: { before: 300, after: 120 },
      border: {
        left: {
          color: getSeverityColor(finding.severity),
          space: 10,
          size: 24,
          style: BorderStyle.SINGLE,
        },
      },
      shading: {
        type: ShadingType.SOLID,
        color: colors.backgroundAlt,
      },
    })
  )

  // Description
  if (finding.description) {
    paragraphs.push(
      createBodyParagraph(truncateText(finding.description, 500), {
        color: colors.textSecondary,
        size: fontSizes.small,
      })
    )
  }

  // Metadata
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Engine: ${formatEngineName(finding.engine)}`,
          size: fontSizes.footnote,
          color: colors.textMuted,
        }),
        finding.confidence !== null && finding.confidence !== undefined
          ? new TextRun({
              text: `  |  Confidence: ${Math.round(finding.confidence * 100)}%`,
              size: fontSizes.footnote,
              color: colors.textMuted,
            })
          : new TextRun({ text: '' }),
        new TextRun({
          text: `  |  ID: ${finding.id}`,
          size: fontSizes.footnote,
          color: colors.textMuted,
        }),
      ],
      spacing: { before: 120, after: 120 },
    })
  )

  // Supporting quotes
  if (quotes.length > 0) {
    paragraphs.push(
      createBodyParagraph('Supporting Evidence:', {
        bold: true,
        size: fontSizes.small,
        color: colors.textMuted,
      })
    )

    for (const quote of quotes.slice(0, 2)) {
      paragraphs.push(...createQuoteBlock(quote.text, quote.citation.formatted))
    }
  }

  // Citations
  if (citations.length > 0) {
    paragraphs.push(
      createBodyParagraph('Citations:', {
        bold: true,
        size: fontSizes.small,
        color: colors.textMuted,
      })
    )

    citations.slice(0, 3).forEach((citation, idx) => {
      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `[${idx + 1}] ${citation.formatted}`,
              size: fontSizes.small,
              color: colors.text,
            }),
          ],
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { before: 60, after: 60 },
        })
      )
    })
  }

  return paragraphs
}

/**
 * Create findings section
 */
function createFindingsSection(findings: ExportFinding[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('Findings', HeadingLevel.HEADING_1),
  ]

  if (findings.length === 0) {
    paragraphs.push(createBodyParagraph('No findings available to export.'))
    return paragraphs
  }

  paragraphs.push(
    createBodyParagraph(
      'The following findings were identified through automated analysis. ' +
        'Findings are grouped by severity level.'
    )
  )

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

  for (const severity of severityOrder) {
    const severityFindings = grouped[severity]
    if (!severityFindings || severityFindings.length === 0) continue

    paragraphs.push(
      createHeading(
        `${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity (${severityFindings.length})`,
        HeadingLevel.HEADING_2
      )
    )

    for (const exportFinding of severityFindings) {
      paragraphs.push(...createFindingSection(exportFinding))
    }
  }

  return paragraphs
}

/**
 * Create contradictions table
 */
function createContradictionsTable(
  contradictions: ExportContradiction[]
): Table {
  const headerCells = ['Title', 'Source A', 'Source B', 'Severity'].map(
    (text) =>
      new TableCell({
        children: [
          new Paragraph({
            children: [
              new TextRun({
                text,
                bold: true,
                size: fontSizes.small,
                color: colors.background,
              }),
            ],
            alignment: AlignmentType.CENTER,
          }),
        ],
        shading: { type: ShadingType.SOLID, color: colors.primary },
        width: { size: 25, type: WidthType.PERCENTAGE },
      })
  )

  const rows = [new TableRow({ children: headerCells })]

  for (const item of contradictions.slice(0, 20)) {
    const row = new TableRow({
      children: [
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: truncateText(item.contradiction.title, 40),
                  size: fontSizes.small,
                }),
              ],
            }),
          ],
          width: { size: 25, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: truncateText(item.sourceACitation.documentName, 30),
                  size: fontSizes.small,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: truncateText(item.contradiction.source_a_text, 50),
                  size: fontSizes.footnote,
                  color: colors.textMuted,
                  italics: true,
                }),
              ],
            }),
          ],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: truncateText(item.sourceBCitation.documentName, 30),
                  size: fontSizes.small,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: truncateText(item.contradiction.source_b_text, 50),
                  size: fontSizes.footnote,
                  color: colors.textMuted,
                  italics: true,
                }),
              ],
            }),
          ],
          width: { size: 30, type: WidthType.PERCENTAGE },
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: (item.contradiction.severity || 'N/A').toUpperCase(),
                  size: fontSizes.footnote,
                  bold: true,
                  color: getSeverityColor(item.contradiction.severity),
                }),
              ],
              alignment: AlignmentType.CENTER,
            }),
          ],
          width: { size: 15, type: WidthType.PERCENTAGE },
        }),
      ],
    })
    rows.push(row)
  }

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
  })
}

/**
 * Create contradictions section
 */
function createContradictionsSection(
  contradictions: ExportContradiction[]
): (Paragraph | Table)[] {
  const elements: (Paragraph | Table)[] = [
    createHeading('Contradictions', HeadingLevel.HEADING_1),
  ]

  if (contradictions.length === 0) {
    elements.push(createBodyParagraph('No contradictions detected.'))
    return elements
  }

  elements.push(
    createBodyParagraph(
      'The following contradictions were detected between sources. Each entry ' +
        'shows conflicting statements from different documents or entities.'
    )
  )

  elements.push(createContradictionsTable(contradictions))

  // Detailed contradiction breakdowns
  elements.push(createHeading('Contradiction Details', HeadingLevel.HEADING_2))

  for (const item of contradictions.slice(0, 10)) {
    elements.push(
      new Paragraph({
        children: [
          new TextRun({
            text: item.contradiction.title,
            bold: true,
            size: fontSizes.heading2,
            color: colors.primary,
          }),
        ],
        spacing: { before: 300, after: 120 },
      })
    )

    if (item.contradiction.description) {
      elements.push(
        createBodyParagraph(item.contradiction.description, {
          color: colors.textSecondary,
        })
      )
    }

    // Source A
    elements.push(
      createBodyParagraph('Source A:', {
        bold: true,
        size: fontSizes.small,
        color: colors.textMuted,
      })
    )
    elements.push(
      ...createQuoteBlock(
        item.contradiction.source_a_text,
        item.sourceACitation.formatted
      )
    )

    // Source B
    elements.push(
      createBodyParagraph('Source B:', {
        bold: true,
        size: fontSizes.small,
        color: colors.textMuted,
      })
    )
    elements.push(
      ...createQuoteBlock(
        item.contradiction.source_b_text,
        item.sourceBCitation.formatted
      )
    )
  }

  return elements
}

/**
 * Create entities section
 */
function createEntitiesSection(entities: ExportEntity[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('Entity Reference', HeadingLevel.HEADING_1),
  ]

  if (entities.length === 0) {
    paragraphs.push(createBodyParagraph('No entities identified.'))
    return paragraphs
  }

  paragraphs.push(
    createBodyParagraph(
      'The following entities were identified across the analyzed documents. ' +
        'Entity mentions are tracked with document references.'
    )
  )

  for (const exportEntity of entities) {
    // Entity name
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exportEntity.entity.canonical_name,
            bold: true,
            size: fontSizes.heading2,
            color: colors.primary,
          }),
        ],
        spacing: { before: 240, after: 60 },
      })
    )

    // Entity type
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: exportEntity.entity.entity_type.toUpperCase(),
            size: fontSizes.footnote,
            color: colors.textMuted,
          }),
        ],
        spacing: { before: 0, after: 60 },
      })
    )

    // Role
    if (exportEntity.entity.role) {
      paragraphs.push(
        createBodyParagraph(`Role: ${exportEntity.entity.role}`, {
          size: fontSizes.small,
          color: colors.textSecondary,
        })
      )
    }

    // Institution
    if (exportEntity.entity.institution) {
      paragraphs.push(
        createBodyParagraph(`Institution: ${exportEntity.entity.institution}`, {
          size: fontSizes.small,
          color: colors.textSecondary,
        })
      )
    }

    // Document references
    if (exportEntity.documentReferences.length > 0) {
      paragraphs.push(
        createBodyParagraph('Document References:', {
          bold: true,
          size: fontSizes.small,
          color: colors.textMuted,
        })
      )

      for (const ref of exportEntity.documentReferences.slice(0, 5)) {
        paragraphs.push(
          createBulletItem(
            `${ref.document.filename} (${ref.mentionCount} mentions)`
          )
        )
      }
    }

    // Related findings count
    if (exportEntity.relatedFindings.length > 0) {
      paragraphs.push(
        createBodyParagraph(
          `Related Findings: ${exportEntity.relatedFindings.length}`,
          {
            size: fontSizes.footnote,
            color: colors.textMuted,
          }
        )
      )
    }
  }

  return paragraphs
}

/**
 * Create audit trail section
 */
function createAuditTrailSection(auditTrails: AuditTrail[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('Audit Trail', HeadingLevel.HEADING_1),
  ]

  if (auditTrails.length === 0) {
    paragraphs.push(createBodyParagraph('No audit trails available.'))
    return paragraphs
  }

  paragraphs.push(
    createBodyParagraph(
      'The audit trail documents the analytical reasoning process from source ' +
        'documents to conclusions. Each finding includes a chain of reasoning ' +
        'showing evidence extraction, analysis, and conclusion steps.'
    )
  )

  for (const trail of auditTrails.slice(0, 10)) {
    paragraphs.push(
      createHeading(`Finding: ${trail.findingId}`, HeadingLevel.HEADING_2)
    )

    paragraphs.push(createBodyParagraph(trail.summary))

    paragraphs.push(
      createBodyParagraph(
        `Overall Confidence: ${Math.round(trail.overallConfidence * 100)}%`,
        {
          size: fontSizes.footnote,
          color: colors.textMuted,
        }
      )
    )

    paragraphs.push(
      createBodyParagraph('Reasoning Chain:', {
        bold: true,
        size: fontSizes.small,
        color: colors.textMuted,
      })
    )

    for (let idx = 0; idx < trail.steps.length; idx++) {
      const step = trail.steps[idx]
      const stepLabel = step.stepType.replace(/_/g, ' ').toUpperCase()

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: `${idx + 1}. ${stepLabel}`,
              bold: true,
              size: fontSizes.small,
              color: colors.accent,
            }),
          ],
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { before: 120, after: 60 },
        })
      )

      paragraphs.push(
        new Paragraph({
          children: [
            new TextRun({
              text: step.description,
              size: fontSizes.small,
              color: colors.text,
            }),
          ],
          indent: { left: convertInchesToTwip(0.25) },
          spacing: { before: 0, after: 60 },
        })
      )

      if (step.confidence !== null) {
        paragraphs.push(
          new Paragraph({
            children: [
              new TextRun({
                text: `Confidence: ${Math.round(step.confidence * 100)}%`,
                size: fontSizes.footnote,
                color: colors.textMuted,
              }),
            ],
            indent: { left: convertInchesToTwip(0.25) },
            spacing: { before: 0, after: 60 },
          })
        )
      }
    }
  }

  return paragraphs
}

/**
 * Create citations section
 */
function createCitationsSection(citations: Citation[]): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('Citations & References', HeadingLevel.HEADING_1),
  ]

  if (citations.length === 0) {
    paragraphs.push(createBodyParagraph('No citations available.'))
    return paragraphs
  }

  paragraphs.push(
    createBodyParagraph(
      'The following documents were cited in this analysis. Citations follow ' +
        'Bluebook legal citation format.'
    )
  )

  // Deduplicate citations by documentId
  const uniqueCitations = Array.from(
    new Map(citations.map((c) => [c.documentId, c])).values()
  )

  uniqueCitations.forEach((citation, idx) => {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `[${idx + 1}] `,
            size: fontSizes.small,
            color: colors.textMuted,
          }),
          new TextRun({
            text: citation.formatted,
            size: fontSizes.small,
            color: colors.text,
          }),
        ],
        indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) },
        spacing: { before: 60, after: 60 },
      })
    )
  })

  return paragraphs
}

/**
 * Create methodology section
 */
function createMethodologySection(
  methodology: MethodologyStatement
): Paragraph[] {
  const paragraphs: Paragraph[] = [
    createHeading('Methodology', HeadingLevel.HEADING_1),
    createBodyParagraph(methodology.introduction),
  ]

  // Data Sources
  paragraphs.push(createHeading('Data Sources', HeadingLevel.HEADING_2))

  for (const source of methodology.dataSources) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${source.sourceType}: `,
            bold: true,
            size: fontSizes.body,
          }),
          new TextRun({
            text: `${source.description} (${source.documentCount} documents)`,
            size: fontSizes.body,
          }),
        ],
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
      })
    )
  }

  // Analysis Methods
  paragraphs.push(createHeading('Analysis Methods', HeadingLevel.HEADING_2))

  for (const method of methodology.analysisMethods) {
    paragraphs.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `${method.displayName}: `,
            bold: true,
            size: fontSizes.body,
          }),
          new TextRun({
            text: method.description,
            size: fontSizes.body,
          }),
        ],
        bullet: { level: 0 },
        spacing: { before: 60, after: 60 },
      })
    )
  }

  // Confidence Explanation
  paragraphs.push(createHeading('Confidence Levels', HeadingLevel.HEADING_2))
  paragraphs.push(createBodyParagraph(methodology.confidenceExplanation))

  // Limitations
  if (methodology.limitations.length > 0) {
    paragraphs.push(createHeading('Limitations', HeadingLevel.HEADING_2))

    for (const limitation of methodology.limitations) {
      paragraphs.push(createBulletItem(limitation))
    }
  }

  // Version info
  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Methodology Version: ${methodology.version}`,
          size: fontSizes.footnote,
          color: colors.textMuted,
        }),
      ],
      spacing: { before: 240, after: 60 },
    })
  )

  paragraphs.push(
    new Paragraph({
      children: [
        new TextRun({
          text: `Last Updated: ${new Date(methodology.lastUpdated).toLocaleDateString()}`,
          size: fontSizes.footnote,
          color: colors.textMuted,
        }),
      ],
      spacing: { before: 0, after: 120 },
    })
  )

  return paragraphs
}

// ============================================
// MAIN DOCUMENT GENERATION
// ============================================

/**
 * Build a complete Word document from export data
 */
export function buildDOCXDocument(
  data: ExportData,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Document {
  const sectionEnabled = (sectionId: string) => {
    const section = options.sections.find((s) => s.id === sectionId)
    return section ? section.included : true
  }

  // Collect all content
  const children: (Paragraph | Table)[] = []

  // Cover page
  if (sectionEnabled('cover')) {
    children.push(...createCoverPage(data.summary, options))
  }

  // Table of contents (if enabled)
  if (options.includeTableOfContents) {
    children.push(
      createHeading('Table of Contents', HeadingLevel.HEADING_1),
      new TableOfContents('Table of Contents', {
        hyperlink: true,
        headingStyleRange: '1-3',
        stylesWithLevels: [
          new StyleLevel('Heading1', 1),
          new StyleLevel('Heading2', 2),
          new StyleLevel('Heading3', 3),
        ],
      }),
      new Paragraph({ children: [new PageBreak()] })
    )
  }

  // Executive Summary
  if (sectionEnabled('summary')) {
    children.push(...createExecutiveSummary(data.summary))
  }

  // Methodology
  if (sectionEnabled('methodology') && options.includeMethodology) {
    children.push(...createMethodologySection(data.methodology))
  }

  // Findings
  if (sectionEnabled('findings')) {
    children.push(...createFindingsSection(data.findings))
  }

  // Contradictions
  if (sectionEnabled('contradictions')) {
    children.push(...createContradictionsSection(data.contradictions))
  }

  // Entities
  if (sectionEnabled('entities')) {
    children.push(...createEntitiesSection(data.entities))
  }

  // Audit Trail
  if (sectionEnabled('auditTrail') && options.includeAuditTrails) {
    children.push(...createAuditTrailSection(data.auditTrails))
  }

  // Citations
  if (sectionEnabled('citations')) {
    const allCitations = data.findings.flatMap((f) => f.citations)
    children.push(...createCitationsSection(allCitations))
  }

  // Timestamp watermark
  if (options.includeTimestamp) {
    children.push(
      new Paragraph({
        children: [
          new TextRun({
            text: `This document was generated automatically by Apatheia Labs Evidence Export System on ${new Date(data.summary.generatedAt).toISOString()}.`,
            size: fontSizes.footnote,
            color: colors.textMuted,
          }),
        ],
        border: {
          top: {
            color: colors.border,
            space: 10,
            size: 6,
            style: BorderStyle.SINGLE,
          },
        },
        spacing: { before: 480, after: 120 },
      })
    )
  }

  // Build document
  const doc = new Document({
    title: options.customTitle || 'Evidence Export Package',
    creator: options.authorName || 'Apatheia Labs',
    subject: `Case: ${data.summary.caseReference}`,
    description: 'Apatheia Labs Evidence Export System',
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: convertInchesToTwip(1),
              right: convertInchesToTwip(1),
              bottom: convertInchesToTwip(1),
              left: convertInchesToTwip(1),
            },
          },
        },
        headers: options.includePageNumbers
          ? {
              default: new Header({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: options.customTitle || 'Evidence Export',
                        size: fontSizes.footnote,
                        color: colors.textMuted,
                      }),
                      new TextRun({
                        text: `\tCase Ref: ${data.summary.caseReference}`,
                        size: fontSizes.footnote,
                        color: colors.textMuted,
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
              }),
            }
          : undefined,
        footers: options.includePageNumbers
          ? {
              default: new Footer({
                children: [
                  new Paragraph({
                    children: [
                      new TextRun({
                        text: `Generated: ${formatDate(data.summary.generatedAt)}`,
                        size: fontSizes.footnote,
                        color: colors.textMuted,
                      }),
                      new TextRun({
                        text: '\t\tPage ',
                        size: fontSizes.footnote,
                        color: colors.textSecondary,
                      }),
                      new TextRun({
                        children: [PageNumber.CURRENT],
                        size: fontSizes.footnote,
                        color: colors.textSecondary,
                      }),
                      new TextRun({
                        text: ' of ',
                        size: fontSizes.footnote,
                        color: colors.textSecondary,
                      }),
                      new TextRun({
                        children: [PageNumber.TOTAL_PAGES],
                        size: fontSizes.footnote,
                        color: colors.textSecondary,
                      }),
                    ],
                    alignment: AlignmentType.LEFT,
                  }),
                ],
              }),
            }
          : undefined,
        children,
      },
    ],
  })

  return doc
}

// ============================================
// EXPORT FUNCTIONS
// ============================================

/**
 * Generate a DOCX Blob from export data.
 *
 * @param data - The export data package
 * @param options - Export options
 * @returns Promise resolving to DOCX Blob
 */
export async function generateDOCXBlob(
  data: ExportData,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<Blob> {
  const document = buildDOCXDocument(data, options)
  const buffer = await Packer.toBlob(document)
  return buffer
}

/**
 * Generate a DOCX buffer from export data (for server-side use).
 *
 * @param data - The export data package
 * @param options - Export options
 * @returns Promise resolving to DOCX buffer as Uint8Array
 */
export async function generateDOCXBuffer(
  data: ExportData,
  options: ExportOptions = DEFAULT_EXPORT_OPTIONS
): Promise<Uint8Array> {
  const document = buildDOCXDocument(data, options)
  const buffer = await Packer.toBuffer(document)
  return new Uint8Array(buffer)
}

// ============================================
// DATA FETCHING AND TRANSFORMATION
// ============================================

/**
 * Input options for generateDOCX function
 */
export interface GenerateDOCXInput {
  /** Case ID to export */
  caseId: string
  /** Export options (optional) */
  options?: Partial<ExportOptions>
}

/**
 * Result of generateDOCX function
 */
export interface GenerateDOCXResult {
  /** Whether export succeeded */
  success: boolean
  /** Generated DOCX blob */
  blob: Blob | null
  /** Generated filename */
  filename: string
  /** Error message if failed */
  error?: string
  /** Export data used (for debugging/inspection) */
  data?: ExportData
}

/**
 * Transform a Finding into an ExportFinding with citations and quotes.
 */
function transformFinding(
  finding: Finding,
  documentsMap: Map<string, CaseDocument>,
  entitiesMap: Map<string, Entity>,
  auditTrailContext: ReturnType<typeof createAuditTrailContext>,
  citationTracker: CitationTracker,
  includeAuditTrails: boolean
): ExportFinding {
  const citations: Citation[] = []
  const quotes: Array<{
    text: string
    documentId: string
    pageNumber: number | null
    citation: Citation
    truncated: boolean
  }> = []
  const relatedDocuments: CaseDocument[] = []
  const relatedEntities: Entity[] = []

  // Get related documents and create citations
  for (const docId of finding.document_ids || []) {
    const doc = documentsMap.get(docId)
    if (doc) {
      relatedDocuments.push(doc)
      const citation = formatCitation(doc, null)
      citations.push(citation)
    }
  }

  // Get related entities
  for (const entityId of finding.entity_ids || []) {
    const entity = entitiesMap.get(entityId)
    if (entity) {
      relatedEntities.push(entity)
    }
  }

  // Extract quotes from evidence
  if (finding.evidence && typeof finding.evidence === 'object') {
    const evidence = finding.evidence as Record<string, unknown>
    const evidenceQuotes = evidence.quotes as string[] | undefined

    if (Array.isArray(evidenceQuotes)) {
      const primaryDoc = relatedDocuments[0]
      const citation = primaryDoc
        ? formatCitation(primaryDoc, null)
        : createPlaceholderCitation('unknown', 'Source Document')

      for (const quoteText of evidenceQuotes) {
        if (typeof quoteText === 'string') {
          quotes.push(formatQuote(quoteText, citation))
        }
      }
    }
  }

  // Generate audit trail if enabled
  let auditTrail: AuditTrail | null = null
  if (includeAuditTrails) {
    auditTrail = generateAuditTrail(finding, auditTrailContext)
  }

  return {
    finding,
    citations,
    quotes,
    relatedEntities,
    relatedDocuments,
    auditTrail,
  }
}

/**
 * Transform a Contradiction into an ExportContradiction with citations.
 */
function transformContradiction(
  contradiction: Contradiction,
  documentsMap: Map<string, CaseDocument>,
  entitiesMap: Map<string, Entity>
): ExportContradiction {
  // Get source A document and citation
  const sourceADocument = contradiction.source_a_document_id
    ? documentsMap.get(contradiction.source_a_document_id) ?? null
    : null
  const sourceACitation = sourceADocument
    ? formatCitation(sourceADocument, contradiction.source_a_page)
    : createPlaceholderCitation(
        contradiction.source_a_document_id ?? 'unknown-a',
        'Source A'
      )

  // Get source B document and citation
  const sourceBDocument = contradiction.source_b_document_id
    ? documentsMap.get(contradiction.source_b_document_id) ?? null
    : null
  const sourceBCitation = sourceBDocument
    ? formatCitation(sourceBDocument, contradiction.source_b_page)
    : createPlaceholderCitation(
        contradiction.source_b_document_id ?? 'unknown-b',
        'Source B'
      )

  // Get entities
  const sourceAEntity = contradiction.source_a_entity_id
    ? entitiesMap.get(contradiction.source_a_entity_id) ?? null
    : null
  const sourceBEntity = contradiction.source_b_entity_id
    ? entitiesMap.get(contradiction.source_b_entity_id) ?? null
    : null

  // Create quotes
  const sourceAQuote = formatQuote(contradiction.source_a_text, sourceACitation, {
    pageNumber: contradiction.source_a_page,
  })
  const sourceBQuote = formatQuote(contradiction.source_b_text, sourceBCitation, {
    pageNumber: contradiction.source_b_page,
  })

  return {
    contradiction,
    sourceACitation,
    sourceBCitation,
    sourceAQuote,
    sourceBQuote,
    sourceAEntity,
    sourceBEntity,
    sourceADocument,
    sourceBDocument,
  }
}

/**
 * Transform an Entity into an ExportEntity with references.
 */
function transformEntity(
  entity: Entity,
  documents: CaseDocument[],
  findings: Finding[],
  contradictions: Contradiction[]
): ExportEntity {
  // Find documents referencing this entity
  const documentReferences: ExportEntity['documentReferences'] = []

  // Associate documents from findings that reference this entity
  const relatedFindings = findings.filter(
    (f) => f.entity_ids?.includes(entity.id)
  )

  const relatedContradictions = contradictions.filter(
    (c) =>
      c.source_a_entity_id === entity.id || c.source_b_entity_id === entity.id
  )

  // Collect unique document IDs from related findings
  const docIds = new Set<string>()
  for (const finding of relatedFindings) {
    for (const docId of finding.document_ids || []) {
      docIds.add(docId)
    }
  }

  // Build document references
  for (const docId of docIds) {
    const doc = documents.find((d) => d.id === docId)
    if (doc) {
      documentReferences.push({
        document: doc,
        pageNumbers: [],
        mentionCount: 1,
      })
    }
  }

  return {
    entity,
    documentReferences,
    relatedFindings,
    relatedContradictions,
  }
}

/**
 * Generate default methodology statement based on the analysis.
 */
function generateDefaultMethodology(
  documents: CaseDocument[],
  findings: Finding[]
): MethodologyStatement {
  // Group documents by type
  const docsByType = documents.reduce(
    (acc, doc) => {
      const type = doc.doc_type || 'other'
      if (!acc[type]) acc[type] = []
      acc[type].push(doc)
      return acc
    },
    {} as Record<string, CaseDocument[]>
  )

  // Create data source descriptions
  const dataSources = Object.entries(docsByType).map(([docType, docs]) => {
    const dates = docs
      .map((d) => new Date(d.created_at))
      .filter((d) => !isNaN(d.getTime()))
      .sort((a, b) => a.getTime() - b.getTime())

    return {
      sourceType: docType
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (c) => c.toUpperCase()),
      description: `${docType.replace(/_/g, ' ')} documents`,
      documentCount: docs.length,
      dateRange:
        dates.length > 0
          ? {
              earliest: dates[0].toISOString(),
              latest: dates[dates.length - 1].toISOString(),
            }
          : undefined,
    }
  })

  // Get unique engines used
  const enginesUsed = [...new Set(findings.map((f) => f.engine))]

  // Create analysis method descriptions
  const analysisMethods = enginesUsed.map((engine) => ({
    engine,
    displayName: formatEngineName(engine),
    description: getEngineDescription(engine),
    outputTypes: ['findings'],
  }))

  return {
    title: 'Analysis Methodology',
    introduction:
      'This analysis was conducted using automated evidence analysis engines to identify contradictions, ' +
      'omissions, and patterns across the document set. The methodology follows established legal evidence ' +
      'analysis practices adapted for automated processing.',
    dataSources,
    analysisMethods,
    confidenceExplanation:
      'Confidence scores range from 0% to 100%, indicating the certainty of each finding based on ' +
      'evidence quality, consistency across sources, and corroboration from multiple documents. ' +
      'Scores above 80% indicate high confidence, 60-80% moderate confidence, and below 60% low confidence.',
    limitations: [
      'Analysis is limited to text content; images, handwritten notes, and embedded media may not be fully captured.',
      'Findings represent automated analysis and require human verification before use in legal proceedings.',
      'Temporal analysis depends on explicit dates in documents; implicit time references may not be captured.',
      'Entity resolution may not capture all aliases or name variations across documents.',
    ],
    version: '1.0.0',
    lastUpdated: new Date().toISOString(),
  }
}

/**
 * Get description for an analysis engine.
 */
function getEngineDescription(engine: Engine): string {
  const descriptions: Record<Engine, string> = {
    entity_resolution:
      'Identifies and links entities (people, organizations) across documents',
    temporal_parser: 'Extracts and analyzes timeline events and date references',
    argumentation: 'Analyzes logical structure and arguments within documents',
    bias_detection: 'Detects potential bias in language and presentation',
    contradiction:
      'Identifies conflicting statements across documents and sources',
    accountability: 'Tracks accountability and responsibility statements',
    professional_tracker: 'Monitors professional conduct and regulatory compliance',
    omission: 'Detects significant omissions in reports and summaries',
    expert_witness: 'Analyzes expert witness statements and qualifications',
    documentary: 'Performs document structure and authenticity analysis',
    narrative: 'Tracks narrative evolution and version changes',
    coordination: 'Detects patterns of coordination across sources',
    evidence_chain: 'Traces evidence provenance and chain of custody',
  }
  return descriptions[engine] || 'Automated analysis engine'
}

/**
 * Calculate summary statistics from export data.
 */
function calculateSummary(
  caseData: Case,
  documents: CaseDocument[],
  findings: Finding[],
  contradictions: Contradiction[],
  entities: Entity[]
): ExportSummary {
  // Count findings by severity
  const findingsBySeverity: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  }

  for (const finding of findings) {
    const severity = finding.severity || 'info'
    findingsBySeverity[severity]++
  }

  // Count findings by engine
  const findingsByEngine: Record<Engine, number> = {
    entity_resolution: 0,
    temporal_parser: 0,
    argumentation: 0,
    bias_detection: 0,
    contradiction: 0,
    accountability: 0,
    professional_tracker: 0,
    omission: 0,
    expert_witness: 0,
    documentary: 0,
    narrative: 0,
    coordination: 0,
    evidence_chain: 0,
  }

  for (const finding of findings) {
    findingsByEngine[finding.engine]++
  }

  return {
    caseReference: caseData.reference,
    caseName: caseData.name,
    generatedAt: new Date().toISOString(),
    documentCount: documents.length,
    findingCount: findings.length,
    contradictionCount: contradictions.length,
    entityCount: entities.length,
    findingsBySeverity,
    findingsByEngine,
  }
}

/**
 * Generate a unique export ID.
 */
function generateExportId(): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substring(2, 8)
  return `export-${timestamp}-${random}`
}

/**
 * Generate a DOCX export from a case ID.
 *
 * This function fetches all necessary data from the data layer,
 * transforms it into ExportData format, and generates the DOCX.
 *
 * @param caseId - The case ID to export
 * @param options - Export options (optional)
 * @returns Promise resolving to GenerateDOCXResult
 */
export async function generateDOCX(
  caseId: string,
  options: Partial<ExportOptions> = {}
): Promise<GenerateDOCXResult> {
  const mergedOptions: ExportOptions = {
    ...DEFAULT_EXPORT_OPTIONS,
    ...options,
    format: 'docx',
  }
  const filename = `evidence-export-${caseId}-${new Date().toISOString().split('T')[0]}.docx`

  try {
    // Get data layer
    const dataLayer = await getDataLayer()

    // Fetch case data
    const caseData = await dataLayer.getCase(caseId)
    if (!caseData) {
      return {
        success: false,
        blob: null,
        filename,
        error: `Case not found: ${caseId}`,
      }
    }

    // Fetch all related data in parallel
    const [documents, findings, contradictions, entities, analysisResult] =
      await Promise.all([
        dataLayer.getDocuments(caseId),
        dataLayer.getFindings(caseId),
        dataLayer.getContradictions(caseId),
        dataLayer.getEntities(caseId),
        dataLayer.getAnalysis(caseId),
      ])

    // Check for empty findings
    if (findings.length === 0 && contradictions.length === 0) {
      return {
        success: false,
        blob: null,
        filename,
        error: 'No findings available to export',
      }
    }

    // Create lookup maps
    const documentsMap = new Map(documents.map((d) => [d.id, d]))
    const entitiesMap = new Map(entities.map((e) => [e.id, e]))

    // Create audit trail context
    const auditTrailContext = createAuditTrailContext(documents, entities)
    const citationTracker = new CitationTracker()

    // Transform findings
    let exportFindings: ExportFinding[] = findings.map((finding) =>
      transformFinding(
        finding,
        documentsMap,
        entitiesMap,
        auditTrailContext,
        citationTracker,
        mergedOptions.includeAuditTrails
      )
    )

    // Apply severity filter if specified
    if (mergedOptions.minSeverity) {
      const severityOrder: Severity[] = [
        'critical',
        'high',
        'medium',
        'low',
        'info',
      ]
      const minIndex = severityOrder.indexOf(mergedOptions.minSeverity)
      exportFindings = exportFindings.filter((ef) => {
        const findingSeverity = ef.finding.severity || 'info'
        return severityOrder.indexOf(findingSeverity) <= minIndex
      })
    }

    // Apply engine filter if specified
    if (mergedOptions.engines && mergedOptions.engines.length > 0) {
      exportFindings = exportFindings.filter((ef) =>
        mergedOptions.engines!.includes(ef.finding.engine)
      )
    }

    // Apply max findings limit if specified
    if (mergedOptions.maxFindings && mergedOptions.maxFindings > 0) {
      exportFindings = exportFindings.slice(0, mergedOptions.maxFindings)
    }

    // Transform contradictions
    const exportContradictions: ExportContradiction[] = contradictions.map((c) =>
      transformContradiction(c, documentsMap, entitiesMap)
    )

    // Transform entities
    const exportEntities: ExportEntity[] = entities.map((e) =>
      transformEntity(e, documents, findings, contradictions)
    )

    // Get omissions from analysis result
    const omissions: Omission[] = analysisResult.omissions || []

    // Generate audit trails for filtered findings
    const auditTrails: AuditTrail[] = mergedOptions.includeAuditTrails
      ? exportFindings
          .map((ef) => ef.auditTrail)
          .filter((at): at is AuditTrail => at !== null)
      : []

    // Generate methodology
    const methodology = generateDefaultMethodology(documents, findings)

    // Calculate summary
    const summary = calculateSummary(
      caseData,
      documents,
      findings,
      contradictions,
      entities
    )

    // Build export data
    const exportData: ExportData = {
      metadata: {
        exportId: generateExportId(),
        format: 'docx',
        generatedAt: new Date().toISOString(),
        generatedBy: 'Apatheia Labs',
        version: '1.0.0',
      },
      case: caseData,
      summary,
      findings: exportFindings,
      contradictions: exportContradictions,
      entities: exportEntities,
      omissions,
      documents,
      methodology,
      auditTrails,
    }

    // Generate DOCX blob
    const blob = await generateDOCXBlob(exportData, mergedOptions)

    return {
      success: true,
      blob,
      filename,
      data: exportData,
    }
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred'
    return {
      success: false,
      blob: null,
      filename,
      error: `DOCX generation failed: ${errorMessage}`,
    }
  }
}
