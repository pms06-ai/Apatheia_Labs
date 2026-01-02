#!/usr/bin/env node
/**
 * Save Findings to Database
 * Takes JSON findings from Claude Code and inserts into SQLite
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const Database = require('better-sqlite3');

const CONFIG = {
  dbPath: path.join(process.env.APPDATA, 'com.apatheia.phronesis', 'phronesis.db'),
  caseId: 'obsidian-vault'
};

function uuid() {
  return crypto.randomUUID();
}

function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.log('Usage: node save-findings.js <engine_id> <findings.json>');
    console.log('   or: node save-findings.js <engine_id> --stdin');
    process.exit(1);
  }

  const engineId = args[0];
  const input = args[1];

  let findingsJson;
  if (input === '--stdin') {
    findingsJson = fs.readFileSync(0, 'utf-8');
  } else {
    findingsJson = fs.readFileSync(input, 'utf-8');
  }

  // Parse findings - handle markdown code blocks
  let cleanJson = findingsJson;
  if (cleanJson.includes('```json')) {
    cleanJson = cleanJson.replace(/```json\s*/g, '').replace(/```\s*/g, '');
  }

  let findings;
  try {
    findings = JSON.parse(cleanJson);
  } catch (e) {
    console.error('Failed to parse JSON:', e.message);
    console.error('Input:', cleanJson.slice(0, 500));
    process.exit(1);
  }

  if (!Array.isArray(findings)) {
    findings = [findings];
  }

  console.log(`Parsed ${findings.length} findings from ${engineId}`);

  const db = new Database(CONFIG.dbPath);

  const insertFinding = db.prepare(`
    INSERT OR REPLACE INTO findings
    (id, case_id, engine, title, description, finding_type, severity, confidence, document_ids, entity_ids, regulatory_targets, evidence, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertContradiction = db.prepare(`
    INSERT OR REPLACE INTO contradictions
    (id, case_id, title, description, source_a_document_id, source_a_text, source_b_document_id, source_b_text, contradiction_type, severity, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertOmission = db.prepare(`
    INSERT OR REPLACE INTO omissions
    (id, case_id, title, description, omitted_content, source_document_id, omitting_document_id, omission_type, severity, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let saved = 0;

  db.transaction(() => {
    for (const finding of findings) {
      const id = finding.id || uuid();
      const severity = finding.severity || 'medium';
      const confidence = finding.confidence || 0.8;

      // Route to appropriate table based on engine
      if (engineId === 'contradiction' && finding.source_a_text && finding.source_b_text) {
        insertContradiction.run(
          id,
          CONFIG.caseId,
          finding.title,
          finding.description,
          finding.source_a_doc || null,
          finding.source_a_text,
          finding.source_b_doc || null,
          finding.source_b_text,
          finding.contradiction_type || 'logical',
          severity,
          JSON.stringify(finding.metadata || {})
        );
      } else if (engineId === 'omission' && finding.omitted_content) {
        insertOmission.run(
          id,
          CONFIG.caseId,
          finding.title,
          finding.description,
          finding.omitted_content,
          finding.source_doc || null,
          finding.omitting_doc || null,
          finding.omission_type || 'complete_exclusion',
          severity,
          JSON.stringify(finding.metadata || {})
        );
      } else {
        // Generic finding
        insertFinding.run(
          id,
          CONFIG.caseId,
          engineId,
          finding.title,
          finding.description,
          finding.finding_type || engineId,
          severity,
          confidence,
          JSON.stringify(finding.document_ids || []),
          JSON.stringify(finding.entity_ids || []),
          JSON.stringify(finding.regulatory_targets || []),
          JSON.stringify(finding.evidence || {}),
          JSON.stringify(finding.metadata || {})
        );
      }
      saved++;
    }
  })();

  db.close();

  console.log(`Saved ${saved} findings for engine: ${engineId}`);
}

main();
