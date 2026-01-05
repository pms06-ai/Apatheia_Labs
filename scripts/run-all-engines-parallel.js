// Run ALL engines in parallel on PE23C50095 + Channel_4 corpus
const Database = require('better-sqlite3');
const { spawn } = require('child_process');
const path = require('path');

const DB_PATH = path.join(process.env.APPDATA, 'com.apatheia.phronesis', 'phronesis.db');
const CASE_ID = 'obsidian-vault';
const BATCH_SIZE = 50;
const CONCURRENCY_PER_ENGINE = 2;

const ENGINES = [
  'contradiction',
  'omission',
  'expert_witness',
  'narrative',
  'coordination',
  'entity_resolution',
  'temporal_parser',
  'documentary',
  'argumentation',
  'bias_detection',
  'accountability_audit',
  'professional_tracker'
];

const db = new Database(DB_PATH, { readonly: true });
const docs = db.prepare(`
  SELECT id
  FROM documents
  WHERE case_id = @case
    AND (storage_path LIKE @a OR storage_path LIKE @b)
    AND extracted_text IS NOT NULL
    AND LENGTH(extracted_text) > 100
  ORDER BY COALESCE(file_size, 0) ASC
`).all({ case: CASE_ID, a: '%PE23C50095%', b: '%Channel_4%' });

const docIds = docs.map(d => d.id);
console.error(`Total docs: ${docIds.length}`);

function chunk(arr, size) {
  const out = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

const batches = chunk(docIds, BATCH_SIZE);
console.error(`Batches per engine: ${batches.length}`);

// Track progress per engine
const progress = {};
ENGINES.forEach(e => progress[e] = { completed: 0, total: batches.length, findings: 0 });

const startTime = Date.now();
let totalActive = 0;

function runEngineBatch(engine, batchIdx, docIds, callback) {
  const child = spawn('node', ['src-tauri/sidecars/engine-runner.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let stdout = '';
  child.stdout.on('data', d => stdout += d.toString());
  child.stderr.on('data', d => {}); // suppress stderr

  child.stdin.write(JSON.stringify({
    engine_id: engine,
    case_id: CASE_ID,
    document_ids: docIds
  }) + '\n');
  child.stdin.end();

  child.on('close', code => {
    try {
      const resp = JSON.parse(stdout);
      if (resp.success && resp.findings) {
        progress[engine].findings += resp.findings.length;
      }
    } catch (e) {}
    callback(code);
  });
}

function runEngine(engine) {
  let batchIdx = 0;
  let active = 0;

  return new Promise(resolve => {
    function next() {
      if (batchIdx >= batches.length && active === 0) {
        return resolve();
      }
      while (active < CONCURRENCY_PER_ENGINE && batchIdx < batches.length) {
        const idx = batchIdx++;
        active++;
        totalActive++;
        runEngineBatch(engine, idx, batches[idx], (code) => {
          active--;
          totalActive--;
          progress[engine].completed++;
          next();
        });
      }
    }
    next();
  });
}

// Status reporter
const statusInterval = setInterval(() => {
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.error(`\n=== ${elapsed}s elapsed, ${totalActive} active ===`);
  ENGINES.forEach(e => {
    const p = progress[e];
    const pct = Math.round(p.completed / p.total * 100);
    console.error(`  ${e}: ${p.completed}/${p.total} (${pct}%) - ${p.findings} findings`);
  });
}, 30000);

// Run all engines in parallel
Promise.all(ENGINES.map(runEngine)).then(() => {
  clearInterval(statusInterval);
  const elapsed = Math.round((Date.now() - startTime) / 1000);
  console.error(`\n=== COMPLETE in ${elapsed}s ===`);
  ENGINES.forEach(e => {
    console.error(`  ${e}: ${progress[e].findings} findings`);
  });
  process.exit(0);
});

console.error(`Starting ${ENGINES.length} engines...`);
