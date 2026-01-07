#!/usr/bin/env node
/**
 * Phronesis FCIP - TypeScript Engine Runner Sidecar
 * 
 * Runs as a child process from the Rust backend.
 * Receives engine execution requests via stdin, returns results via stdout.
 * 
 * Protocol:
 * - Input: JSON-encoded EngineRequest (one per line)
 * - Output: JSON-encoded EngineResponse (one per line)
 * - Logs go to stderr (not stdout)
 */

import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import Database from 'better-sqlite3';
import Anthropic from '@anthropic-ai/sdk';
import { v4 as uuidv4 } from 'uuid';
import { executeJSONPrompt, checkClaudeCodeStatus } from './claude-code-client';

// =============================================================================
// Types (matching Rust structures)
// =============================================================================

interface EngineRequest {
  engine_id: string;
  case_id: string;
  document_ids: string[];
  options?: Record<string, unknown>;
}

interface EngineFinding {
  id: string;
  engine_id: string;
  finding_type: string;
  title: string;
  description: string;
  severity: string;
  confidence: number;
  document_ids: string[];
  evidence: unknown;
  metadata: unknown;
}

interface EngineResponse {
  success: boolean;
  engine_id: string;
  findings?: EngineFinding[];
  error?: string;
  duration_ms: number;
}

interface Document {
  id: string;
  case_id: string;
  filename: string;
  file_type: string;
  doc_type: string | null;
  extracted_text: string | null;
  created_at: string;
}

interface DocumentChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  content: string;
  page_number: number | null;
}

// =============================================================================
// Configuration
// =============================================================================

interface Config {
  anthropic_api_key?: string;
  database_path: string;
  use_claude_code?: boolean;
  mock_mode?: boolean;
}

function loadConfig(): Config {
  // Try to load from multiple locations
  const configPaths = [
    path.join(process.env.APPDATA || '', 'com.apatheia.phronesis', 'config.json'),
    path.join(process.env.HOME || '', '.phronesis', 'config.json'),
    path.join(__dirname, 'config.json'),
  ];

  for (const configPath of configPaths) {
    if (fs.existsSync(configPath)) {
      try {
        const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        log(`Loaded config from ${configPath}`);
        return config;
      } catch (e) {
        log(`Failed to parse config at ${configPath}: ${e}`);
      }
    }
  }

  // Fallback: use environment variables
  const appDataDir = process.env.APPDATA 
    ? path.join(process.env.APPDATA, 'com.apatheia.phronesis')
    : path.join(process.env.HOME || '.', '.phronesis');

  const fallbackConfig = {
    anthropic_api_key: process.env.ANTHROPIC_API_KEY,
    database_path: path.join(appDataDir, 'phronesis.db'),
  };
  
  return fallbackConfig;
}

// =============================================================================
// Logging (to stderr, not stdout)
// =============================================================================

function log(message: string, jobId?: string): void {
  const timestamp = new Date().toISOString()
  const jobPrefix = jobId ? `[Job:${jobId}]` : ''
  console.error(`[${timestamp}] [Sidecar] ${jobPrefix} ${message}`);
}

// =============================================================================
// Database Access
// =============================================================================

let readDb: Database.Database | null = null;
let writeDb: Database.Database | null = null;

/**
 * Get the read-only database connection (cached)
 */
function getDatabase(config: Config): Database.Database {
  if (!readDb) {
    if (!fs.existsSync(config.database_path)) {
      throw new Error(`Database not found at ${config.database_path}`);
    }
    readDb = new Database(config.database_path, { readonly: true });
    log(`Connected to database (read): ${config.database_path}`);
  }
  return readDb;
}

/**
 * Get the writable database connection (cached, single-writer)
 * Uses WAL mode for better concurrent read performance
 */
function getWriteDatabase(config: Config): Database.Database {
  if (!writeDb) {
    if (!fs.existsSync(config.database_path)) {
      throw new Error(`Database not found at ${config.database_path}`);
    }
    writeDb = new Database(config.database_path);
    // Enable WAL mode for better concurrency
    writeDb.pragma('journal_mode = WAL');
    log(`Connected to database (write): ${config.database_path}`);
  }
  return writeDb;
}

/**
 * Close all database connections (call on shutdown)
 */
function closeDatabases(): void {
  if (readDb) {
    readDb.close();
    readDb = null;
  }
  if (writeDb) {
    writeDb.close();
    writeDb = null;
  }
  log('Database connections closed');
}

function loadDocuments(config: Config, documentIds: string[]): Document[] {
  try {
    const database = getDatabase(config);
    const placeholders = documentIds.map(() => '?').join(',');
    const stmt = database.prepare(`
      SELECT id, case_id, filename, file_type, doc_type, extracted_text, created_at
      FROM documents
      WHERE id IN (${placeholders})
    `);
    return stmt.all(...documentIds) as Document[];
  } catch (e) {
    log(`Database error loading documents: ${e}`);
    return [];
  }
}

function loadDocumentContent(config: Config, documentId: string): string {
  try {
    const database = getDatabase(config);

    // First try to get from document's extracted_text
    const docStmt = database.prepare('SELECT extracted_text FROM documents WHERE id = ?');
    const doc = docStmt.get(documentId) as { extracted_text: string | null } | undefined;

    if (doc?.extracted_text) {
      return doc.extracted_text;
    }

    // Fall back to chunks
    const chunksStmt = database.prepare(`
      SELECT content FROM document_chunks
      WHERE document_id = ?
      ORDER BY chunk_index
    `);
    const chunks = chunksStmt.all(documentId) as { content: string }[];
    return chunks.map(c => c.content).join('\n\n');
  } catch (e) {
    log(`Database error loading document content for ${documentId}: ${e}`);
    return '';
  }
}

function saveFindings(config: Config, caseId: string, findings: EngineFinding[]): void {
  try {
    // Use shared write connection
    const database = getWriteDatabase(config);

    const stmt = database.prepare(`
      INSERT INTO findings (id, case_id, engine, title, description, finding_type, severity, confidence, document_ids, entity_ids, regulatory_targets, evidence, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', '[]', ?, '{}', datetime('now'))
    `);

    // Use transaction for atomicity and better performance
    const insertMany = database.transaction((items: EngineFinding[]) => {
      for (const finding of items) {
        stmt.run(
          finding.id,
          caseId,
          finding.engine_id,
          finding.title,
          finding.description,
          finding.finding_type,
          finding.severity,
          finding.confidence,
          JSON.stringify(finding.document_ids),
          JSON.stringify(finding.evidence)
        );
      }
    });

    insertMany(findings);
    log(`Saved ${findings.length} findings to database`);
  } catch (e) {
    log(`Database error saving findings: ${e}`);
    // Don't throw - findings are still returned to caller even if DB save fails
  }
}

// =============================================================================
// AI Client
// =============================================================================

let anthropic: Anthropic | null = null;

function getAI(config: Config): Anthropic {
  if (!anthropic) {
    if (!config.anthropic_api_key) {
      throw new Error('ANTHROPIC_API_KEY not configured');
    }
    anthropic = new Anthropic({ apiKey: config.anthropic_api_key });
  }
  return anthropic;
}

/**
 * Retry a function with exponential backoff
 */
async function callWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 1000,
  maxDelayMs: number = 10_000
): Promise<T> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (e: unknown) {
      lastError = e instanceof Error ? e : new Error(String(e));
      const errorMessage = lastError.message.toLowerCase();

      // Don't retry on non-retryable errors (auth/config issues)
      if (
        errorMessage.includes('invalid api key') ||
        errorMessage.includes('authentication') ||
        errorMessage.includes('not configured')
      ) {
        throw lastError;
      }

      // Retry on rate limits, network errors, server errors
      const isRetryable =
        errorMessage.includes('rate limit') ||
        errorMessage.includes('timeout') ||
        errorMessage.includes('network') ||
        errorMessage.includes('overloaded') ||
        errorMessage.includes('529') ||
        errorMessage.includes('500') ||
        errorMessage.includes('502') ||
        errorMessage.includes('503') ||
        errorMessage.includes('504');

      if (!isRetryable) {
        throw lastError;
      }

      // Exponential backoff with jitter, capped
      const backoff = Math.min(baseDelayMs * Math.pow(2, attempt), maxDelayMs);
      const jitter = Math.floor(Math.random() * 250); // up to 250ms jitter
      const delay = backoff + jitter;

      log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms: ${lastError.message}`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error('Max retries exceeded');
}

/**
 * Generate JSON response using either Claude Code or direct API
 */
async function generateJSON(config: Config, systemPrompt: string, userContent: string): Promise<unknown> {
  // Use Claude Code if configured
  if (config.use_claude_code) {
    log('Using Claude Code for AI request');
    const result = await executeJSONPrompt(systemPrompt, userContent, { timeout: 180000 });
    
    if (!result.success) {
      throw new Error(`Claude Code error: ${result.error}`);
    }
    
    return result.result;
  }
  
  // Use direct API with retry logic
  const ai = getAI(config);

  const response = await callWithRetry(async () => {
    return ai.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 4096,
      temperature: 0.1,
      system: systemPrompt,
      messages: [{ role: 'user', content: userContent }],
    });
  });
  
  const content = response.content[0];
  if (content.type !== 'text') {
    throw new Error('Unexpected response type');
  }
  
  // Extract JSON from response
  const text = content.text;
  // Use non-greedy matching to avoid over-matching when there's trailing content
  const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*?\}(?=\s*$)/);
  const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : text;

  try {
    return JSON.parse(jsonStr);
  } catch (parseError) {
    log(`JSON parse failed: ${parseError}`);
    log(`Raw response (first 500 chars): ${text.slice(0, 500)}`);
    // Return a structured error object that engines can handle
    return {
      _parseError: true,
      error: `Failed to parse AI response: ${parseError}`,
      raw: text.slice(0, 1000)
    };
  }
}

// =============================================================================
// Security: Prompt Sanitization
// =============================================================================

/**
 * Sanitize document content before embedding in prompts to prevent injection attacks.
 * This prevents malicious content from breaking out of the document context.
 */
function sanitizeForPrompt(content: string, maxLength: number = 50000): string {
  if (!content) return '';

  return content
    // Replace markdown horizontal rules that could break document boundaries
    .replace(/---+/g, '—')
    // Replace code blocks that could inject fake system prompts
    .replace(/```/g, "'''")
    // Replace potential injection markers
    .replace(/<\/?system>/gi, '[system]')
    .replace(/<\/?user>/gi, '[user]')
    .replace(/<\/?assistant>/gi, '[assistant]')
    // Limit length
    .slice(0, maxLength);
}

/**
 * Sanitize a filename for safe display
 */
function sanitizeFilename(filename: string): string {
  if (!filename) return 'unknown';

  return filename
    .replace(/[<>:"/\\|?*]/g, '_')
    .slice(0, 200);
}

// =============================================================================
// Engine Implementations
// =============================================================================

type EngineExecutor = (
  config: Config,
  caseId: string,
  documentIds: string[],
  options?: Record<string, unknown>
) => Promise<EngineFinding[]>;

// Contradiction Engine
const contradictionEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const docs = loadDocuments(config, documentIds);
  
  if (docs.length < 2) {
    return [{
      id: uuidv4(),
      engine_id: 'contradiction',
      finding_type: 'error',
      title: 'Insufficient documents',
      description: 'Contradiction detection requires at least 2 documents',
      severity: 'info',
      confidence: 1,
      document_ids: documentIds,
      evidence: {},
      metadata: {},
    }];
  }
  
  // Build document contents with sanitization
  const docContents = docs.map(doc => {
    const content = loadDocumentContent(config, doc.id);
    return {
      id: doc.id,
      name: sanitizeFilename(doc.filename),
      type: doc.doc_type,
      content: sanitizeForPrompt(content, 50000),
    };
  });

  const formattedDocs = docContents.map(d =>
    `=== DOCUMENT: ${d.name} (ID: ${d.id}, Type: ${d.type || 'unknown'}) ===\n${d.content}`
  ).join('\n\n~~~\n\n');
  
  const prompt = `Find all contradictions between statements in these documents.

DOCUMENTS TO ANALYZE:
${formattedDocs}

Types of contradictions:
1. DIRECT: Explicit opposite statements
2. IMPLICIT: Logically incompatible claims
3. TEMPORAL: Timeline inconsistencies
4. QUANTITATIVE: Number/measurement discrepancies
5. ATTRIBUTIONAL: Different people credited for same action

For each contradiction, provide:
- type: The contradiction type
- severity: critical/high/medium/low
- claim1: { documentId, text, date, author, pageRef }
- claim2: { documentId, text, date, author, pageRef }
- explanation: Why these contradict
- implication: Impact on case

Respond in JSON:
{
  "contradictions": [...]
}`;

  const result = await generateJSON(config, 'You are a forensic document analyst.', prompt) as {
    contradictions: Array<{
      type: string;
      severity: string;
      claim1: { documentId: string; text: string };
      claim2: { documentId: string; text: string };
      explanation: string;
      implication: string;
    }>;
  };
  
  return (result.contradictions || []).map((c, idx) => ({
    id: uuidv4(),
    engine_id: 'contradiction',
    finding_type: c.type,
    title: `${c.type} contradiction detected`,
    description: c.explanation,
    severity: c.severity,
    confidence: 0.8,
    document_ids: [c.claim1.documentId, c.claim2.documentId].filter(Boolean),
    evidence: {
      claim1: c.claim1,
      claim2: c.claim2,
      implication: c.implication,
    },
    metadata: {},
  }));
    };

    // Omission Engine
const omissionEngine: EngineExecutor = async (config, caseId, documentIds) => {
      if (documentIds.length < 2) {
    return [{
      id: uuidv4(),
      engine_id: 'omission',
      finding_type: 'error',
      title: 'Insufficient documents',
      description: 'Omission detection requires at least 2 documents (source and report)',
      severity: 'info',
      confidence: 1,
      document_ids: documentIds,
      evidence: {},
      metadata: {},
    }];
  }
  
  const [sourceId, ...reportIds] = documentIds;
  const sourceContent = loadDocumentContent(config, sourceId);
  const sourceDoc = loadDocuments(config, [sourceId])[0];
  
  const findings: EngineFinding[] = [];
  
  for (const reportId of reportIds) {
    const reportContent = loadDocumentContent(config, reportId);
    const reportDoc = loadDocuments(config, [reportId])[0];
    
    const prompt = `Compare the SOURCE DOCUMENT against the PROFESSIONAL REPORT to identify what was omitted.

SOURCE DOCUMENT (${sanitizeFilename(sourceDoc?.filename || 'Unknown')}):
${sanitizeForPrompt(sourceContent, 40000)}

PROFESSIONAL REPORT (${sanitizeFilename(reportDoc?.filename || 'Unknown')}):
${sanitizeForPrompt(reportContent, 40000)}

Find omissions:
1. COMPLETE_OMISSION: Information in source entirely absent from report
2. SELECTIVE_QUOTE: Partial quotation that changes meaning
3. CONTEXT_REMOVAL: Quote used but surrounding context omitted
4. TEMPORAL_GAP: Events in source not reflected in report timeline

Respond in JSON:
{
  "omissions": [
    {
      "type": "complete_omission|selective_quote|context_removal|temporal_gap",
      "severity": "critical|high|medium|low",
      "sourceContent": "...",
      "omittedContent": "...",
      "reportContent": "...",
      "biasDirection": "pro_applicant|pro_respondent|pro_authority|neutral",
      "significance": 0-100,
      "explanation": "..."
    }
  ],
  "systematicPattern": true/false
}`;

    const result = await generateJSON(config, 'You are a forensic document analyst.', prompt) as {
      omissions: Array<{
        type: string;
        severity: string;
        sourceContent: string;
        omittedContent: string;
        reportContent?: string;
        biasDirection?: string;
        significance: number;
        explanation: string;
      }>;
      systematicPattern: boolean;
    };
    
    for (const [idx, o] of (result.omissions || []).entries()) {
      findings.push({
        id: uuidv4(),
        engine_id: 'omission',
        finding_type: o.type,
        title: `${o.type.replace('_', ' ')} detected`,
        description: o.explanation,
        severity: o.severity,
        confidence: o.significance / 100,
        document_ids: [sourceId, reportId],
        evidence: {
          sourceContent: o.sourceContent,
          omittedContent: o.omittedContent,
          reportContent: o.reportContent,
          biasDirection: o.biasDirection,
        },
        metadata: { systematicPattern: result.systematicPattern },
      });
    }
  }
  
  return findings;
};

// Expert Witness Engine
const expertWitnessEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const docs = loadDocuments(config, documentIds);
  const reportDoc = docs[0];
  
  if (!reportDoc) {
    return [];
  }
  
  const reportContent = loadDocumentContent(config, reportDoc.id);
  
  const prompt = `Analyze this expert witness report for compliance with PD25B and CPR Part 35 (UK).

EXPERT REPORT:
${sanitizeForPrompt(reportContent, 60000)}

Evaluate for:
1. SCOPE_EXCEEDED: Opinions outside stated expertise
2. INSTRUCTIONS_VIOLATED: Non-compliance with instructions
3. METHODOLOGY_FLAWED: Unreliable or unstated methodology
4. IMPARTIALITY_BREACH: Bias or advocacy for one party
5. DISCLOSURE_MISSING: Undisclosed conflicts or limitations

Respond in JSON:
{
  "violations": [
    {
      "type": "scope_exceeded|instructions_violated|methodology_flawed|impartiality_breach|disclosure_missing",
      "severity": "critical|high|medium|low",
      "title": "...",
      "description": "...",
      "quote": "...",
      "recommendation": "..."
    }
  ],
  "summary": {
    "overallAssessment": "compliant|minor_issues|significant_concerns|non_compliant",
    "criticalCount": 0,
    "professionalRegistration": "..."
  }
}`;

  const result = await generateJSON(config, 'You are a legal expert on expert witness standards.', prompt) as {
    violations: Array<{
      type: string;
      severity: string;
      title: string;
      description: string;
      quote?: string;
      recommendation?: string;
    }>;
    summary: { overallAssessment: string; criticalCount: number };
  };
  
  return (result.violations || []).map((v, idx) => ({
    id: uuidv4(),
    engine_id: 'expert_witness',
    finding_type: v.type,
    title: v.title,
    description: v.description,
    severity: v.severity,
    confidence: 0.85,
    document_ids: [reportDoc.id],
    evidence: {
      quote: v.quote,
      recommendation: v.recommendation,
    },
    metadata: { summary: result.summary },
  }));
};

// Narrative Engine
const narrativeEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const docs = loadDocuments(config, documentIds);
  
  if (docs.length < 2) {
      return [];
  }
  
  // Sort by date (create a copy to avoid mutating the original array)
  const sortedDocs = [...docs].sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
  
  const docContents = sortedDocs.map(doc => ({
    id: doc.id,
    name: sanitizeFilename(doc.filename),
    date: doc.created_at,
    content: sanitizeForPrompt(loadDocumentContent(config, doc.id), 30000),
  }));

  const prompt = `Track how claims and narratives evolve across these documents over time.

DOCUMENTS (chronological order):
${docContents.map(d => `=== ${d.name} (${d.date}) ===\n${d.content}`).join('\n\n~~~\n\n')}

Identify:
1. STABLE: Claims that remain consistent
2. AMPLIFICATION: Claims that become stronger/more certain
3. MINIMIZATION: Claims that become weaker/qualified
4. MUTATION: Claims that change meaning
5. EMERGENCE: New claims that appear without prior basis
6. DISAPPEARANCE: Claims that vanish from later documents

Respond in JSON:
{
  "evolutions": [
    {
      "claim": "...",
      "drift_type": "stable|amplification|minimization|mutation|emergence|disappearance",
      "severity": "critical|high|medium|low",
      "versions": [
        { "documentId": "...", "text": "...", "date": "..." }
      ],
      "explanation": "...",
      "significance": "..."
    }
  ],
  "overallPattern": "..."
}`;

  const result = await generateJSON(config, 'You are a forensic narrative analyst.', prompt) as {
    evolutions: Array<{
      claim: string;
      drift_type: string;
      severity: string;
      versions: Array<{ documentId: string; text: string; date: string }>;
      explanation: string;
      significance: string;
    }>;
    overallPattern: string;
  };
  
  return (result.evolutions || []).filter(e => e.drift_type !== 'stable').map((e, idx) => ({
    id: uuidv4(),
    engine_id: 'narrative',
    finding_type: e.drift_type,
    title: `${e.drift_type}: ${e.claim.slice(0, 50)}...`,
    description: e.explanation,
    severity: e.severity,
    confidence: 0.75,
    document_ids: e.versions.map(v => v.documentId),
    evidence: {
      claim: e.claim,
      versions: e.versions,
      significance: e.significance,
    },
    metadata: { overallPattern: result.overallPattern },
  }));
};

// Coordination Engine
const coordinationEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const docs = loadDocuments(config, documentIds);
  
  if (docs.length < 2) {
    return [];
  }
  
  const docContents = docs.map(doc => ({
    id: doc.id,
    name: sanitizeFilename(doc.filename),
    type: doc.doc_type,
    content: sanitizeForPrompt(loadDocumentContent(config, doc.id), 30000),
  }));

  const prompt = `Detect hidden coordination between documents that should be independent.

DOCUMENTS:
${docContents.map(d => `=== ${d.name} (Type: ${d.type || 'unknown'}) ===\n${d.content}`).join('\n\n~~~\n\n')}

Look for:
1. SHARED_LANGUAGE: Identical or near-identical phrasing across supposedly independent sources
2. INFORMATION_FLOW: Information appearing in documents before it should be known
3. SYNCHRONIZED_CONCLUSIONS: Conclusions that align too precisely
4. CIRCULAR_CITATION: Documents citing each other's unverified claims as fact
5. UNDISCLOSED_CONTACT: Evidence of undisclosed communication between authors

Respond in JSON:
{
  "coordinationSignals": [
    {
      "type": "shared_language|information_flow|synchronized_conclusions|circular_citation|undisclosed_contact",
      "severity": "critical|high|medium|low",
      "documents": ["docId1", "docId2"],
      "evidence": {
        "text1": "...",
        "text2": "..."
      },
      "explanation": "...",
      "implication": "..."
    }
  ],
  "independenceScore": 0-100,
  "concernLevel": "none|low|moderate|high|severe"
}`;

  const result = await generateJSON(config, 'You are an analyst detecting institutional coordination.', prompt) as {
    coordinationSignals: Array<{
      type: string;
      severity: string;
      documents: string[];
      evidence: { text1: string; text2: string };
      explanation: string;
      implication: string;
    }>;
    independenceScore: number;
    concernLevel: string;
  };
  
  return (result.coordinationSignals || []).map((s, idx) => ({
    id: uuidv4(),
    engine_id: 'coordination',
    finding_type: s.type,
    title: `${s.type.replace('_', ' ')} detected`,
    description: s.explanation,
    severity: s.severity,
    confidence: (100 - result.independenceScore) / 100,
    document_ids: s.documents,
    evidence: {
      ...s.evidence,
      implication: s.implication,
    },
    metadata: {
      independenceScore: result.independenceScore,
      concernLevel: result.concernLevel,
    },
  }));
};

// Entity Resolution Engine
const entityResolutionEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const docs = loadDocuments(config, documentIds);
  
  const allContent = docs.map(doc => sanitizeForPrompt(loadDocumentContent(config, doc.id), 40000)).join('\n\n~~~\n\n');

  const prompt = `Extract all named entities and resolve aliases/references to canonical identities.

DOCUMENTS:
${allContent.slice(0, 80000)}

For each entity, identify:
1. Canonical name (primary identifier)
2. All aliases and variations
3. Entity type: person|organization|professional|institution|court|police|social_services|expert|media|other
4. Role in the case
5. Professional registration if applicable

Respond in JSON:
{
  "entities": [
    {
      "canonicalName": "...",
      "aliases": ["..."],
      "entityType": "...",
      "role": "...",
      "institution": "...",
      "professionalRegistration": "...",
      "mentionCount": 0
    }
  ],
  "unresolvedReferences": ["..."]
}`;

  const result = await generateJSON(config, 'You are an entity resolution specialist.', prompt) as {
    entities: Array<{
      canonicalName: string;
      aliases: string[];
      entityType: string;
      role?: string;
      institution?: string;
      professionalRegistration?: string;
      mentionCount: number;
    }>;
    unresolvedReferences: string[];
  };
  
  // Save entities to database using shared write connection
  const database = getWriteDatabase(config);
  const stmt = database.prepare(`
    INSERT OR REPLACE INTO entities (id, case_id, canonical_name, entity_type, aliases, role, institution, professional_registration, credibility_score, metadata, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1.0, '{}', datetime('now'), datetime('now'))
  `);
  
  // Use transaction for atomicity
  const insertEntities = database.transaction((entities: typeof result.entities) => {
    for (const entity of entities || []) {
      const id = `entity-${caseId.slice(0, 8)}-${entity.canonicalName.toLowerCase().replace(/\s+/g, '-').slice(0, 20)}`;
      stmt.run(
        id,
        caseId,
        entity.canonicalName,
        entity.entityType,
        JSON.stringify(entity.aliases),
        entity.role || null,
        entity.institution || null,
        entity.professionalRegistration || null
      );
    }
  });
  
  insertEntities(result.entities);
  
  return [{
    id: uuidv4(),
    engine_id: 'entity_resolution',
    finding_type: 'extraction',
    title: `Resolved ${result.entities?.length || 0} entities`,
    description: `Found ${result.entities?.length || 0} unique entities with ${result.unresolvedReferences?.length || 0} unresolved references`,
    severity: 'info',
    confidence: 0.9,
    document_ids: documentIds,
    evidence: {
      entityCount: result.entities?.length || 0,
      unresolvedReferences: result.unresolvedReferences,
    },
    metadata: {},
  }];
};

// Temporal Engine
const temporalParserEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const docs = loadDocuments(config, documentIds);
  
  const docContents = docs.map(doc => ({
    id: doc.id,
    name: sanitizeFilename(doc.filename),
    content: sanitizeForPrompt(loadDocumentContent(config, doc.id), 40000),
  }));

  const prompt = `Extract all dates, events, and timeline information. Detect inconsistencies.

DOCUMENTS:
${docContents.map(d => `=== ${d.name} ===\n${d.content}`).join('\n\n~~~\n\n')}

For each event:
1. Date (as precise as possible)
2. Description
3. Source document
4. Entities involved

Also identify:
- TIMELINE_GAPS: Missing periods where something should be documented
- SEQUENCE_VIOLATIONS: Events claimed to happen in impossible order
- DATE_CONFLICTS: Same event dated differently in different documents
- DEADLINE_BREACHES: Missed statutory or court deadlines

Respond in JSON:
{
  "events": [
    {
      "date": "YYYY-MM-DD",
      "time": "HH:MM or null",
      "precision": "exact|day|week|month|year",
      "description": "...",
      "eventType": "...",
      "sourceDocumentId": "...",
      "sourcePage": null,
      "entityIds": []
    }
  ],
  "anomalies": [
    {
      "type": "timeline_gap|sequence_violation|date_conflict|deadline_breach",
      "severity": "critical|high|medium|low",
      "description": "...",
      "affectedDates": ["..."],
      "explanation": "..."
    }
  ]
}`;

  const result = await generateJSON(config, 'You are a timeline analyst.', prompt) as {
    events: Array<{
      date: string;
      time?: string;
      precision: string;
      description: string;
      eventType?: string;
      sourceDocumentId?: string;
      sourcePage?: number;
    }>;
    anomalies: Array<{
      type: string;
      severity: string;
      description: string;
      affectedDates: string[];
      explanation: string;
    }>;
  };
  
  // Save events to database using shared write connection
  const database = getWriteDatabase(config);
  const eventStmt = database.prepare(`
    INSERT OR REPLACE INTO timeline_events (id, case_id, event_date, event_time, date_precision, description, event_type, source_document_id, source_page, entity_ids, is_anomaly, anomaly_type, anomaly_notes, metadata, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, '[]', 0, null, null, '{}', datetime('now'))
  `);
  
  // Use transaction for atomicity
  const insertEvents = database.transaction((events: typeof result.events) => {
    for (const [idx, event] of (events || []).entries()) {
      eventStmt.run(
        `event-${caseId.slice(0, 8)}-${idx}`,
        caseId,
        event.date,
        event.time || null,
        event.precision,
        event.description,
        event.eventType || null,
        event.sourceDocumentId || null,
        event.sourcePage || null
      );
    }
  });
  
  insertEvents(result.events);
  
  const findings: EngineFinding[] = (result.anomalies || []).map((a, idx) => ({
    id: uuidv4(),
    engine_id: 'temporal',
    finding_type: a.type,
    title: `${a.type.replace('_', ' ')}: ${a.description.slice(0, 50)}...`,
    description: a.explanation,
    severity: a.severity,
    confidence: 0.8,
    document_ids: documentIds,
    evidence: {
      affectedDates: a.affectedDates,
    },
    metadata: {},
  }));
  
  // Add summary finding
  findings.push({
    id: uuidv4(),
    engine_id: 'temporal',
    finding_type: 'timeline_extracted',
    title: `Extracted ${result.events?.length || 0} timeline events`,
    description: `Found ${result.anomalies?.length || 0} timeline anomalies`,
    severity: 'info',
    confidence: 0.9,
    document_ids: documentIds,
    evidence: { eventCount: result.events?.length || 0 },
    metadata: {},
  });
  
  return findings;
};

// =============================================================================
// Missing Engines - Heuristic-first implementations
// =============================================================================

const documentaryEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const findings: EngineFinding[] = [];
  const docs = loadDocuments(config, documentIds);

  for (const doc of docs) {

    // Heuristic: Look for editorial patterns in document names or content
    const hasEditorialIndicators = doc.filename.toLowerCase().includes('draft') ||
                                  doc.filename.toLowerCase().includes('version') ||
                                  (doc.extracted_text && doc.extracted_text.includes('redacted'));

    if (hasEditorialIndicators) {
      findings.push({
        id: uuidv4(),
        engine_id: 'documentary',
        finding_type: 'editorial_manipulation',
        title: 'Potential Editorial Manipulation Detected',
        description: `Document "${doc.filename}" shows signs of editorial changes or redaction`,
        severity: 'medium',
        confidence: 0.6,
        document_ids: [doc.id],
        evidence: {
          indicators: hasEditorialIndicators ? ['filename_suggests_draft', 'content_redaction'] : []
        },
        metadata: {},
      });
    }
  }

  return findings;
};

const argumentationEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const findings: EngineFinding[] = [];
  const docs = loadDocuments(config, documentIds);

  for (const doc of docs) {
    if (!doc.extracted_text) continue;

    // Heuristic: Look for Toulmin argument structures
    const text = doc.extracted_text.toLowerCase();
    const hasArgumentIndicators = text.includes('therefore') ||
                                  text.includes('because') ||
                                  text.includes('evidence shows') ||
                                  text.includes('grounds') ||
                                  text.includes('warrant');

    if (hasArgumentIndicators) {
      findings.push({
        id: uuidv4(),
        engine_id: 'argumentation',
        finding_type: 'argument_structure',
        title: 'Argument Structure Detected',
        description: `Document contains structured argumentation patterns`,
        severity: 'low',
        confidence: 0.5,
        document_ids: [doc.id],
        evidence: {
          argumentIndicators: hasArgumentIndicators
        },
        metadata: {},
      });
    }
  }

  return findings;
};

const biasDetectionEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const findings: EngineFinding[] = [];
  const docs = loadDocuments(config, documentIds);

  for (const doc of docs) {
    if (!doc.extracted_text) continue;

    // Heuristic: Look for biased language patterns
    const text = doc.extracted_text.toLowerCase();
    const biasIndicators = [];
    if (text.includes('clearly') || text.includes('obviously')) biasIndicators.push('certainty_bias');
    if (text.match(/\balways\b|\bnever\b/g)) biasIndicators.push('absolutist_language');
    if (text.includes('typical') || text.includes('normally')) biasIndicators.push('generalization');

    if (biasIndicators.length > 0) {
      findings.push({
        id: uuidv4(),
        engine_id: 'bias_detection',
        finding_type: 'cognitive_bias',
        title: 'Potential Cognitive Bias Detected',
        description: `Document contains language patterns that may indicate bias`,
        severity: 'medium',
        confidence: 0.4,
        document_ids: [doc.id],
        evidence: {
          biasIndicators
        },
        metadata: {},
      });
    }
  }

  return findings;
};

const accountabilityAuditEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const findings: EngineFinding[] = [];
  const docs = loadDocuments(config, documentIds);

  for (const doc of docs) {
    if (!doc.extracted_text) continue;

    // Heuristic: Look for statutory duty language
    const text = doc.extracted_text.toLowerCase();
    const dutyIndicators = [];
    if (text.includes('duty') || text.includes('obligation')) dutyIndicators.push('duty_language');
    if (text.includes('must') || text.includes('shall')) dutyIndicators.push('mandatory_language');
    if (text.includes('regulation') || text.includes('statutory')) dutyIndicators.push('regulatory_language');

    if (dutyIndicators.length > 0) {
      findings.push({
        id: uuidv4(),
        engine_id: 'accountability_audit',
        finding_type: 'statutory_compliance',
        title: 'Statutory Duty Reference Found',
        description: `Document contains references to statutory duties and obligations`,
        severity: 'low',
        confidence: 0.3,
        document_ids: [doc.id],
        evidence: {
          dutyIndicators
        },
        metadata: {},
      });
    }
  }

  return findings;
};

const professionalTrackerEngine: EngineExecutor = async (config, caseId, documentIds) => {
  const findings: EngineFinding[] = [];

  // Get all documents to analyze professional behavior across corpus
  const allDocs = loadDocuments(config, documentIds);

  // Heuristic: Group documents by professional mentions and look for inconsistencies
  const professionalMentions = new Map<string, string[]>();

  for (const doc of allDocs) {
    if (!doc || !doc.extracted_text) continue;

    const text = doc.extracted_text.toLowerCase();
    // Simple entity extraction - look for capitalized names that might be professionals
    const nameMatches = text.match(/\b[A-Z][a-z]+ [A-Z][a-z]+\b/g) || [];

    for (const name of nameMatches) {
      if (!professionalMentions.has(name)) {
        professionalMentions.set(name, []);
      }
      professionalMentions.get(name)!.push(doc.id);
    }
  }

  // Flag professionals who appear in multiple documents (potential tracking opportunity)
  for (const [professional, docIds] of professionalMentions) {
    if (docIds.length > 1) {
      findings.push({
        id: uuidv4(),
        engine_id: 'professional_tracker',
        finding_type: 'professional_presence',
        title: `Professional "${professional}" appears across documents`,
        description: `Individual appears in ${docIds.length} documents, enabling behavior pattern analysis`,
        severity: 'low',
        confidence: 0.5,
        document_ids: docIds,
        evidence: {
          professional: professional,
          documentCount: docIds.length
        },
        metadata: {},
      });
    }
  }

  return findings;
};

// =============================================================================
// Prompt Executor - Generic AI prompt execution for S.A.M. and other uses
// =============================================================================

const promptExecutorEngine: EngineExecutor = async (config, caseId, documentIds, options) => {
  const systemPrompt = options?.system_prompt as string;
  const userContent = options?.user_content as string;

  if (!systemPrompt || !userContent) {
    throw new Error('prompt_executor requires system_prompt and user_content in options');
  }

  log(`Executing prompt_executor with ${userContent.length} chars of content`);

  const result = await generateJSON(config, systemPrompt, userContent);

  // Check for parse errors from generateJSON
  if (result && typeof result === 'object' && '_parseError' in result) {
    throw new Error(`AI response parse error: ${(result as { error?: string }).error || 'Unknown error'}`);
  }

  return [{
    id: uuidv4(),
    engine_id: 'prompt_executor',
    finding_type: 'ai_response',
    title: 'AI Response',
    description: 'Raw AI response from prompt execution',
    severity: 'info',
    confidence: 1.0,
    document_ids: documentIds,
    evidence: result,  // The actual AI response JSON goes here
    metadata: { prompt_length: userContent.length },
  }];
};

// =============================================================================
// Engine Registry
// =============================================================================

const engines: Record<string, EngineExecutor> = {
  // Canonical engine names
  'contradiction': contradictionEngine,
  'omission': omissionEngine,
  'expert_witness': expertWitnessEngine,
  'narrative': narrativeEngine,
  'coordination': coordinationEngine,
  'entity_resolution': entityResolutionEngine,
  'temporal_parser': temporalParserEngine,
  'documentary': documentaryEngine,
  'argumentation': argumentationEngine,
  'bias_detection': biasDetectionEngine,
  'accountability_audit': accountabilityAuditEngine,
  'professional_tracker': professionalTrackerEngine,
  // Generic prompt executor for S.A.M. and custom prompts
  'prompt_executor': promptExecutorEngine,
};

// =============================================================================
// Engine ID Normalization
// =============================================================================

/**
 * Normalize engine IDs to canonical form with alias support
 */
function normalizeEngineId(engineId: string): string {
  // Handle aliases
  const aliases: Record<string, string> = {
    'temporal': 'temporal_parser', // legacy alias
    // Add other aliases as needed
  };

  return aliases[engineId] || engineId;
}

// =============================================================================
// Request Handler
// =============================================================================

async function executeRequest(config: Config, request: EngineRequest): Promise<EngineResponse> {
  const startTime = Date.now();

  try {
    // Normalize engine ID to canonical form
    const normalizedId = normalizeEngineId(request.engine_id);
    const executor = engines[normalizedId];
    
    if (!executor) {
      return {
        success: false,
        engine_id: request.engine_id,
        error: `Unknown engine: ${request.engine_id} (normalized: ${normalizedId}). Available: ${Object.keys(engines).join(', ')}`,
        duration_ms: Date.now() - startTime,
      };
    }

    log(`Executing engine: ${request.engine_id} (normalized: ${normalizedId})`, request.case_id);

    const findings = await executor(config, request.case_id, request.document_ids, request.options);

    // Save findings to database
    if (findings.length > 0) {
      try {
        saveFindings(config, request.case_id, findings);
      } catch (e) {
        log(`Warning: Failed to save findings: ${e}`, request.case_id);
      }
    }

    log(`Engine ${request.engine_id} completed with ${findings.length} findings`, request.case_id);
    
    return {
      success: true,
      engine_id: request.engine_id,
      findings,
      duration_ms: Date.now() - startTime,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log(`Engine ${request.engine_id} failed: ${errorMessage}`, request.case_id);
    
    return {
      success: false,
      engine_id: request.engine_id,
      error: errorMessage,
      duration_ms: Date.now() - startTime,
    };
  }
}

// =============================================================================
// Main Entry Point
// =============================================================================

async function main(): Promise<void> {
  log('Starting engine runner...');
  
  const config = loadConfig();
  log(`Database: ${config.database_path}`);
  log(`Anthropic API: ${config.anthropic_api_key ? 'configured' : 'NOT CONFIGURED'}`);
  log(`Use Claude Code: ${config.use_claude_code ? 'YES' : 'NO'}`);
  
  // Check Claude Code status if enabled
  if (config.use_claude_code) {
    const ccStatus = checkClaudeCodeStatus();
    log(`Claude Code installed: ${ccStatus.installed ? `YES (${ccStatus.version})` : 'NO'}`);
    if (!ccStatus.installed) {
      log(`WARNING: Claude Code not available - ${ccStatus.error}`);
    }
  }
  
  log(`Available engines: ${Object.keys(engines).join(', ')}`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  // Track pending requests to wait for them before shutdown
  let pendingRequests = 0;
  let shutdownRequested = false;

  const checkShutdown = () => {
    if (shutdownRequested && pendingRequests === 0) {
      log('Shutting down...');
      closeDatabases();
      process.exit(0);
    }
  };

  rl.on('line', async (line) => {
    pendingRequests++;
    try {
      const request: EngineRequest = JSON.parse(line);
      log(`Received request: engine=${request.engine_id}, case=${request.case_id}, docs=${request.document_ids.length}`);

      const response = await executeRequest(config, request);

      // Write response to stdout (this is the IPC channel)
      console.log(JSON.stringify(response));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      log(`Request parse error: ${errorMessage}`);

      console.log(JSON.stringify({
        success: false,
        engine_id: 'unknown',
        error: `Failed to parse request: ${errorMessage}`,
        duration_ms: 0,
      }));
    } finally {
      pendingRequests--;
      checkShutdown();
    }
  });

  rl.on('close', () => {
    shutdownRequested = true;
    log(`Stdin closed, waiting for ${pendingRequests} pending request(s)...`);
    checkShutdown();
  });

  log('Ready for requests');
}

main().catch((error) => {
  log(`Fatal error: ${error}`);
  process.exit(1);
});
