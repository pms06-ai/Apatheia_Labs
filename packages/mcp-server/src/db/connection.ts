/**
 * Database Connection for Phronesis MCP Server
 *
 * Uses better-sqlite3 for direct SQLite access
 */

import Database from 'better-sqlite3'
import type { Document } from '../types/index.js'

let db: Database.Database | null = null

export function initDatabase(dbPath: string): Database.Database {
  if (db) return db

  db = new Database(dbPath, { readonly: false })
  db.pragma('journal_mode = WAL')

  return db
}

export function getDatabase(): Database.Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase first.')
  }
  return db
}

export function closeDatabase(): void {
  if (db) {
    db.close()
    db = null
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Document Queries
// ═══════════════════════════════════════════════════════════════════════════

export function getDocumentById(id: string): Document | null {
  const stmt = getDatabase().prepare(`
    SELECT id, case_id, filename, doc_type, extracted_text, content_hash, status, created_at, updated_at
    FROM documents
    WHERE id = ?
  `)
  return stmt.get(id) as Document | null
}

export function getDocumentsByIds(ids: string[]): Document[] {
  if (ids.length === 0) return []

  const placeholders = ids.map(() => '?').join(', ')
  const stmt = getDatabase().prepare(`
    SELECT id, case_id, filename, doc_type, extracted_text, content_hash, status, created_at, updated_at
    FROM documents
    WHERE id IN (${placeholders})
  `)
  return stmt.all(...ids) as Document[]
}

export function getDocumentContent(docId: string): string {
  // First try extracted_text from documents table
  const doc = getDocumentById(docId)
  if (doc?.extracted_text) {
    return doc.extracted_text
  }

  // Fall back to document_chunks
  const stmt = getDatabase().prepare(`
    SELECT content, chunk_index
    FROM document_chunks
    WHERE document_id = ?
    ORDER BY chunk_index
  `)
  const chunks = stmt.all(docId) as { content: string; chunk_index: number }[]
  return chunks.map(c => c.content).join('\n\n')
}

export function getDocumentsForCase(caseId: string): Document[] {
  const stmt = getDatabase().prepare(`
    SELECT id, case_id, filename, doc_type, extracted_text, content_hash, status, created_at, updated_at
    FROM documents
    WHERE case_id = ?
    ORDER BY created_at DESC
  `)
  return stmt.all(caseId) as Document[]
}

// ═══════════════════════════════════════════════════════════════════════════
// Finding Storage
// ═══════════════════════════════════════════════════════════════════════════

export interface FindingRecord {
  id: string
  case_id: string
  engine: string
  finding_type: string
  title: string
  description: string
  severity: string
  confidence: number
  document_ids: string
  evidence: string
  created_at: string
}

export function storeFinding(finding: Omit<FindingRecord, 'created_at'>): void {
  const stmt = getDatabase().prepare(`
    INSERT INTO findings (id, case_id, engine, finding_type, title, description, severity, confidence, document_ids, evidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)
  stmt.run(
    finding.id,
    finding.case_id,
    finding.engine,
    finding.finding_type,
    finding.title,
    finding.description,
    finding.severity,
    finding.confidence,
    finding.document_ids,
    finding.evidence
  )
}

export function storeFindings(findings: Omit<FindingRecord, 'created_at'>[]): void {
  const stmt = getDatabase().prepare(`
    INSERT INTO findings (id, case_id, engine, finding_type, title, description, severity, confidence, document_ids, evidence, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
  `)

  const tx = getDatabase().transaction((items: Omit<FindingRecord, 'created_at'>[]) => {
    for (const f of items) {
      stmt.run(f.id, f.case_id, f.engine, f.finding_type, f.title, f.description, f.severity, f.confidence, f.document_ids, f.evidence)
    }
  })

  tx(findings)
}

export function getFindingsByCase(caseId: string): FindingRecord[] {
  const stmt = getDatabase().prepare(`
    SELECT * FROM findings WHERE case_id = ? ORDER BY created_at DESC
  `)
  return stmt.all(caseId) as FindingRecord[]
}

export function getFindingsByEngine(caseId: string, engine: string): FindingRecord[] {
  const stmt = getDatabase().prepare(`
    SELECT * FROM findings WHERE case_id = ? AND engine = ? ORDER BY created_at DESC
  `)
  return stmt.all(caseId, engine) as FindingRecord[]
}
