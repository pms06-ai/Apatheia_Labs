#!/usr/bin/env node
/**
 * Vault Ingestion Script - v2
 * Scans Obsidian vault, extracts text, inserts to SQLite
 * Config per Codex spec: 4000 char chunks, 400 overlap
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

// Configuration
const CONFIG = {
  vaultRoot: 'C:\\Users\\pstep\\OneDrive\\Documents\\Obsidian Vault',
  dbPath: 'C:\\Users\\pstep\\AppData\\Roaming\\com.apatheia.phronesis\\phronesis.db',
  caseId: 'obsidian-vault',
  targetDirs: ['10 - Case Materials', '70 - Publishing\\Channel_4'],
  skipDirs: ['.obsidian', 'node_modules', '.cursor', '.git', '_.trash'],
  extensions: ['.md', '.txt', '.pdf', '.docx'],
  maxFileSize: 100 * 1024 * 1024, // 100MB
  chunkSize: 4000,
  chunkOverlap: 400
};

// Stats tracking
const stats = {
  byType: {},
  skipped: [],
  total: 0,
  chunks: 0
};

// Ensure directory exists
function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
    console.log(`Created: ${dirPath}`);
  }
}

// Generate UUID v4
function uuid() {
  return crypto.randomUUID();
}

// SHA256 hash
function sha256(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

// Infer doc_type from path/filename
function inferDocType(filePath) {
  const lower = filePath.toLowerCase();
  const filename = path.basename(lower);

  // Filename-based rules first
  if (filename.includes('position')) return 'position_statement';
  if (filename.includes('witness')) return 'witness_statement';
  if (filename.includes('report') || filename.includes('assessment')) return 'expert_report';

  // Path-based rules
  if (lower.includes('police') || lower.includes('\\g_') || lower.includes('/g_')) return 'police_bundle';

  return 'other';
}

// Extract text from file
function extractText(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  try {
    if (ext === '.md' || ext === '.txt') {
      return fs.readFileSync(filePath, 'utf-8');
    }
    if (ext === '.pdf') {
      // PDF requires external reader - skip with warning
      return null;
    }
    if (ext === '.docx') {
      // DOCX requires external reader - skip with warning
      return null;
    }
  } catch (e) {
    return null;
  }
  return null;
}

// Chunk text
function chunkText(text, chunkSize = 4000, overlap = 400) {
  if (!text || text.length === 0) return [];
  const chunks = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    chunks.push({
      index: index++,
      content: text.slice(start, end)
    });

    if (end >= text.length) break;
    start += chunkSize - overlap;
  }

  return chunks;
}

// Check if path should be skipped
function shouldSkip(dirPath) {
  const parts = dirPath.split(path.sep);
  return parts.some(part => CONFIG.skipDirs.includes(part));
}

// Scan folder recursively
function scanFolder(folderPath) {
  const files = [];

  function walk(dir) {
    if (shouldSkip(dir)) return;

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          if (!CONFIG.skipDirs.includes(entry.name)) {
            walk(fullPath);
          }
        } else {
          const ext = path.extname(entry.name).toLowerCase();
          if (CONFIG.extensions.includes(ext)) {
            try {
              const stat = fs.statSync(fullPath);
              if (stat.size <= CONFIG.maxFileSize) {
                files.push({ path: fullPath, size: stat.size, ext });
              } else {
                stats.skipped.push({ path: fullPath, reason: `Size exceeds 100MB (${(stat.size / 1024 / 1024).toFixed(1)}MB)` });
              }
            } catch (e) {
              stats.skipped.push({ path: fullPath, reason: e.message });
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error scanning ${dir}: ${e.message}`);
    }
  }

  walk(folderPath);
  return files;
}

// Initialize database
function initDatabase(dbPath) {
  ensureDir(path.dirname(dbPath));
  const db = new Database(dbPath);

  // Enable WAL mode
  db.pragma('journal_mode = WAL');

  // Create tables
  db.exec(`
    CREATE TABLE IF NOT EXISTS cases (
      id TEXT PRIMARY KEY,
      reference TEXT NOT NULL,
      name TEXT NOT NULL,
      case_type TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      description TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      file_type TEXT NOT NULL,
      file_size INTEGER,
      storage_path TEXT NOT NULL,
      hash_sha256 TEXT NOT NULL,
      acquisition_date TEXT NOT NULL DEFAULT (datetime('now')),
      doc_type TEXT,
      source_entity TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      extracted_text TEXT,
      page_count INTEGER,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS document_chunks (
      id TEXT PRIMARY KEY,
      document_id TEXT NOT NULL,
      chunk_index INTEGER NOT NULL,
      content TEXT NOT NULL,
      page_number INTEGER,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS findings (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      engine TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      finding_type TEXT,
      severity TEXT,
      confidence REAL,
      document_ids TEXT DEFAULT '[]',
      entity_ids TEXT DEFAULT '[]',
      regulatory_targets TEXT DEFAULT '[]',
      evidence TEXT DEFAULT '{}',
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS entities (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      canonical_name TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      aliases TEXT DEFAULT '[]',
      role TEXT,
      institution TEXT,
      professional_registration TEXT,
      credibility_score REAL DEFAULT 1.0,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS contradictions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      source_a_document_id TEXT,
      source_a_text TEXT NOT NULL,
      source_a_page INTEGER,
      source_b_document_id TEXT,
      source_b_text TEXT NOT NULL,
      source_b_page INTEGER,
      contradiction_type TEXT,
      severity TEXT,
      resolution TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS omissions (
      id TEXT PRIMARY KEY,
      case_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      omitted_content TEXT NOT NULL,
      source_document_id TEXT,
      omitting_document_id TEXT,
      omission_type TEXT,
      severity TEXT,
      metadata TEXT DEFAULT '{}',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
    CREATE INDEX IF NOT EXISTS idx_chunks_document_id ON document_chunks(document_id);
    CREATE INDEX IF NOT EXISTS idx_findings_case_id ON findings(case_id);
  `);

  return db;
}

// Main
function main() {
  console.log('='.repeat(70));
  console.log('APATHEIA VAULT INGESTION v2');
  console.log('='.repeat(70));
  console.log(`Database: ${CONFIG.dbPath}`);
  console.log(`Vault: ${CONFIG.vaultRoot}`);
  console.log(`Chunk size: ${CONFIG.chunkSize} chars, overlap: ${CONFIG.chunkOverlap}`);
  console.log();

  // Initialize database
  const db = initDatabase(CONFIG.dbPath);
  console.log('Database initialized (WAL mode)');

  // Ensure case exists
  db.prepare(`
    INSERT OR IGNORE INTO cases (id, reference, name, case_type, status, description, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    CONFIG.caseId,
    'obsidian-vault',
    'Obsidian Vault',
    'family_court',
    'active',
    'Vault ingest',
    '{}'
  );
  console.log(`Case ensured: ${CONFIG.caseId}`);

  // Prepare statements
  const insertDoc = db.prepare(`
    INSERT OR REPLACE INTO documents
    (id, case_id, filename, file_type, file_size, storage_path, hash_sha256, doc_type, status, extracted_text, page_count, metadata, acquisition_date, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'), datetime('now'))
  `);

  const insertChunk = db.prepare(`
    INSERT OR REPLACE INTO document_chunks
    (id, document_id, chunk_index, content, page_number, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `);

  // Collect all files from target directories
  let allFiles = [];
  for (const targetDir of CONFIG.targetDirs) {
    const fullPath = path.join(CONFIG.vaultRoot, targetDir);
    console.log(`\nScanning: ${targetDir}`);

    if (!fs.existsSync(fullPath)) {
      console.log(`  Directory not found, skipping`);
      continue;
    }

    const files = scanFolder(fullPath);
    console.log(`  Found: ${files.length} files`);
    allFiles = allFiles.concat(files);
  }

  console.log(`\nTotal files to process: ${allFiles.length}`);

  // Process files in transaction
  const processFiles = db.transaction((files) => {
    for (const file of files) {
      const ext = file.ext.slice(1); // remove dot

      // Track by type
      stats.byType[ext] = (stats.byType[ext] || 0) + 1;

      // Extract text
      const text = extractText(file.path);

      if (text === null && (file.ext === '.pdf' || file.ext === '.docx')) {
        stats.skipped.push({ path: file.path, reason: `No reader for ${file.ext}` });
        continue;
      }

      // Compute hash
      let hash;
      try {
        const content = text || fs.readFileSync(file.path);
        hash = sha256(typeof content === 'string' ? Buffer.from(content) : content);
      } catch (e) {
        stats.skipped.push({ path: file.path, reason: `Hash failed: ${e.message}` });
        continue;
      }

      const docId = uuid();
      const docType = inferDocType(file.path);

      // Insert document
      insertDoc.run(
        docId,
        CONFIG.caseId,
        path.basename(file.path),
        ext,
        file.size,
        file.path, // absolute path
        hash,
        docType,
        'completed',
        text,
        null, // page_count
        '{}'
      );

      stats.total++;

      // Create chunks if text available
      if (text) {
        const chunks = chunkText(text, CONFIG.chunkSize, CONFIG.chunkOverlap);
        for (const chunk of chunks) {
          insertChunk.run(
            `${docId}-${chunk.index}`,
            docId,
            chunk.index,
            chunk.content,
            null,
            '{}'
          );
          stats.chunks++;
        }
      }
    }
  });

  processFiles(allFiles);

  // Get final counts from DB
  const docCount = db.prepare('SELECT COUNT(*) as cnt FROM documents WHERE case_id = ?').get(CONFIG.caseId);
  const chunkCount = db.prepare('SELECT COUNT(*) as cnt FROM document_chunks').get();

  db.close();

  // Print summary
  console.log('\n' + '='.repeat(70));
  console.log('INGESTION SUMMARY');
  console.log('='.repeat(70));

  console.log('\nIngested by type:');
  for (const [type, count] of Object.entries(stats.byType)) {
    console.log(`  .${type}: ${count}`);
  }

  console.log(`\nTotal documents: ${stats.total}`);
  console.log(`Total chunks: ${stats.chunks}`);
  console.log(`DB documents: ${docCount.cnt}`);
  console.log(`DB chunks: ${chunkCount.cnt}`);

  if (stats.skipped.length > 0) {
    console.log(`\nSkipped files (${stats.skipped.length}):`);
    // Group by reason
    const byReason = {};
    for (const skip of stats.skipped) {
      const key = skip.reason;
      if (!byReason[key]) byReason[key] = [];
      byReason[key].push(skip.path);
    }
    for (const [reason, paths] of Object.entries(byReason)) {
      console.log(`  ${reason}: ${paths.length} files`);
      if (paths.length <= 3) {
        paths.forEach(p => console.log(`    - ${path.basename(p)}`));
      }
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('Database: ' + CONFIG.dbPath);
  console.log('='.repeat(70));
}

main();
