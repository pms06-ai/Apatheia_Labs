/**
 * Timeline Analysis Tool
 *
 * Temporal reconstruction, gap detection, and anomaly finding
 */

import { getDocumentsByIds, getDocumentContent, storeFindings } from '../db/connection.js'
import { v4 as uuidv4 } from 'uuid'

export interface TimelineEvent {
  id: string
  date: string
  parsedDate?: Date
  description: string
  documentId: string
  documentName: string
  confidence: 'high' | 'medium' | 'low'
  actors?: string[]
}

export interface TimelineGap {
  startDate: string
  endDate: string
  duration: string
  significance: string
}

export interface TimelineAnomaly {
  type: 'sequence' | 'impossible' | 'suspicious_gap'
  description: string
  events: string[]
  severity: 'critical' | 'high' | 'medium' | 'low'
}

export interface TimelineAnalysisResult {
  events: TimelineEvent[]
  gaps: TimelineGap[]
  anomalies: TimelineAnomaly[]
  summary: {
    totalEvents: number
    dateRange: { start: string; end: string }
    significantGaps: number
    anomalyCount: number
  }
}

/**
 * Analyze documents for timeline events
 */
export async function analyzeTimeline(
  documentIds?: string[],
  caseId?: string,
  content?: string
): Promise<TimelineAnalysisResult> {
  const startTime = Date.now()

  const events: TimelineEvent[] = []

  if (content) {
    const extracted = extractTimelineEvents(content, 'inline-content', 'Selected Text')
    events.push(...extracted)
  } else if (documentIds && documentIds.length > 0) {
    const docs = getDocumentsByIds(documentIds)
    if (docs.length === 0) {
      return {
        events: [],
        gaps: [],
        anomalies: [],
        summary: { totalEvents: 0, dateRange: { start: '', end: '' }, significantGaps: 0, anomalyCount: 0 },
      }
    }

    for (const doc of docs) {
      const docContent = getDocumentContent(doc.id)
      const extracted = extractTimelineEvents(docContent, doc.id, doc.filename)
      events.push(...extracted)
    }
  } else {
    return {
      events: [],
      gaps: [],
      anomalies: [],
      summary: { totalEvents: 0, dateRange: { start: '', end: '' }, significantGaps: 0, anomalyCount: 0 },
    }
  }

  // Sort by date
  events.sort((a, b) => {
    if (!a.parsedDate || !b.parsedDate) return 0
    return a.parsedDate.getTime() - b.parsedDate.getTime()
  })

  // Find gaps
  const gaps = findTimelineGaps(events)

  // Find anomalies
  const anomalies = findTimelineAnomalies(events)

  const validDates = events.filter(e => e.parsedDate)
  const summary = {
    totalEvents: events.length,
    dateRange: {
      start: validDates[0]?.date || '',
      end: validDates[validDates.length - 1]?.date || '',
    },
    significantGaps: gaps.filter(g => parseInt(g.duration) > 30).length,
    anomalyCount: anomalies.length,
  }

  // Store findings
  if (caseId) {
    if (anomalies.length > 0) {
      const findings = anomalies.map(a => ({
        id: uuidv4(),
        case_id: caseId,
        engine: 'temporal_parser',
        finding_type: a.type,
        title: `Timeline ${a.type}: ${a.description.slice(0, 50)}`,
        description: a.description,
        severity: a.severity,
        confidence: 0.7,
        document_ids: JSON.stringify(documentIds),
        evidence: JSON.stringify({ events: a.events }),
      }))
      storeFindings(findings)
    }
  }

  console.error(`[timeline] Analysis complete in ${Date.now() - startTime}ms. Found ${events.length} events.`)

  return { events, gaps, anomalies, summary }
}

/**
 * Extract timeline events from content
 */
function extractTimelineEvents(content: string, documentId: string, documentName: string): TimelineEvent[] {
  const events: TimelineEvent[] = []

  // Date patterns
  const datePatterns = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/g,
    // DD Month YYYY
    /(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/gi,
    // Month DD, YYYY
    /(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/gi,
  ]

  const sentences = content.split(/[.!?]+/).map(s => s.trim())

  for (const sentence of sentences) {
    for (const pattern of datePatterns) {
      const matches = sentence.matchAll(pattern)
      for (const match of matches) {
        const dateStr = match[0]
        const parsedDate = parseDate(dateStr)

        events.push({
          id: uuidv4(),
          date: dateStr,
          parsedDate,
          description: sentence.slice(0, 200),
          documentId,
          documentName,
          confidence: parsedDate ? 'high' : 'low',
        })
      }
    }
  }

  return events.slice(0, 100)
}

/**
 * Parse date string to Date object
 */
function parseDate(dateStr: string): Date | undefined {
  const months: Record<string, number> = {
    january: 0, february: 1, march: 2, april: 3, may: 4, june: 5,
    july: 6, august: 7, september: 8, october: 9, november: 10, december: 11,
  }

  // Try DD/MM/YYYY or DD-MM-YYYY
  const numericMatch = dateStr.match(/(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/)
  if (numericMatch) {
    const [, day, month, year] = numericMatch
    return new Date(parseInt(year), parseInt(month) - 1, parseInt(day))
  }

  // Try DD Month YYYY
  const textMatch1 = dateStr.match(/(\d{1,2})\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})/i)
  if (textMatch1) {
    const [, day, month, year] = textMatch1
    return new Date(parseInt(year), months[month.toLowerCase()], parseInt(day))
  }

  // Try Month DD, YYYY
  const textMatch2 = dateStr.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),?\s+(\d{4})/i)
  if (textMatch2) {
    const [, month, day, year] = textMatch2
    return new Date(parseInt(year), months[month.toLowerCase()], parseInt(day))
  }

  return undefined
}

/**
 * Find gaps in timeline
 */
function findTimelineGaps(events: TimelineEvent[]): TimelineGap[] {
  const gaps: TimelineGap[] = []

  const validEvents = events.filter(e => e.parsedDate)
  for (let i = 1; i < validEvents.length; i++) {
    const prev = validEvents[i - 1]
    const curr = validEvents[i]

    if (prev.parsedDate && curr.parsedDate) {
      const diffMs = curr.parsedDate.getTime() - prev.parsedDate.getTime()
      const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

      if (diffDays > 7) {
        gaps.push({
          startDate: prev.date,
          endDate: curr.date,
          duration: `${diffDays} days`,
          significance: diffDays > 30 ? 'Significant gap in documentation' : 'Minor gap',
        })
      }
    }
  }

  return gaps
}

/**
 * Find anomalies in timeline
 */
function findTimelineAnomalies(events: TimelineEvent[]): TimelineAnomaly[] {
  const anomalies: TimelineAnomaly[] = []

  // Look for sequence issues (events that reference future events)
  // Look for impossible timings

  const validEvents = events.filter(e => e.parsedDate)

  // Check for events very close together that shouldn't be
  for (let i = 1; i < validEvents.length; i++) {
    const prev = validEvents[i - 1]
    const curr = validEvents[i]

    if (prev.parsedDate && curr.parsedDate) {
      const diffMs = Math.abs(curr.parsedDate.getTime() - prev.parsedDate.getTime())
      const diffMins = diffMs / (1000 * 60)

      // Events claimed to happen at same time but in different locations
      if (diffMins < 5 && prev.documentId !== curr.documentId) {
        // Check if different locations implied
        if (prev.description.includes('arrived') && curr.description.includes('arrived')) {
          anomalies.push({
            type: 'impossible',
            description: 'Events appear to occur simultaneously but may be incompatible',
            events: [prev.description.slice(0, 100), curr.description.slice(0, 100)],
            severity: 'medium',
          })
        }
      }
    }
  }

  return anomalies
}
