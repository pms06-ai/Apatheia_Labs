#!/usr/bin/env node
/**
 * Run All Engines via Sidecar
 * Queries document IDs from DB, sends requests to engine runner
 */

const { spawn } = require('child_process');
const path = require('path');
const Database = require('better-sqlite3');

const CONFIG = {
  dbPath: 'C:\\Users\\pstep\\AppData\\Roaming\\com.apatheia.phronesis\\phronesis.db',
  caseId: 'obsidian-vault',
  engineRunner: path.join(__dirname, '..', 'src-tauri', 'sidecars', 'engine-runner.js'),
  // Heuristic engines (no API needed) - can handle many docs
  heuristicEngines: [
    'documentary',
    'argumentation',
    'bias_detection',
    'accountability_audit',
    'professional_tracker',
  ],
  // AI engines (use Claude Code) - limit docs to avoid timeout
  aiEngines: [
    'entity_resolution',
    'temporal_parser',
    'contradiction',
    'omission',
    'expert_witness',
    'narrative',
    'coordination',
  ],
  timeout: 300000, // 5 minutes per AI engine
  maxDocsHeuristic: 200,
  maxDocsAI: 15, // Limit AI engines to avoid timeout
};

async function main() {
  console.log('='.repeat(70));
  console.log('APATHEIA ENGINE RUNNER');
  console.log('='.repeat(70));
  console.log(`Database: ${CONFIG.dbPath}`);
  console.log(`Case ID: ${CONFIG.caseId}`);
  console.log();

  // Get document IDs from database
  const db = new Database(CONFIG.dbPath, { readonly: true });

  // Get docs for heuristic engines (more docs OK)
  const heuristicDocs = db.prepare(`
    SELECT id FROM documents
    WHERE case_id = ? AND status = 'completed'
    ORDER BY filename
    LIMIT ?
  `).all(CONFIG.caseId, CONFIG.maxDocsHeuristic);

  // Get docs for AI engines (limited to avoid timeout)
  const aiDocs = db.prepare(`
    SELECT id FROM documents
    WHERE case_id = ? AND status = 'completed'
    ORDER BY filename
    LIMIT ?
  `).all(CONFIG.caseId, CONFIG.maxDocsAI);

  db.close();

  const heuristicDocIds = heuristicDocs.map(d => d.id);
  const aiDocIds = aiDocs.map(d => d.id);

  console.log(`Heuristic engines: ${heuristicDocIds.length} docs`);
  console.log(`AI engines: ${aiDocIds.length} docs`);
  console.log();

  // Results table
  const results = [];

  // Spawn engine runner process
  console.log('Starting engine runner...');
  const runner = spawn('node', [CONFIG.engineRunner], {
    stdio: ['pipe', 'pipe', 'pipe'],
    cwd: path.dirname(CONFIG.engineRunner),
  });

  // Capture stderr for logs
  runner.stderr.on('data', (data) => {
    const lines = data.toString().split('\n').filter(l => l.trim());
    lines.forEach(line => {
      if (!line.includes('[Sidecar]')) return;
      console.log(`  ${line}`);
    });
  });

  // Promise-based response handler
  let responseResolver = null;
  let responseBuffer = '';

  runner.stdout.on('data', (data) => {
    responseBuffer += data.toString();
    const lines = responseBuffer.split('\n');
    while (lines.length > 1) {
      const line = lines.shift();
      if (line.trim() && responseResolver) {
        try {
          const response = JSON.parse(line);
          responseResolver(response);
          responseResolver = null;
        } catch (e) {
          console.error(`Failed to parse response: ${line}`);
        }
      }
    }
    responseBuffer = lines[0] || '';
  });

  function sendRequest(engineId, docIds, timeoutMs) {
    return new Promise((resolve) => {
      const request = {
        engine_id: engineId,
        case_id: CONFIG.caseId,
        document_ids: docIds,
        options: {},
      };

      responseResolver = resolve;

      const timeout = setTimeout(() => {
        responseResolver = null;
        resolve({
          success: false,
          engine_id: engineId,
          error: 'Timeout',
          duration_ms: timeoutMs,
        });
      }, timeoutMs);

      runner.stdin.write(JSON.stringify(request) + '\n');

      const originalResolver = responseResolver;
      responseResolver = (response) => {
        clearTimeout(timeout);
        originalResolver(response);
      };
    });
  }

  const allEngines = [...CONFIG.heuristicEngines, ...CONFIG.aiEngines];
  console.log(`\nRunning ${allEngines.length} engines...\n`);
  console.log('| Engine                  | Type    | Status  | Findings | Duration |');
  console.log('|-------------------------|---------|---------|----------|----------|');

  // Run heuristic engines first (fast, no API)
  for (const engineId of CONFIG.heuristicEngines) {
    const response = await sendRequest(engineId, heuristicDocIds, 60000);

    const status = response.success ? 'OK' : 'FAIL';
    const findings = response.findings?.length || 0;
    const duration = (response.duration_ms / 1000).toFixed(1) + 's';
    const error = response.error ? ` (${response.error.slice(0, 25)})` : '';

    console.log(`| ${engineId.padEnd(23)} | HEUR    | ${status.padEnd(7)} | ${String(findings).padEnd(8)} | ${duration.padEnd(8)} |${error}`);

    results.push({ engine_id: engineId, success: response.success, findings, duration_ms: response.duration_ms, error: response.error });
  }

  // Run AI engines (slower, use Claude Code)
  for (const engineId of CONFIG.aiEngines) {
    const response = await sendRequest(engineId, aiDocIds, CONFIG.timeout);

    const status = response.success ? 'OK' : 'FAIL';
    const findings = response.findings?.length || 0;
    const duration = (response.duration_ms / 1000).toFixed(1) + 's';
    const error = response.error ? ` (${response.error.slice(0, 25)})` : '';

    console.log(`| ${engineId.padEnd(23)} | AI      | ${status.padEnd(7)} | ${String(findings).padEnd(8)} | ${duration.padEnd(8)} |${error}`);

    results.push({ engine_id: engineId, success: response.success, findings, duration_ms: response.duration_ms, error: response.error });
  }

  // Close runner
  runner.stdin.end();
  await new Promise(resolve => runner.on('close', resolve));

  // Summary
  console.log('\n' + '='.repeat(70));
  console.log('SUMMARY');
  console.log('='.repeat(70));

  const successful = results.filter(r => r.success).length;
  const totalFindings = results.reduce((sum, r) => sum + r.findings, 0);
  const totalDuration = results.reduce((sum, r) => sum + r.duration_ms, 0);

  console.log(`Engines run: ${results.length}`);
  console.log(`Successful: ${successful}/${results.length}`);
  console.log(`Total findings: ${totalFindings}`);
  console.log(`Total duration: ${(totalDuration / 1000).toFixed(1)}s`);

  const db2 = new Database(CONFIG.dbPath, { readonly: true });
  const dbFindings = db2.prepare('SELECT COUNT(*) as cnt FROM findings WHERE case_id = ?').get(CONFIG.caseId);
  db2.close();

  console.log(`Findings in DB: ${dbFindings.cnt}`);
  console.log('='.repeat(70));
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
