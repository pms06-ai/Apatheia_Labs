const Database = require('better-sqlite3');
const { spawn } = require('child_process');
const path = require('path');

const DB_PATH = path.join(process.env.APPDATA, 'com.apatheia.phronesis', 'phronesis.db');
const db = new Database(DB_PATH, { readonly: true });

// Grab ALL docs from PE23C50095 and Channel_4 with extracted text
const rows = db.prepare(`
  SELECT id
  FROM documents
  WHERE case_id = 'obsidian-vault'
    AND (storage_path LIKE @a OR storage_path LIKE @b)
    AND extracted_text IS NOT NULL
    AND LENGTH(extracted_text) > 100
  ORDER BY LENGTH(extracted_text) ASC
`).all({ a: '%PE23C50095%', b: '%Channel_4%' });

const docIds = rows.map(r => r.id);
console.error(`Running omission on ${docIds.length} docs`);

const child = spawn('node', ['src-tauri/sidecars/engine-runner.js'], { stdio: ['pipe', 'pipe', 'inherit'] });

child.stdout.on('data', d => process.stdout.write(d));

child.stdin.write(JSON.stringify({
  engine_id: 'omission',
  case_id: 'obsidian-vault',
  document_ids: docIds
}) + '\n');

child.stdin.end();
child.on('close', code => process.exit(code || 0));
