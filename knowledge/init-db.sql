-- Apatheia Labs - Architect Agent Knowledge Base
-- Schema v1.0

-- Repository Registry
CREATE TABLE IF NOT EXISTS repositories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    path TEXT NOT NULL,
    stated_purpose TEXT,
    actual_purpose TEXT,
    lifecycle_status TEXT CHECK(lifecycle_status IN ('active', 'maintenance', 'dormant', 'abandoned', 'experimental')),
    fcip_disposition TEXT CHECK(fcip_disposition IN ('core', 'engine', 'utility', 'reference', 'archive', 'investigate')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_audited TIMESTAMP
);

-- Audit History
CREATE TABLE IF NOT EXISTS audits (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    audit_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    verdict TEXT CHECK(verdict IN ('working', 'partially_working', 'broken', 'never_completed')),
    fcip_relevance TEXT CHECK(fcip_relevance IN ('core', 'supporting', 'reference', 'archive')),
    recommended_action TEXT CHECK(recommended_action IN ('integrate', 'extract', 'learn', 'archive')),
    summary TEXT,
    key_finding TEXT,
    blocking_issues TEXT,
    report_path TEXT,
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Technical Stack Registry
CREATE TABLE IF NOT EXISTS tech_stacks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    primary_language TEXT,
    language_breakdown TEXT,  -- JSON: {"typescript": 60, "rust": 40}
    frameworks TEXT,          -- JSON array
    runtime_requirements TEXT,-- JSON: {"node": "20.x", "rust": "1.75"}
    package_manager TEXT,
    build_tools TEXT,
    database TEXT,
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Executability State
CREATE TABLE IF NOT EXISTS executability (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    audit_id INTEGER NOT NULL,
    clone_install_success BOOLEAN,
    build_success BOOLEAN,
    runtime_success BOOLEAN,
    blocking_issues TEXT,
    last_verified_working DATE,
    notes TEXT,
    FOREIGN KEY (repo_id) REFERENCES repositories(id),
    FOREIGN KEY (audit_id) REFERENCES audits(id)
);

-- Contract Definitions Found
CREATE TABLE IF NOT EXISTS contracts (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    contract_type TEXT CHECK(contract_type IN ('typescript_interface', 'rust_struct', 'python_dataclass', 'api_schema', 'database_schema')),
    name TEXT NOT NULL,
    location TEXT NOT NULL,  -- file path within repo
    definition TEXT,         -- actual code/schema
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Contract Drift Detection
CREATE TABLE IF NOT EXISTS contract_drift (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    frontend_contract_id INTEGER,
    backend_contract_id INTEGER,
    drift_type TEXT CHECK(drift_type IN ('missing_field', 'type_mismatch', 'naming_difference', 'structural')),
    description TEXT,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (frontend_contract_id) REFERENCES contracts(id),
    FOREIGN KEY (backend_contract_id) REFERENCES contracts(id)
);

-- Patterns (good practices discovered)
CREATE TABLE IF NOT EXISTS patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    pattern_type TEXT CHECK(pattern_type IN ('architectural', 'code', 'testing', 'documentation', 'deployment')),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,           -- where in repo this was found
    recommendation TEXT,     -- how to apply to FCIP
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Anti-Patterns (mistakes to avoid)
CREATE TABLE IF NOT EXISTS anti_patterns (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    pattern_type TEXT CHECK(pattern_type IN ('architectural', 'code', 'testing', 'documentation', 'deployment')),
    name TEXT NOT NULL,
    description TEXT,
    location TEXT,
    lesson TEXT,             -- what to do instead
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- FCIP Engine Alignment
CREATE TABLE IF NOT EXISTS engine_alignment (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    engine_symbol TEXT CHECK(engine_symbol IN ('Ε', 'Τ', 'Α', 'Β', 'Κ', 'Λ', 'Π', 'Ο', 'Ξ', 'Δ', 'Μ', 'Σ')),
    engine_name TEXT,
    alignment_type TEXT CHECK(alignment_type IN ('implements', 'partial', 'supports', 'conflicts')),
    description TEXT,
    reusable_components TEXT, -- JSON array of component paths
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Dependencies Between Repos
CREATE TABLE IF NOT EXISTS repo_dependencies (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    dependent_repo_id INTEGER NOT NULL,
    dependency_repo_id INTEGER NOT NULL,
    dependency_type TEXT CHECK(dependency_type IN ('imports', 'references', 'duplicates', 'extends')),
    description TEXT,
    FOREIGN KEY (dependent_repo_id) REFERENCES repositories(id),
    FOREIGN KEY (dependency_repo_id) REFERENCES repositories(id)
);

-- Components Inventory
CREATE TABLE IF NOT EXISTS components (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    component_type TEXT CHECK(component_type IN ('ui', 'api', 'service', 'utility', 'engine', 'database', 'config')),
    purpose TEXT,
    location TEXT,
    completeness TEXT CHECK(completeness IN ('complete', 'partial', 'stubbed', 'missing')),
    reusable BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Technical Debt Items
CREATE TABLE IF NOT EXISTS tech_debt (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    repo_id INTEGER NOT NULL,
    debt_type TEXT CHECK(debt_type IN ('todo', 'fixme', 'hack', 'deprecated', 'dead_code', 'security')),
    description TEXT,
    location TEXT,
    severity TEXT CHECK(severity IN ('critical', 'high', 'medium', 'low')),
    discovered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP,
    FOREIGN KEY (repo_id) REFERENCES repositories(id)
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_audits_repo ON audits(repo_id);
CREATE INDEX IF NOT EXISTS idx_contracts_repo ON contracts(repo_id);
CREATE INDEX IF NOT EXISTS idx_patterns_repo ON patterns(repo_id);
CREATE INDEX IF NOT EXISTS idx_anti_patterns_repo ON anti_patterns(repo_id);
CREATE INDEX IF NOT EXISTS idx_engine_alignment_repo ON engine_alignment(repo_id);
CREATE INDEX IF NOT EXISTS idx_components_repo ON components(repo_id);
CREATE INDEX IF NOT EXISTS idx_tech_debt_repo ON tech_debt(repo_id);

-- Views for common queries

-- Cross-repo pattern summary
CREATE VIEW IF NOT EXISTS v_pattern_summary AS
SELECT 
    p.pattern_type,
    p.name,
    COUNT(DISTINCT p.repo_id) as repo_count,
    GROUP_CONCAT(r.name, ', ') as found_in
FROM patterns p
JOIN repositories r ON p.repo_id = r.id
GROUP BY p.pattern_type, p.name
ORDER BY repo_count DESC;

-- Contract drift overview
CREATE VIEW IF NOT EXISTS v_drift_overview AS
SELECT 
    r.name as repo_name,
    COUNT(cd.id) as drift_count,
    SUM(CASE WHEN cd.severity = 'critical' THEN 1 ELSE 0 END) as critical_count,
    SUM(CASE WHEN cd.resolved_at IS NULL THEN 1 ELSE 0 END) as unresolved_count
FROM repositories r
LEFT JOIN contracts c ON r.id = c.repo_id
LEFT JOIN contract_drift cd ON c.id = cd.frontend_contract_id OR c.id = cd.backend_contract_id
GROUP BY r.id, r.name;

-- FCIP integration candidates
CREATE VIEW IF NOT EXISTS v_fcip_candidates AS
SELECT 
    r.name,
    r.fcip_disposition,
    a.verdict,
    a.recommended_action,
    GROUP_CONCAT(DISTINCT ea.engine_symbol, ', ') as aligned_engines
FROM repositories r
LEFT JOIN audits a ON r.id = a.repo_id
LEFT JOIN engine_alignment ea ON r.id = ea.repo_id
WHERE r.fcip_disposition IN ('core', 'engine', 'utility')
GROUP BY r.id
ORDER BY 
    CASE r.fcip_disposition 
        WHEN 'core' THEN 1 
        WHEN 'engine' THEN 2 
        WHEN 'utility' THEN 3 
    END;

