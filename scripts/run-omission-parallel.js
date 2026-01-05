// Parallel omission batches (intra-batch coverage only)
const Database = require('better-sqlite3');
const { spawn } = require('child_process');
const path = require('path');

const DB_PATH = path.join(process.env.APPDATA, 'com.apatheia.phronesis', 'phronesis.db');
const ENGINE = 'omission';
const CASE_ID = 'obsidian-vault';
const BATCH_SIZE = 50;
const CONCURRENCY = 3; // adjust if you want fewer/more

const db = new Database(DB_PATH, { readonly: true });
const docs = db.prepare(`
  SELECT id
  FROM documents
  WHERE case_id = @case
    AND (storage_path LIKE @a OR storage_path LIKE @b)
    AND extracted_text IS NOT NULL
    AND LENGTH(extracted_text) > 100
  ORDER BY COALESCE(file_size,0) ASC
`).all({ case: CASE_ID, a: '%PE23C50095%', b: '%Channel_4%' });

console.error(`Total docs in scope: ${docs.length}`);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const batches = chunk(docs.map(d => d.id), BATCH_SIZE);
console.error(`Batches: ${batches.length}, size ~${BATCH_SIZE}`);

let active = 0, idx = 0, completed = 0;
const startTime = Date.now();

function runNext() {
  if (idx >= batches.length && active === 0) {
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    console.error(`\nAll ${batches.length} batches complete in ${elapsed}s`);
    process.exit(0);
  }
  while (active < CONCURRENCY && idx < batches.length) {
    const batchId = idx;
    const docIds = batches[idx++];
    active++;
    console.error(`Starting batch ${batchId+1}/${batches.length} with ${docIds.length} docs`);
    const child = spawn('node', ['src-tauri/sidecars/engine-runner.js'], { stdio: ['pipe','pipe','inherit'] });

    child.stdout.on('data', d => process.stdout.write(d));
    child.stdin.write(JSON.stringify({
      engine_id: ENGINE,
      case_id: CASE_ID,
      document_ids: docIds
    }) + '\n');
    child.stdin.end();

    child.on('close', code => {
      completed++;
      const elapsed = Math.round((Date.now() - startTime) / 1000);
      const rate = completed / elapsed * 60;
      console.error(`Batch ${batchId+1} done (code ${code}) - ${completed}/${batches.length} complete, ${rate.toFixed(1)} batches/min`);
      active--;
      runNext();
    });
  }
}
runNext();
