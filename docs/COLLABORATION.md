# Apatheia Labs - Agent Collaboration Protocol

> **Purpose:** Shared context document for Claude Code and Codex to maintain alignment on the Apatheia scaffold project.
> **Last Updated:** 2024-12-30
> **Primary Human:** Paul Stephen (pstep)

---

## 1. Project Identity

### Mission
Build forensic intelligence platforms that expose institutional dysfunction through systematic, evidence-based analysis. **"Clarity Without Distortion."**

### Active Products
| Product | Purpose | Stack |
|---------|---------|-------|
| **Phronesis** | Case intelligence platform | Next.js 14 + Tauri + Rust |
| **Aletheia** | Truth extraction / contradiction detection | Integrated |
| **CASCADE** | 8-type contradiction detection engine | Core methodology |

### This Repository
**apatheia-scaffold** - Unified desktop application for all Apatheia tools.

```
Tech Stack:
├── Frontend: Next.js 14, React, Tailwind, Radix UI
├── Desktop: Tauri 2.0 (Rust backend)
├── Database: SQLite (local) via sqlx
├── AI: Manual routing through Claude Code terminal
└── Processing: Node.js sidecars for engine execution
```

---

## 2. Human Context (Paul Stephen)

### Communication Style
- **Terse.** "I just want..." = core need, don't over-interpret
- **Adversarial by default** - stress test everything, flag weaknesses
- **ADHD-optimized** - infer more, ask less, no preamble
- **"Refocusing" or "simpler"** = ruthlessly pare down scope

### Working Preferences
- No blue in design elements
- Use existing 900+ document corpus, don't suggest gathering new evidence
- Integrate with existing Notion structure
- No parallel systems - consolidate

### Key Entities (Reference)
- **Dr. Emma Hunnisett** - Psychologist, subject of BPS/HCPC complaints
- **Lucy Walton** - Children's Guardian
- **Mandy Seamark** - Social worker
- **Simon Ford** - Connected to criminal case

### Active Cases
1. **PE23C50095** - Family court, 1,469 pages, 156 documents
2. **Channel 4 GDPR** - "24 Hours in Police Custody" broadcast Dec 2024
3. **Regulatory complaints** - BPS, HCPC, ICO, Ofcom

---

## 3. Architecture Overview

### Directory Structure
```
apatheia-scaffold/
├── src/                      # Next.js frontend
│   ├── app/                  # App router pages
│   ├── components/           # React components
│   ├── lib/
│   │   ├── tauri/client.ts   # Tauri IPC wrapper
│   │   └── data/index.ts     # Data layer
│   └── CONTRACT.ts           # TypeScript type definitions (SSOT)
├── src-tauri/                # Rust backend
│   ├── src/
│   │   ├── commands/         # Tauri command handlers
│   │   │   ├── documents.rs  # Upload, process, list
│   │   │   ├── analysis.rs   # Engine execution
│   │   │   ├── cases.rs      # Case CRUD
│   │   │   └── settings.rs   # App settings
│   │   ├── db/
│   │   │   ├── mod.rs        # Connection pool
│   │   │   └── schema.rs     # SQL schema + Rust structs
│   │   ├── orchestrator/     # Engine job management
│   │   │   ├── mod.rs        # Job queue, parsing
│   │   │   ├── runner.rs     # Sidecar execution
│   │   │   └── job.rs        # Job/finding structs
│   │   ├── processing/       # Text extraction, chunking
│   │   └── storage/          # File storage with dedup
│   ├── sidecars/             # Node.js engine runners
│   └── capabilities/         # Tauri permissions
├── scripts/                  # Standalone utility scripts
│   ├── ingest-vault.js       # Obsidian vault ingestion
│   ├── run-engines.js        # Generate engine prompts
│   ├── save-findings.js      # Insert findings to DB
│   └── export-analysis.js    # Export to vault markdown
└── COLLABORATION.md          # THIS FILE
```

### Database Schema (SQLite)
```
cases              → Case metadata
documents          → Document records with extracted_text
document_chunks    → 512-char chunks for semantic search
entities           → People, organizations, professionals
claims             → Extracted claims with foundation types
findings           → Engine outputs
contradictions     → Detected contradictions (CASCADE types)
omissions          → Detected omissions
timeline_events    → Chronological events with anomaly flags
```

**Location:** `%APPDATA%\com.apatheia.phronesis\phronesis.db`

### Type Contract (Single Source of Truth)
`src/CONTRACT.ts` defines all shared types. Rust structs in `schema.rs` mirror these.

Key enums:
- **DocType:** court_order, witness_statement, expert_report, police_bundle, social_work_assessment, transcript, correspondence, media, disclosure, threshold_document, position_statement, other
- **Severity:** critical, high, medium, low, info
- **ContradictionType:** direct, temporal, logical, omission, emphasis
- **Engine:** entity_resolution, temporal_parser, argumentation, bias_detection, contradiction, accountability_audit, professional_tracker, omission, expert_witness, documentary, narrative, coordination

---

## 4. CASCADE Methodology

The core analytical framework. Eight contradiction types:

| Code | Type | Description |
|------|------|-------------|
| SELF | Internal | Contradictions within single document |
| INTER_DOC | Cross-document | Contradictions between documents |
| TEMPORAL | Timeline | Date/sequence inconsistencies |
| EVIDENTIARY | Evidence gap | Claims not supported by evidence |
| MODALITY_SHIFT | Certainty change | Unexplained tone/certainty shifts |
| SELECTIVE_CITATION | Cherry-picking | Partial or misleading references |
| SCOPE_SHIFT | Scope change | Unexplained scope expansions/contractions |
| UNEXPLAINED_CHANGE | Position flip | Position changes without justification |

---

## 5. Engine System

### Available Engines (12 Active)
1. **entity_resolution** - Extract and resolve entity mentions
2. **temporal_parser** - Timeline analysis, date anomalies
3. **argumentation** - Claim structure analysis
4. **bias_detection** - Bias identification
5. **contradiction** - CASCADE contradiction detection
6. **accountability_audit** - Professional accountability tracking
7. **professional_tracker** - Credentials, scope compliance
8. **omission** - Material omissions detection
9. **expert_witness** - Expert scope/qualification analysis
10. **documentary** - Document authenticity/provenance
11. **narrative** - Narrative drift/amplification tracking
12. **coordination** - Coordination detection (shared language)

### Engine Execution Flow
```
1. Documents ingested → SQLite (documents + chunks tables)
2. run-engines.js generates prompts with document context
3. Prompts fed to Claude Code terminal (manual AI routing)
4. Claude returns JSON findings
5. save-findings.js inserts findings to DB
6. export-analysis.js writes to Obsidian vault
```

### Finding Structure
```json
{
  "id": "uuid",
  "engine_id": "contradiction",
  "title": "Brief finding title",
  "description": "Detailed description with evidence",
  "finding_type": "INTER_DOC",
  "severity": "high",
  "confidence": 0.85,
  "document_ids": ["doc-uuid-1", "doc-uuid-2"],
  "evidence": {
    "quotes": ["Quote from source A", "Contradicting quote from source B"],
    "locations": ["[A:23:4]", "[B:45:2]"]
  },
  "regulatory_targets": ["hcpc", "bps"]
}
```

---

## 6. Current State

### Completed
- [x] Database schema designed and implemented
- [x] Tauri commands for document/case/analysis CRUD
- [x] Orchestrator/runner system for engine execution
- [x] Ingestion scripts for Obsidian vault
- [x] Engine prompt generation
- [x] Findings save and export scripts

### In Progress
- [ ] Run vault ingestion (1,950 files)
- [ ] Execute engines via Claude Code
- [ ] Generate apatheia-run.md output

### Pending
- [ ] PDF text extraction (OCR pipeline)
- [ ] Frontend UI completion
- [ ] Tauri build and packaging

---

## 7. Obsidian Vault Integration

### Vault Location
`C:\Users\pstep\OneDrive\Documents\Obsidian Vault`

### Priority Folders for Ingestion
```
10 - Case Materials/          → 1,716 files (PE23C50095 bundle)
70 - Publishing/Channel_4/    → 234 files (GDPR evidence)
```

### Output Location
`40 - Analysis/apatheia-run.md` - Generated analysis report

### Conventions
- Use `[[wikilinks]]` for cross-references
- YAML frontmatter for metadata
- Source citations as `[Doc:Page:Para]`

---

## 8. Agent Responsibilities

### Claude Code (Primary)
- **AI Analysis:** Run all engines, generate findings
- **Code Execution:** Run scripts, database operations
- **Architecture Decisions:** System design, refactoring
- **CASCADE Analysis:** Contradiction detection, evidence mapping

### Codex (Supporting)
- **Code Generation:** Implement features per spec
- **Refactoring:** Clean up, optimize
- **Documentation:** Keep docs current
- **Testing:** Write and run tests

### Handoff Protocol
When switching agents:
1. Update this COLLABORATION.md with current state
2. Summarize work completed in session
3. List explicit next steps
4. Note any blockers or decisions needed

---

## 9. Execution Commands

### Development
```bash
# Start Next.js dev server
npm run dev

# Start Tauri dev (includes Rust backend)
npm run tauri dev

# Build for production
npm run tauri build
```

### Scripts (Manual Workflow)
```powershell
cd scripts

# 1. Install dependencies
npm install

# 2. Ingest vault to SQLite
node ingest-vault.js

# 3. Generate engine prompts
node run-engines.js

# 4. Save findings from Claude response
node save-findings.js <engine_id> <findings.json>

# 5. Export to Obsidian vault
node export-analysis.js
```

---

## 10. Decision Log

| Date | Decision | Rationale | Agent |
|------|----------|-----------|-------|
| 2024-12-30 | Manual AI routing via Claude Code | Avoid in-app API calls, use terminal agent | Claude |
| 2024-12-30 | SQLite for local storage | Tauri-native, no external dependencies | Claude |
| 2024-12-30 | Node.js sidecars for engines | Leverage existing ecosystem, async execution | Paul |

---

## 11. Known Issues / Blockers

1. **PDF Extraction:** PDFs require OCR pipeline (not yet implemented)
   - Workaround: Pre-extracted markdown in `BUNDLE_MD/` folder

2. **Sidecar Path:** Engine runner sidecar path detection needs work
   - Current: Falls back to mock mode if not found

3. **Large Document Handling:** 1,469-page bundle may need chunked processing

---

## 12. Quick Reference

### File Locations
| Resource | Path |
|----------|------|
| Database | `%APPDATA%\com.apatheia.phronesis\phronesis.db` |
| Engine Prompts | `%APPDATA%\com.apatheia.phronesis\engine-prompts\` |
| Obsidian Vault | `C:\Users\pstep\OneDrive\Documents\Obsidian Vault` |
| Project Root | `C:\Users\pstep\OneDrive\Desktop\apatheia-scaffold` |

### Key Files
| File | Purpose |
|------|---------|
| `src/CONTRACT.ts` | Type definitions (single source of truth) |
| `src-tauri/src/db/schema.rs` | Database schema + Rust structs |
| `src-tauri/src/orchestrator/mod.rs` | Engine orchestration |
| `scripts/ingest-vault.js` | Vault ingestion |
| `COLLABORATION.md` | This file |

### Contact / Resources
- **GitHub:** apatheia-labs/apatheia-scaffold (if public)
- **Notion:** Paul's central command (not directly accessible)
- **Human:** Paul Stephen - responds in terminal

---

## 13. Session Continuity

### Last Session Summary
**Agent:** Claude Code (Opus 4.5)
**Date:** 2024-12-30
**Work Completed:**
1. Explored full codebase architecture
2. Created ingestion scripts (`scripts/ingest-vault.js`)
3. Created engine prompt generator (`scripts/run-engines.js`)
4. Created findings save script (`scripts/save-findings.js`)
5. Created export script (`scripts/export-analysis.js`)
6. Created this collaboration document

### Next Steps (For Any Agent)
1. Run `npm install` in `scripts/` directory
2. Execute `node ingest-vault.js` to populate database
3. Execute `node run-engines.js` to generate prompts
4. Feed prompts to Claude Code for AI analysis
5. Save findings and export to vault

### Open Questions
- Should we process PDFs via external OCR first?
- Priority order for engine execution?
- Subset of documents for initial test run?

---

*This document should be updated at the end of each agent session to maintain continuity.*
