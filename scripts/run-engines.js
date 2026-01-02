#!/usr/bin/env node
/**
 * Engine Execution Helper
 * Pulls documents from DB, formats prompts for Claude Code agent
 * Outputs structured prompts for each engine
 */

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const CONFIG = {
  dbPath: path.join(process.env.APPDATA, 'com.apatheia.phronesis', 'phronesis.db'),
  caseId: 'obsidian-vault',
  outputDir: path.join(process.env.APPDATA, 'com.apatheia.phronesis', 'engine-prompts'),
  maxDocsPerEngine: 50,
  maxCharsPerDoc: 10000
};

// Engine definitions with prompts
const ENGINES = {
  entity_resolution: {
    name: 'Entity Resolution',
    prompt: `You are an Entity Resolution Engine. Analyze the following documents and:
1. Extract all named entities (people, organizations, institutions)
2. Resolve aliases and variations to canonical names
3. Identify professional roles and registrations
4. Flag any credibility concerns

Key entities to track: Emma Hunnisett, Lucy Walton, Mandy Seamark, Simon Ford

Output JSON array of findings with: id, title, description, severity, entities[], evidence`
  },

  temporal_parser: {
    name: 'Temporal Parser',
    prompt: `You are a Temporal Analysis Engine. Analyze timeline consistency:
1. Extract all dates and temporal references
2. Identify timeline gaps or overlaps
3. Flag anachronistic claims (events referenced before they occurred)
4. Detect temporal contradictions between documents

Operation Scan period: March 2023 - October 2024
NFA issued: February 2025

Output JSON array of timeline anomalies with: id, event_date, description, anomaly_type, severity, document_ids[]`
  },

  contradiction: {
    name: 'Contradiction Detection',
    prompt: `You are a Contradiction Detection Engine using the CASCADE methodology:
- SELF: Internal contradictions within single document
- INTER_DOC: Contradictions between documents
- TEMPORAL: Timeline inconsistencies
- EVIDENTIARY: Evidence vs claims mismatch
- MODALITY_SHIFT: Unexplained certainty changes
- SELECTIVE_CITATION: Cherry-picked references
- SCOPE_SHIFT: Unexplained scope changes
- UNEXPLAINED_CHANGE: Position changes without justification

Output JSON array: id, title, source_a_text, source_a_doc, source_b_text, source_b_doc, contradiction_type, severity`
  },

  omission: {
    name: 'Omission Detection',
    prompt: `You are an Omission Detection Engine. Identify material omissions:
1. Selective quoting - partial quotes that change meaning
2. Complete exclusion - relevant facts not mentioned
3. Context stripping - facts presented without necessary context
4. Cherry picking - selective use of favorable data

Focus on: exculpatory evidence omitted, timeline gaps, missing witness accounts

Output JSON array: id, title, omitted_content, source_doc, omitting_doc, omission_type, severity, bias_direction`
  },

  expert_witness: {
    name: 'Expert Witness Analysis',
    prompt: `You are an Expert Witness Analysis Engine. Evaluate:
1. Expert qualifications and scope
2. Whether expert exceeded instructed scope
3. Methodology quality (peer-reviewed, evidence-based)
4. Potential bias indicators
5. Regulatory compliance (BPS, HCPC guidelines)

Focus on: Dr. Emma Hunnisett's psychological assessment
Check: HCPC registration, BPS Code compliance, scope of instructions

Output JSON array: id, title, expert_name, issue_type, description, severity, regulatory_targets[]`
  },

  narrative: {
    name: 'Narrative Drift Analysis',
    prompt: `You are a Narrative Analysis Engine. Track narrative evolution:
1. Identify narrative versions across documents
2. Detect amplification (claims getting stronger without evidence)
3. Detect minimization (claims weakened to suit narrative)
4. Flag emergence of new claims without foundation
5. Track disappearance of inconvenient facts

Output JSON array: id, title, narrative_element, drift_type (amplification|minimization|emergence|disappearance), first_doc, current_doc, severity`
  },

  coordination: {
    name: 'Coordination Detection',
    prompt: `You are a Coordination Detection Engine. Identify:
1. Shared language patterns between supposedly independent sources
2. Synchronized timeline of statements
3. Circular referencing (A cites B, B cites A as independent)
4. Collusion indicators

Focus on: Social services, police, expert witness coordination

Output JSON array: id, title, pattern_type, entities_involved[], evidence_quotes[], severity`
  },

  accountability_audit: {
    name: 'Accountability Audit',
    prompt: `You are an Accountability Audit Engine. For each professional:
1. Identify role and regulatory body
2. Track decisions made and their basis
3. Flag procedural violations
4. Map accountability chain

Regulatory bodies: BPS, HCPC, ICO, Ofcom, SRA

Output JSON array: id, professional_name, role, regulator, issue, standard_breached, severity`
  }
};

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function main() {
  console.log('='.repeat(60));
  console.log('ENGINE PROMPT GENERATION');
  console.log('='.repeat(60));

  if (!fs.existsSync(CONFIG.dbPath)) {
    console.error(`Database not found: ${CONFIG.dbPath}`);
    console.error('Run ingest-vault.js first');
    process.exit(1);
  }

  const db = new Database(CONFIG.dbPath, { readonly: true });
  ensureDir(CONFIG.outputDir);

  // Get document stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total,
      SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as with_text,
      SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending
    FROM documents WHERE case_id = ?
  `).get(CONFIG.caseId);

  console.log(`\nDocuments in DB: ${stats.total}`);
  console.log(`With extracted text: ${stats.with_text}`);
  console.log(`Pending (PDFs): ${stats.pending}`);

  // Get documents with text
  const docs = db.prepare(`
    SELECT id, filename, doc_type, extracted_text, storage_path
    FROM documents
    WHERE case_id = ? AND status = 'completed' AND extracted_text IS NOT NULL
    ORDER BY filename
    LIMIT ?
  `).all(CONFIG.caseId, CONFIG.maxDocsPerEngine);

  console.log(`\nUsing ${docs.length} documents for analysis`);

  // Generate prompts for each engine
  for (const [engineId, engine] of Object.entries(ENGINES)) {
    console.log(`\nGenerating: ${engine.name}`);

    // Build document context
    let docContext = '';
    for (const doc of docs) {
      const text = doc.extracted_text.slice(0, CONFIG.maxCharsPerDoc);
      docContext += `\n---\n## Document: ${doc.filename}\nType: ${doc.doc_type}\nPath: ${doc.storage_path}\n\n${text}\n`;
    }

    // Build full prompt
    const fullPrompt = `# ${engine.name} Engine Analysis

## Instructions
${engine.prompt}

## Case Context
- Case ID: ${CONFIG.caseId}
- Reference: PE23C50095 (Family Court) + Channel 4 GDPR
- Key Entities: Dr. Emma Hunnisett, Lucy Walton, Mandy Seamark, Simon Ford
- Timeline: Operation Scan (Mar 2023 - Oct 2024), NFA (Feb 2025), Broadcast (Dec 2024)

## Documents for Analysis
${docContext}

## Output Format
Return a JSON array of findings. Each finding must have:
{
  "id": "uuid",
  "engine_id": "${engineId}",
  "title": "Brief finding title",
  "description": "Detailed description with evidence",
  "finding_type": "type",
  "severity": "critical|high|medium|low|info",
  "confidence": 0.0-1.0,
  "document_ids": ["doc1", "doc2"],
  "evidence": { "quotes": [], "locations": [] }
}

Begin analysis:`;

    // Save prompt to file
    const outputPath = path.join(CONFIG.outputDir, `${engineId}.md`);
    fs.writeFileSync(outputPath, fullPrompt);
    console.log(`  Saved: ${outputPath}`);
  }

  db.close();

  console.log('\n' + '='.repeat(60));
  console.log('PROMPT GENERATION COMPLETE');
  console.log('='.repeat(60));
  console.log(`Output directory: ${CONFIG.outputDir}`);
  console.log(`\nTo run engines via Claude Code, paste each prompt and capture JSON output.`);
  console.log(`Then run: node save-findings.js <engine_id> <findings.json>`);
}

main();
