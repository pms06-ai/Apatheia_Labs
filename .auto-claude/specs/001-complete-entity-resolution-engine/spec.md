# Specification: Complete Entity Resolution Engine

## Overview

Implement an entity resolution analysis engine that identifies and links the same entities (people, organizations, documents) across varying naming conventions and references throughout a document corpus. This engine enables users to track accountability and attribution by automatically recognizing that "Dr. Smith," "John Smith," "the evaluator," and "the expert witness" all refer to the same person. The system combines natural language processing, fuzzy matching algorithms, and interactive graph visualization to provide confidence-scored entity linkages with human-in-the-loop validation.

## Workflow Type

**Type**: feature

**Rationale**: This is a new analysis capability being added to the system. It introduces novel functionality (entity extraction, resolution, and visualization) rather than modifying existing features or fixing bugs. The implementation requires new data structures, algorithms, libraries, and UI components that don't currently exist in the codebase.

## Task Scope

### Services Involved
- **scripts** (primary) - Backend entity extraction and matching algorithms using Node.js/SQLite
- **src-tauri** (integration) - Native backend for performance-critical graph operations
- **Frontend** (to be determined) - React-based UI for visualization and user feedback

### This Task Will:
- [ ] Extract named entities (people, organizations, documents) from text using NLP
- [ ] Implement fuzzy matching to identify entity variations (5+ naming conventions)
- [ ] Calculate confidence scores for entity matches using string similarity algorithms
- [ ] Store entity relationships in a graph data structure
- [ ] Provide interactive graph visualization showing cross-document entity connections
- [ ] Enable user confirmation/rejection of proposed entity linkages
- [ ] Track entity mentions across multiple documents in a corpus

### Out of Scope:
- Machine learning-based entity recognition (using rule-based NLP instead)
- Real-time collaborative entity resolution
- Automatic entity merging without user confirmation
- External API integrations for entity enrichment
- Support for non-English documents

## Service Context

### scripts (Node.js Backend)

**Tech Stack:**
- Language: JavaScript/TypeScript
- Runtime: Node.js
- Database: SQLite (better-sqlite3)
- Package manager: npm
- Key directories: TBD (need to explore codebase)

**Entry Point:** Not specified in project index

**How to Run:**
```bash
# To be determined from package.json scripts
node scripts/main.js
```

**Port:** Not applicable (command-line/library service)

### src-tauri (Rust Native Backend)

**Tech Stack:**
- Language: Rust
- Framework: Tauri
- Package manager: cargo
- Key directories: src/

**Entry Point:** `src/main.rs`

**How to Run:**
```bash
cargo run
```

**Port:** Not applicable (native application backend)

## Files to Modify

**Note:** Context phase returned empty file lists. The following represents expected new files to create based on the requirements:

| File | Service | What to Change |
|------|---------|---------------|
| `scripts/analysis/entity_extraction.js` | scripts | Create NLP-based entity extractor using Compromise library |
| `scripts/analysis/entity_matcher.js` | scripts | Implement fuzzy matching algorithm using Levenshtein distance |
| `scripts/models/entity_graph.js` | scripts | Define graph data structure for entity relationships |
| `scripts/database/entity_schema.sql` | scripts | Create SQLite tables for entities, mentions, and linkages |
| `src/components/EntityGraph.tsx` | frontend | React Flow visualization component |
| `src/services/entity-resolution.ts` | frontend | Frontend service for entity resolution API calls |
| `src/types/entity.ts` | frontend | TypeScript interfaces for entity data models |

## Files to Reference

**Note:** No reference files provided by context phase. Implementation should follow these patterns:

| Pattern Source | Pattern to Copy |
|----------------|-----------------|
| Existing analysis scripts | Error handling and logging patterns |
| Existing database schemas | SQLite schema conventions and indexing |
| Existing React components | Component structure and TypeScript typing |
| Project ESLint/Prettier config | Code formatting and linting rules |

## Patterns to Follow

### Entity Extraction Pattern

Using Compromise NLP library (identified in research phase):

```javascript
import nlp from 'compromise'

function extractEntities(text) {
  const doc = nlp(text)

  return {
    people: doc.people().out('array'),
    organizations: doc.organizations().out('array'),
    places: doc.places().out('array')
  }
}
```

**Key Points:**
- Rule-based, fast, English-optimized
- Simple API: `nlp(text).people().out('array')`
- Returns normalized entity mentions as arrays

### Fuzzy Matching Pattern

Using Fastest Levenshtein for string similarity:

```javascript
import { distance } from 'fastest-levenshtein'

function calculateSimilarity(str1, str2) {
  const maxLen = Math.max(str1.length, str2.length)
  const editDistance = distance(str1, str2)
  return 1 - (editDistance / maxLen) // Normalized 0-1 score
}
```

**Key Points:**
- Edit distance calculation for name variations
- Normalize to 0-1 confidence score
- Zero dependencies, TypeScript-compatible

### Graph Data Structure Pattern

Using Graphology for in-memory graph:

```javascript
import Graph from 'graphology'

const entityGraph = new Graph()

// Add entity nodes
entityGraph.addNode('entity-123', {
  name: 'John Smith',
  type: 'person',
  mentions: ['Dr. Smith', 'John Smith', 'the evaluator']
})

// Add relationship edges
entityGraph.addEdge('entity-123', 'doc-456', {
  type: 'mentioned_in',
  confidence: 0.95
})
```

**Key Points:**
- Pure data structure, separate from visualization
- Rich algorithm library for graph analysis
- Supports weighted edges for confidence scores

### Graph Visualization Pattern

Using React Flow for interactive visualization:

```javascript
import ReactFlow from 'reactflow'
import 'reactflow/dist/style.css' // Required CSS import

function EntityGraphView({ nodes, edges }) {
  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      fitView
      attributionPosition="bottom-right"
    />
  )
}
```

**Key Points:**
- Built-in zoom/pan/drag functionality
- Requires CSS import
- Performance consideration: >1000 nodes may need virtualization

## Requirements

### Functional Requirements

1. **Entity Extraction**
   - Description: Automatically extract named entities from document text
   - Acceptance: Identifies people, organizations, and document references with 80%+ accuracy

2. **Multi-Variant Matching**
   - Description: Link same entity across 5+ different naming variations
   - Acceptance: Successfully matches "Dr. Smith" = "John Smith" = "the evaluator" = "the expert witness" = "J. Smith"

3. **Confidence Scoring**
   - Description: Provide probabilistic confidence scores (0-1) for entity matches
   - Acceptance: Scores reflect string similarity and contextual signals; >0.8 = high confidence, 0.5-0.8 = medium, <0.5 = low

4. **User Validation Loop**
   - Description: Allow users to confirm or reject proposed entity linkages
   - Acceptance: User feedback persists to database and updates entity graph in real-time

5. **Cross-Document Tracking**
   - Description: Track all mentions of an entity across entire document corpus
   - Acceptance: Graph shows entity connections across documents with mention counts

6. **Entity Graph Visualization**
   - Description: Interactive visual representation of entity relationships
   - Acceptance: Users can zoom, pan, click nodes to see details, filter by entity type

### Edge Cases

1. **Name Ambiguity** - Handle cases where "John Smith" could be two different people
   - Use document context and user feedback to disambiguate
   - Provide low confidence scores when context is insufficient

2. **Partial Name Matches** - "Smith" mentioned alone without first name
   - Require higher confidence threshold (>0.9) for partial matches
   - Flag for user review

3. **Organizational Name Variations** - "FBI" = "Federal Bureau of Investigation"
   - Maintain alias dictionary for common abbreviations
   - Apply fuzzy matching to expanded forms

4. **Title Changes** - "Dr. Smith" vs "Professor Smith" (same person, different contexts)
   - Normalize titles during matching
   - Store title variations as metadata

5. **Empty/Missing Entities** - Documents with no extractable entities
   - Gracefully handle empty results
   - Log warnings for manual review

## Implementation Notes

### DO
- Use Compromise library for entity extraction (identified in research phase)
- Implement Levenshtein distance for fuzzy string matching
- Store entity graphs in SQLite with proper indexing for performance
- Follow TypeScript conventions for all frontend code
- Use React Flow for visualization (supports 1000+ nodes with optimization)
- Persist user feedback (confirmations/rejections) for learning
- Normalize entity names (lowercase, remove titles) before matching
- Provide clear confidence score explanations in UI

### DON'T
- Use ML-based NLP (stick to rule-based Compromise for speed)
- Create new graph visualization from scratch (React Flow handles this)
- Store raw graph data in frontend state (use backend as source of truth)
- Auto-merge entities without user confirmation
- Ignore context from surrounding text (use for disambiguation)
- Hard-code entity matching rules (make thresholds configurable)

## Development Environment

### Start Services

```bash
# Backend (scripts)
cd scripts
npm install
node main.js

# Tauri backend
cd src-tauri
cargo build
cargo run

# Frontend (if applicable)
npm install
npm run dev
```

### Service URLs
- Frontend: http://localhost:3000 (typical for React)
- Tauri: Native application (no URL)
- scripts: CLI/library service (no URL)

### Required Environment Variables
```bash
# SQLite database location
DATABASE_PATH=./data/apatheia.db

# Entity matching thresholds
ENTITY_MATCH_HIGH_CONFIDENCE=0.8
ENTITY_MATCH_MEDIUM_CONFIDENCE=0.5

# NLP settings
NLP_LANGUAGE=en
```

## Success Criteria

The task is complete when:

1. [ ] Engine extracts named entities from text with 80%+ accuracy
2. [ ] System successfully matches same entity across 5+ naming variations
3. [ ] Confidence scores (0-1) provided for all entity matches
4. [ ] Users can confirm/reject entity linkages via UI
5. [ ] User feedback persists to database and updates graph
6. [ ] Interactive entity graph visualization shows cross-document connections
7. [ ] Graph supports zoom, pan, node selection, and filtering
8. [ ] Entity mentions tracked across multiple documents in corpus
9. [ ] No console errors during entity extraction or visualization
10. [ ] Existing tests still pass
11. [ ] New functionality verified via browser/API testing

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests

| Test | File | What to Verify |
|------|------|----------------|
| Entity extraction accuracy | `tests/analysis/test_entity_extraction.test.js` | Correctly identifies people, orgs, documents from sample text |
| Fuzzy matching algorithm | `tests/analysis/test_entity_matcher.test.js` | Matches entity variations with correct confidence scores |
| Graph data structure | `tests/models/test_entity_graph.test.js` | Nodes/edges added correctly, relationships maintained |
| Confidence score calculation | `tests/analysis/test_confidence.test.js` | Scores reflect string similarity and fall within 0-1 range |
| User feedback persistence | `tests/database/test_entity_linkages.test.js` | Confirmations/rejections saved to database correctly |

### Integration Tests

| Test | Services | What to Verify |
|------|----------|----------------|
| End-to-end entity resolution | scripts ↔ database ↔ frontend | Text → entities → matches → graph → visualization |
| User feedback loop | frontend ↔ backend ↔ database | User confirms linkage → DB updates → graph refreshes |
| Cross-document tracking | scripts ↔ database | Entity mentions aggregated across multiple documents |
| Graph persistence | scripts ↔ database | Graph state saved and restored correctly |

### End-to-End Tests

| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Entity Resolution Workflow | 1. Upload document 2. Extract entities 3. View graph 4. Confirm linkage | Entities extracted, graph displays connections, feedback saved |
| Multi-Document Tracking | 1. Upload 3 documents 2. Same entity in each 3. View graph | Single node with 3 mentions across documents |
| Confidence Filtering | 1. Extract entities 2. Filter by confidence >0.8 3. View high-confidence matches | Only high-confidence linkages displayed |
| User Feedback Loop | 1. Reject incorrect linkage 2. Confirm correct linkage 3. Refresh graph | Graph updates in real-time, feedback persists on reload |

### Browser Verification (Frontend)

| Page/Component | URL | Checks |
|----------------|-----|--------|
| Entity Graph View | `http://localhost:3000/analysis/entity-graph` | Graph renders, nodes/edges visible, zoom/pan works |
| Entity Detail Panel | `http://localhost:3000/analysis/entity-graph` | Click node → detail panel shows entity info, mentions, confidence |
| User Feedback UI | `http://localhost:3000/analysis/entity-graph` | Confirm/reject buttons work, feedback saves immediately |
| Document Upload | `http://localhost:3000/documents/upload` | Upload triggers entity extraction, graph updates |

### Database Verification

| Check | Query/Command | Expected |
|-------|---------------|----------|
| Entities table exists | `SELECT name FROM sqlite_master WHERE type='table' AND name='entities';` | Table found |
| Entity linkages stored | `SELECT * FROM entity_linkages WHERE confidence > 0.8;` | High-confidence linkages present |
| User feedback recorded | `SELECT * FROM user_feedback WHERE action='confirm';` | Confirmations logged with timestamps |
| Graph relationships | `SELECT * FROM entity_mentions WHERE entity_id='entity-123';` | All mentions for entity retrieved |
| Index performance | `EXPLAIN QUERY PLAN SELECT * FROM entities WHERE name LIKE '%Smith%';` | Uses index, not full table scan |

### Performance Verification

| Metric | Target | How to Verify |
|--------|--------|---------------|
| Entity extraction speed | <5s for 10,000 word document | Time NLP processing with profiler |
| Fuzzy matching speed | <100ms for 100 entity comparisons | Benchmark Levenshtein calculations |
| Graph render time | <2s for 500 nodes/edges | Measure React Flow initial render |
| Database query time | <50ms for entity lookup | SQLite query profiling |

### QA Sign-off Requirements
- [ ] All unit tests pass (5 test files minimum)
- [ ] All integration tests pass (4 test scenarios minimum)
- [ ] All E2E tests pass (4 user flows minimum)
- [ ] Browser verification complete (4 UI components checked)
- [ ] Database state verified (5 schema checks passed)
- [ ] Performance targets met (4 metrics within range)
- [ ] No regressions in existing functionality
- [ ] Code follows ESLint/Prettier conventions
- [ ] No security vulnerabilities (dependency audit clean)
- [ ] TypeScript compilation succeeds with no errors
- [ ] Entity matching accuracy ≥80% on test corpus
- [ ] User feedback loop tested with 10+ confirm/reject actions

## Architecture Design

### Data Models

**Entity**
```typescript
interface Entity {
  id: string
  name: string // Normalized canonical name
  type: 'person' | 'organization' | 'document'
  aliases: string[] // Known variations
  confidence: number // Overall entity confidence
  created_at: string
  updated_at: string
}
```

**Entity Mention**
```typescript
interface EntityMention {
  id: string
  entity_id: string
  document_id: string
  text: string // Exact text as it appears
  position: { start: number, end: number }
  context: string // Surrounding text for disambiguation
  confidence: number
  created_at: string
}
```

**Entity Linkage**
```typescript
interface EntityLinkage {
  id: string
  entity_a_id: string
  entity_b_id: string
  confidence: number
  algorithm: 'levenshtein' | 'fuzzy' | 'user_confirmed'
  status: 'pending' | 'confirmed' | 'rejected'
  reviewed_by: string | null
  reviewed_at: string | null
}
```

### SQLite Schema

```sql
CREATE TABLE entities (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT CHECK(type IN ('person', 'organization', 'document')),
  aliases TEXT, -- JSON array
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_entities_name ON entities(name);
CREATE INDEX idx_entities_type ON entities(type);

CREATE TABLE entity_mentions (
  id TEXT PRIMARY KEY,
  entity_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  text TEXT NOT NULL,
  position_start INTEGER,
  position_end INTEGER,
  context TEXT,
  confidence REAL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_id) REFERENCES entities(id),
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

CREATE INDEX idx_mentions_entity ON entity_mentions(entity_id);
CREATE INDEX idx_mentions_document ON entity_mentions(document_id);

CREATE TABLE entity_linkages (
  id TEXT PRIMARY KEY,
  entity_a_id TEXT NOT NULL,
  entity_b_id TEXT NOT NULL,
  confidence REAL,
  algorithm TEXT,
  status TEXT CHECK(status IN ('pending', 'confirmed', 'rejected')),
  reviewed_by TEXT,
  reviewed_at DATETIME,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (entity_a_id) REFERENCES entities(id),
  FOREIGN KEY (entity_b_id) REFERENCES entities(id)
);

CREATE INDEX idx_linkages_status ON entity_linkages(status);
CREATE INDEX idx_linkages_confidence ON entity_linkages(confidence);
```

### Algorithm Workflow

1. **Extraction Phase**
   - Input: Document text
   - Process: NLP entity recognition (Compromise)
   - Output: List of entity mentions with positions

2. **Matching Phase**
   - Input: Entity mentions from all documents
   - Process:
     - Normalize names (lowercase, remove titles)
     - Calculate pairwise Levenshtein distance
     - Apply fuzzy matching with configurable threshold
   - Output: Candidate entity linkages with confidence scores

3. **Graph Construction Phase**
   - Input: Entities, mentions, linkages
   - Process: Build Graphology graph structure
   - Output: Entity graph with weighted edges

4. **Validation Phase**
   - Input: Pending linkages
   - Process: User reviews and confirms/rejects
   - Output: Updated entity graph with confirmed relationships

5. **Visualization Phase**
   - Input: Entity graph
   - Process: Convert to React Flow nodes/edges format
   - Output: Interactive graph visualization

### Configuration

```javascript
// config/entity-resolution.js
export const ENTITY_RESOLUTION_CONFIG = {
  // Matching thresholds
  confidence: {
    high: 0.8,
    medium: 0.5,
    low: 0.3
  },

  // Name normalization
  normalization: {
    lowercase: true,
    removeTitles: true,
    removeMiddleNames: false,
    removePunctuation: true
  },

  // NLP settings
  nlp: {
    language: 'en',
    extractTypes: ['people', 'organizations', 'places']
  },

  // Fuzzy matching
  fuzzyMatch: {
    algorithm: 'levenshtein',
    minLength: 3, // Don't match names <3 chars
    maxEditDistance: 3
  },

  // Graph visualization
  graph: {
    maxNodes: 1000,
    nodeSize: 50,
    edgeThickness: 2,
    colorByType: {
      person: '#4A90E2',
      organization: '#E24A4A',
      document: '#4AE290'
    }
  }
}
```

## Implementation Phases

### Phase 1: Core Entity Extraction (Days 1-2)
- Set up Compromise NLP library
- Implement entity extraction functions
- Create SQLite schema
- Write unit tests for extraction

### Phase 2: Fuzzy Matching Engine (Days 3-4)
- Implement Levenshtein distance calculations
- Build entity matching algorithm
- Add confidence scoring
- Write unit tests for matching

### Phase 3: Graph Data Structure (Days 5-6)
- Integrate Graphology library
- Build entity graph from database
- Implement graph persistence
- Write unit tests for graph operations

### Phase 4: User Feedback System (Days 7-8)
- Create user feedback database tables
- Implement confirm/reject logic
- Update graph on user feedback
- Write integration tests

### Phase 5: Graph Visualization (Days 9-10)
- Integrate React Flow library
- Build entity graph component
- Add zoom/pan/filter controls
- Implement node detail panel

### Phase 6: Integration & Testing (Days 11-12)
- End-to-end workflow testing
- Performance optimization
- Bug fixes
- QA acceptance testing

## Risk Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| NLP accuracy <80% | High | Use Compromise + custom rules; allow manual entity tagging |
| Performance degradation >1000 entities | Medium | Implement graph virtualization, pagination, lazy loading |
| Fuzzy matching false positives | High | Require user confirmation for medium/low confidence matches |
| Database scalability | Medium | Add proper indexes, consider graph database for future |
| UI complexity overwhelming users | Medium | Progressive disclosure, default to high-confidence matches only |

## Dependencies

### NPM Packages
- `compromise`: ^14.14.5 (NLP entity extraction)
- `fastest-levenshtein`: ^1.0.16 (string similarity)
- `fuzzyset`: ^1.0.7 (fuzzy matching)
- `graphology`: ^0.26.0 (graph data structure)
- `reactflow`: ^11.11.4 (graph visualization)
- `better-sqlite3`: Latest (SQLite database for Node.js)

### Installation
```bash
# Install all dependencies
npm install compromise fastest-levenshtein fuzzyset graphology reactflow better-sqlite3

# For frontend (if separate)
npm install reactflow
```

## Open Questions

1. **Frontend Framework**: Which React framework is being used? (Next.js, CRA, Vite?)
2. **API Architecture**: REST, GraphQL, or tRPC for backend communication?
3. **Document Storage**: How are documents currently stored/retrieved?
4. **Existing Analysis Engines**: Are there other analysis engines to follow as patterns?
5. **User Authentication**: How to associate user feedback with user accounts?
6. **Testing Framework**: Jest, Vitest, or Mocha for test suites?
7. **Deployment Strategy**: How to deploy new analysis engine to production?

These questions should be answered through codebase exploration before implementation begins.
