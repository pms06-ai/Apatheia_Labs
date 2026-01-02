//! Database schema definitions matching CONTRACT.ts
//! 
//! All types are derived from the TypeScript contract to ensure consistency.

// chrono types available if needed for DateTime handling
#[allow(unused_imports)]
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

/// SQL to create all tables
pub const CREATE_TABLES: &str = r#"
-- Cases table
CREATE TABLE IF NOT EXISTS cases (
    id TEXT PRIMARY KEY,
    reference TEXT NOT NULL,
    name TEXT NOT NULL,
    case_type TEXT NOT NULL CHECK(case_type IN ('family_court', 'regulatory', 'criminal', 'civil', 'media')),
    status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'archived', 'closed')),
    description TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Documents table
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_type TEXT NOT NULL,
    file_size INTEGER,
    storage_path TEXT NOT NULL,
    hash_sha256 TEXT NOT NULL,
    acquisition_date TEXT NOT NULL DEFAULT (datetime('now')),
    doc_type TEXT CHECK(doc_type IN ('court_order', 'witness_statement', 'expert_report', 'police_bundle', 'social_work_assessment', 'transcript', 'correspondence', 'media', 'disclosure', 'threshold_document', 'position_statement', 'other')),
    source_entity TEXT,
    status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed')),
    extracted_text TEXT,
    page_count INTEGER,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Document chunks for semantic search
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

-- Entities (people, organizations, etc.)
CREATE TABLE IF NOT EXISTS entities (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    canonical_name TEXT NOT NULL,
    entity_type TEXT NOT NULL CHECK(entity_type IN ('person', 'organization', 'professional', 'institution', 'court', 'police', 'social_services', 'expert', 'media', 'other')),
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

-- Claims extracted from documents
CREATE TABLE IF NOT EXISTS claims (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    claim_text TEXT NOT NULL,
    claim_type TEXT CHECK(claim_type IN ('factual', 'opinion', 'finding', 'recommendation', 'conclusion', 'allegation')),
    source_entity_id TEXT,
    source_document_id TEXT,
    source_page INTEGER,
    foundation_type TEXT CHECK(foundation_type IN ('verified', 'supported', 'unsupported', 'contested', 'circular', 'contaminated', 'unfounded')),
    confidence_score REAL,
    claim_date TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE,
    FOREIGN KEY (source_entity_id) REFERENCES entities(id),
    FOREIGN KEY (source_document_id) REFERENCES documents(id)
);

-- Findings from analysis engines
CREATE TABLE IF NOT EXISTS findings (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    engine TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    finding_type TEXT,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),
    confidence REAL, -- Added in v0.1.0: Confidence score (0.0-1.0) for finding reliability
    document_ids TEXT DEFAULT '[]',
    entity_ids TEXT DEFAULT '[]',
    regulatory_targets TEXT DEFAULT '[]',
    evidence TEXT DEFAULT '{}',
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Contradictions detected
CREATE TABLE IF NOT EXISTS contradictions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    source_a_document_id TEXT,
    source_a_entity_id TEXT,
    source_a_text TEXT NOT NULL,
    source_a_page INTEGER,
    source_a_date TEXT,
    source_b_document_id TEXT,
    source_b_entity_id TEXT,
    source_b_text TEXT NOT NULL,
    source_b_page INTEGER,
    source_b_date TEXT,
    contradiction_type TEXT CHECK(contradiction_type IN ('direct', 'temporal', 'logical', 'omission', 'emphasis')),
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),
    resolution TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Omissions detected
CREATE TABLE IF NOT EXISTS omissions (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    omitted_content TEXT NOT NULL,
    source_document_id TEXT,
    source_page INTEGER,
    omitting_document_id TEXT,
    omitting_entity_id TEXT,
    omission_type TEXT CHECK(omission_type IN ('selective_quoting', 'complete_exclusion', 'context_stripping', 'cherry_picking')),
    bias_direction TEXT,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low', 'info')),
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Timeline events
CREATE TABLE IF NOT EXISTS timeline_events (
    id TEXT PRIMARY KEY,
    case_id TEXT NOT NULL,
    event_date TEXT NOT NULL,
    event_time TEXT,
    date_precision TEXT DEFAULT 'day' CHECK(date_precision IN ('exact', 'day', 'week', 'month', 'quarter', 'year')),
    description TEXT NOT NULL,
    event_type TEXT,
    source_document_id TEXT,
    source_page INTEGER,
    entity_ids TEXT DEFAULT '[]',
    is_anomaly INTEGER DEFAULT 0,
    anomaly_type TEXT,
    anomaly_notes TEXT,
    metadata TEXT DEFAULT '{}',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (case_id) REFERENCES cases(id) ON DELETE CASCADE
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_documents_case_id ON documents(case_id);
CREATE INDEX IF NOT EXISTS idx_entities_case_id ON entities(case_id);
CREATE INDEX IF NOT EXISTS idx_claims_case_id ON claims(case_id);
CREATE INDEX IF NOT EXISTS idx_findings_case_id ON findings(case_id);
CREATE INDEX IF NOT EXISTS idx_findings_engine ON findings(engine);
CREATE INDEX IF NOT EXISTS idx_contradictions_case_id ON contradictions(case_id);
CREATE INDEX IF NOT EXISTS idx_omissions_case_id ON omissions(case_id);
CREATE INDEX IF NOT EXISTS idx_timeline_events_case_id ON timeline_events(case_id);
"#;

// ============================================
// Rust structs matching CONTRACT.ts
// ============================================

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Case {
    pub id: String,
    pub reference: String,
    pub name: String,
    pub case_type: String,
    pub status: String,
    pub description: Option<String>,
    pub metadata: String, // JSON string
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Document {
    pub id: String,
    pub case_id: String,
    pub filename: String,
    pub file_type: String,
    pub file_size: Option<i64>,
    pub storage_path: String,
    pub hash_sha256: String,
    pub acquisition_date: String,
    pub doc_type: Option<String>,
    pub source_entity: Option<String>,
    pub status: String,
    pub extracted_text: Option<String>,
    pub page_count: Option<i32>,
    pub metadata: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Entity {
    pub id: String,
    pub case_id: String,
    pub canonical_name: String,
    pub entity_type: String,
    pub aliases: String, // JSON array
    pub role: Option<String>,
    pub institution: Option<String>,
    pub professional_registration: Option<String>,
    pub credibility_score: f64,
    pub metadata: String,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Finding {
    pub id: String,
    pub case_id: String,
    pub engine: String,
    pub title: String,
    pub description: Option<String>,
    pub finding_type: Option<String>,
    pub severity: Option<String>,
    pub confidence: Option<f64>,
    pub document_ids: String, // JSON array
    pub entity_ids: String,   // JSON array
    pub regulatory_targets: String, // JSON array
    pub evidence: String,     // JSON object
    pub metadata: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Contradiction {
    pub id: String,
    pub case_id: String,
    pub title: String,
    pub description: Option<String>,
    pub source_a_document_id: Option<String>,
    pub source_a_entity_id: Option<String>,
    pub source_a_text: String,
    pub source_a_page: Option<i32>,
    pub source_a_date: Option<String>,
    pub source_b_document_id: Option<String>,
    pub source_b_entity_id: Option<String>,
    pub source_b_text: String,
    pub source_b_page: Option<i32>,
    pub source_b_date: Option<String>,
    pub contradiction_type: Option<String>,
    pub severity: Option<String>,
    pub resolution: Option<String>,
    pub metadata: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, FromRow)]
pub struct Omission {
    pub id: String,
    pub case_id: String,
    pub title: String,
    pub description: Option<String>,
    pub omitted_content: String,
    pub source_document_id: Option<String>,
    pub source_page: Option<i32>,
    pub omitting_document_id: Option<String>,
    pub omitting_entity_id: Option<String>,
    pub omission_type: Option<String>,
    pub bias_direction: Option<String>,
    pub severity: Option<String>,
    pub metadata: String,
    pub created_at: String,
}

