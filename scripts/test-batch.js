const Database = require('better-sqlite3');
const { spawn } = require('child_process');
const path = require('path');

const DB_PATH = path.join(process.env.APPDATA, 'com.apatheia.phronesis', 'phronesis.db');
const db = new Database(DB_PATH, { readonly: true });

// Just grab 3 docs for quick test
const docs = db.prepare(`
  SELECT id, filename
  FROM documents
  WHERE case_id = 'obsidian-vault'
    AND storage_path LIKE '%PE23C50095%'
    AND extracted_text IS NOT NULL
    AND LENGTH(extracted_text) > 500
  ORDER BY LENGTH(extracted_text) ASC
  LIMIT 3
`).all();

console.error('Docs:', docs.map(d => d.filename).join(', '));
const docIds = docs.map(d => d.id);

const child = spawn('node', ['src-tauri/sidecars/engine-runner.js'], { stdio: ['pipe','pipe','inherit'] });

child.stdout.on('data', d => process.stdout.write(d));
child.stdin.write(JSON.stringify({
  engine_id: 'omission',
  case_id: 'obsidian-vault',
  document_ids: docIds
}) + '\n');
child.stdin.end();
child.on('close', code => {
  console.error('Done, exit code:', code);
  process.exit(code || 0);
});
