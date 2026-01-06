# Specification: Complete Temporal Analysis Engine

## Overview

This feature implements a comprehensive temporal analysis engine that extracts, normalizes, and analyzes dates and time references across institutional documents. The engine will detect temporal inconsistencies, backdating attempts, and impossible event sequences—a critical capability for investigative journalism and legal analysis that no competitor addresses systematically. By maintaining persistent temporal context across document sets, we solve pain-4-1 (AI assistants lack temporal pattern tracking) and provide a competitive differentiator.

## Workflow Type

**Type**: feature

**Rationale**: This is a new capability implementation that extends the existing analysis engine suite. It adds date extraction, temporal normalization, and inconsistency detection as a new analysis dimension alongside existing engines (entity-resolution, omission, narrative).

## Task Scope

### Services Involved
- **TypeScript/Node.js Analysis Service** (primary) - Core temporal engine implementation, AI-powered date extraction, validation layer
- **Python Scripts Service** (secondary) - SQLite persistence for temporal data if needed

### This Task Will:
- [x] Extract dates from document text with 95%+ accuracy using multi-layer validation (AI Client → chrono-node → date-fns)
- [x] Normalize relative date references ("three weeks later") to absolute dates when temporal anchors exist
- [x] Detect and flag temporal impossibilities (documents referencing future events, impossible sequences)
- [x] Provide structured temporal data output for Phase 2 timeline visualization integration
- [x] Maintain document-to-date mappings with citation tracking for transparency

### Out of Scope:
- Timeline visualization UI (deferred to Phase 2)
- Timezone handling (Phase 1 uses UTC/local time only)
- Natural language date fuzzy matching beyond chrono-node capabilities
- Historical calendar system conversions (Gregorian only)

## Service Context

### TypeScript Analysis Service

**Tech Stack:**
- Language: TypeScript
- Framework: Node.js
- Key directories: `src/lib/engines/`, `src/lib/`
- Date Libraries: date-fns@4.1.0, chrono-node@2.7.0 (to install)
- AI SDK: @anthropic-ai/sdk@0.71.2

**Entry Point:** `src/lib/engines/temporal.ts` (identified in research phase)

**How to Run:**
```bash
# Development
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint
```

**Dependencies to Install:**
```bash
npm install chrono-node@^2.7.0
```

**Environment Variables Required:**
- `ANTHROPIC_API_KEY` - Primary AI provider for date extraction
- `GROQ_API_KEY` - Fallback AI provider
- `GOOGLE_API_KEY` - Fallback AI provider

## Files to Modify

| File | Service | What to Change |
|------|---------|---------------|
| `src/lib/engines/temporal.ts` | TypeScript Service | Complete implementation: add multi-layer validation (AI → chrono-node → date-fns), date normalization, inconsistency detection, citation tracking |
| `package.json` | TypeScript Service | Add `"chrono-node": "^2.7.0"` to dependencies |
| `src/lib/types.ts` (if exists) | TypeScript Service | Define TypeScript interfaces for `TemporalEvent`, `TemporalInconsistency`, `DateCitation` |

## Files to Reference

These files show patterns to follow:

| File | Pattern to Copy |
|------|----------------|
| `src/lib/engines/entity-resolution.ts` | AI Client integration pattern, structured output extraction from documents |
| `src/lib/engines/omission.ts` | Analysis engine structure, inconsistency detection pattern |
| `src/lib/engines/narrative.ts` | Multi-document cross-referencing pattern |
| `src/lib/ai-client.ts` | Multi-provider AI client usage (Anthropic/Groq/Gemini fallback pattern) |
| `src/lib/env.ts` | Environment variable configuration pattern |

## Patterns to Follow

### AI Client Integration Pattern

From `src/lib/ai-client.ts`:

```typescript
import { generateJSON } from '@/lib/ai-client';

// Direct JSON generation with system prompt
const systemPrompt = 'You are a temporal analysis expert. Extract dates from documents...';
const result = await generateJSON(systemPrompt, documentText);

// Result is automatically parsed JSON
// Multi-provider fallback handled internally (Anthropic → Groq → Gemini)
```

**Key Points:**
- Use `generateJSON()` for structured JSON extraction (provider-agnostic)
- Multi-provider fallback handled automatically by ai-client
- System prompt should specify JSON output format clearly
- Always validate AI outputs with secondary methods (chrono-node, date-fns)

### Date Validation Multi-Layer Pattern

Recommended implementation approach:

```typescript
import { generateJSON } from '@/lib/ai-client';
import { parse, parseISO, isValid, isBefore, isAfter, addWeeks, format } from 'date-fns';
import * as chrono from 'chrono-node';

// Layer 1: AI extraction with context
const systemPrompt = 'Extract dates with their surrounding context...';
const aiResult = await generateJSON(systemPrompt, documentText);

// Layer 2: chrono-node validation (verify dates exist in source)
const validatedDates = [];
for (const candidate of aiResult.dates) {
  const chronoResults = chrono.parse(documentText);
  const match = chronoResults.find(r =>
    r.text === candidate.rawText ||
    r.index >= candidate.position - 10 && r.index <= candidate.position + 10
  );
  if (match) {
    validatedDates.push({
      ...candidate,
      chronoDate: match.start.date(),
      position: match.index
    });
  }
}

// Layer 3: date-fns normalization and logic validation
const normalizedDates = validatedDates
  .map(d => {
    const parsed = new Date(d.chronoDate);
    return {
      ...d,
      date: format(parsed, 'yyyy-MM-dd'),  // Normalize to string format
      isValid: isValid(parsed)
    };
  })
  .filter(d => d.isValid);
```

**Key Points:**
- `generateJSON()` provides initial extraction with broad coverage
- chrono-node confirms dates exist in source text (prevents hallucination)
- date-fns handles normalization to string format and validation
- All dates must pass `isValid()` check
- Maintain compatibility with existing `date: string` format

### Tree-Shakeable Imports Pattern

```typescript
// ✅ DO: Named imports for tree-shaking
import { parse, format, isBefore, addDays, isValid } from 'date-fns';

// ❌ DON'T: Default imports bloat bundle
import dateFns from 'date-fns';
```

**Key Points:**
- Import only functions you need
- Reduces bundle size significantly
- date-fns v4 fully supports tree-shaking

### Immutability Pattern (date-fns)

```typescript
// All date-fns functions return NEW Date objects
const originalDate = new Date('2024-01-01');
const futureDate = addWeeks(originalDate, 3);

// originalDate unchanged, futureDate is new instance
console.log(originalDate); // 2024-01-01T00:00:00.000Z
console.log(futureDate);   // 2024-01-22T00:00:00.000Z

// Convert to string for storage (matching existing TemporalEvent format)
const dateString = format(futureDate, 'yyyy-MM-dd'); // "2024-01-22"
```

**Key Points:**
- Never mutate Date objects directly
- All date-fns operations return new Date objects
- Use `format()` to convert Date objects to strings for storage
- Store dates as strings in YYYY-MM-DD format (existing schema)

## Requirements

### Functional Requirements

1. **Date Extraction with 95%+ Accuracy**
   - Description: Extract all date references from document text using multi-layer validation (AI Client → chrono-node → date-fns)
   - Acceptance: Test suite validates against ground-truth dataset with ≥95% precision and recall

2. **Relative Date Resolution**
   - Description: Convert relative references ("three weeks later", "the following month") to absolute dates when temporal anchor exists in context
   - Acceptance: Given anchor date "January 1, 2024" and phrase "three weeks later", engine outputs "January 22, 2024"

3. **Backdating Detection**
   - Description: Automatically flag documents that reference events dated after the document's purported creation date
   - Acceptance: Document dated "March 1, 2024" referencing "March 15, 2024 meeting" triggers `TEMPORAL_IMPOSSIBILITY` flag

4. **Impossible Sequence Detection**
   - Description: Identify timeline contradictions across multiple documents (Event A after Event B in Doc1, but B after A in Doc2)
   - Acceptance: Cross-document analysis detects and reports all pairwise temporal contradictions

5. **Citation Tracking**
   - Description: Maintain source text position for every extracted date for transparency and verification
   - Acceptance: Each date in output includes `{ text: string, position: number, confidence: number }`

### Edge Cases

1. **Ambiguous Date Formats** - Use chrono-node's strict mode for formal documents, casual mode for varied formats; fallback to AI for truly ambiguous cases
2. **False Positive Numbers** - Validate with chrono-node to filter "5.12.2023" as section numbers vs dates based on context
3. **Multiple Calendar Systems** - Out of scope for Phase 1; flag and skip non-Gregorian dates
4. **Missing Anchor Dates** - Relative dates without context remain unresolved; flag with `REQUIRES_ANCHOR` status
5. **Timezone Ambiguity** - Phase 1 treats all dates as UTC/local; flag international documents for manual review

## Implementation Notes

### DO
- Use `generateJSON()` from `@/lib/ai-client` for AI extraction (existing pattern)
- Reuse chrono-node's `result.index` for accurate citation position tracking
- Use date-fns `isBefore`/`isAfter` for all temporal impossibility checks
- Validate EVERY extracted date with `isValid()` before using in logic
- Use strict mode chrono parsing for formal legal/institutional documents
- Structure output to match existing engine patterns (maintain `date: string` format)
- Store dates as strings in YYYY-MM-DD format (matches existing TemporalEvent)
- Extend existing interfaces with optional fields (don't break compatibility)
- Add unit tests for each validation layer independently
- Log confidence scores for all extracted dates

### DON'T
- Trust AI-extracted dates without validation (hallucination risk)
- Use date-fns `parse()` without explicit format string (will fail)
- Mutate Date objects (all date-fns functions return new instances)
- Store Date objects in TemporalEvent (use string format: YYYY-MM-DD)
- Break existing interface contracts (extend, don't replace)
- Attempt timezone conversions in Phase 1 (deferred)
- Skip edge case handling for ambiguous formats (degrades accuracy)
- Assume relative dates have anchors (check context first)

## Development Environment

### Install Dependencies

```bash
npm install chrono-node
```

### Start Services

```bash
# Development server with hot reload
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Format code
npm run format
```

### Service URLs
- Development: http://localhost:5173 (assumed Vite default if frontend exists)

### Required Environment Variables
- `ANTHROPIC_API_KEY`: Primary AI provider for date extraction (claude-3-5-sonnet)
- `GROQ_API_KEY`: Fallback AI provider
- `GOOGLE_API_KEY`: Secondary fallback AI provider

### Database (if temporal data persistence needed)
- SQLite via better-sqlite3 (already installed)
- Schema TBD based on implementation needs

## Success Criteria

The task is complete when:

1. [x] Date extraction achieves ≥95% accuracy on test document set (precision and recall)
2. [x] Relative dates convert to absolute when anchor exists ("three weeks later" → specific date)
3. [x] Backdating automatically flagged (document date < referenced event date)
4. [x] Impossible sequences detected across multi-document sets
5. [x] All extracted dates include citation tracking (text snippet + position)
6. [x] No console errors during analysis runs
7. [x] Existing engine tests still pass (no regression)
8. [x] chrono-node dependency installed and imported correctly
9. [x] Type definitions added for TemporalEvent, TemporalInconsistency
10. [x] Integration interface defined for Phase 2 timeline visualization

## QA Acceptance Criteria

**CRITICAL**: These criteria must be verified by the QA Agent before sign-off.

### Unit Tests
| Test | File | What to Verify |
|------|------|----------------|
| Date Extraction Accuracy | `src/lib/engines/temporal.test.ts` | AI + chrono-node + date-fns pipeline achieves 95%+ accuracy on varied formats |
| Relative Date Resolution | `src/lib/engines/temporal.test.ts` | "three weeks later" with anchor "2024-01-01" returns "2024-01-22" |
| Validation Layer | `src/lib/engines/temporal.test.ts` | Hallucinated dates filtered out by chrono-node validation |
| date-fns Immutability | `src/lib/engines/temporal.test.ts` | Original dates unchanged after addWeeks/addDays operations |
| isValid() Checks | `src/lib/engines/temporal.test.ts` | Invalid dates rejected before use in comparisons |

### Integration Tests
| Test | Services | What to Verify |
|------|----------|----------------|
| AI Client Fallback | TypeScript → AI Providers | Graceful degradation from Anthropic → Groq → Gemini on provider failure |
| Multi-Document Analysis | Temporal Engine | Cross-document temporal contradictions detected correctly |
| Citation Accuracy | Temporal Engine | Extracted dates map to correct text positions (±5 chars) |

### End-to-End Tests
| Flow | Steps | Expected Outcome |
|------|-------|------------------|
| Backdating Detection | 1. Input document dated "2024-03-01" 2. Document references "2024-03-15 meeting" 3. Run temporal analysis | Flag: `TEMPORAL_IMPOSSIBILITY` with details "Document predates referenced event by 14 days" |
| Timeline Reconstruction | 1. Input 3 documents with overlapping events 2. Run temporal analysis | Chronological event list with cross-references, contradictions flagged |
| Relative Date Resolution | 1. Input document: "Meeting on Jan 1. Three weeks later, decision announced." 2. Run analysis | Output: `[{date: 2024-01-01, type: 'absolute'}, {date: 2024-01-22, type: 'resolved', anchor: 2024-01-01}]` |

### Manual Verification
| Check | Method | Expected |
|-------|--------|----------|
| chrono-node Installation | `npm list chrono-node` | chrono-node@2.7.0 installed |
| No Hallucinations | Review AI extraction logs vs source text | All dates verifiable in source (no fabricated dates) |
| Confidence Scores | Check output JSON | All dates include confidence 0.0-1.0 |
| Edge Case Handling | Test "Chapter 5.12.2023" section reference | Correctly identified as NOT a date |

### Code Quality Checks
| Check | Tool | Expected |
|-------|------|----------|
| Type Safety | `npm run type-check` | 0 TypeScript errors |
| Linting | `npm run lint` | 0 ESLint warnings/errors |
| Code Format | `npm run format` | All files Prettier-compliant |
| Tree-Shaking | Webpack bundle analyzer | Only imported date-fns functions in bundle |

### QA Sign-off Requirements
- [ ] All unit tests pass with 95%+ accuracy threshold met
- [ ] All integration tests pass (AI provider fallback works)
- [ ] All E2E tests pass (backdating, timeline, relative dates)
- [ ] Manual verification complete (chrono-node installed, no hallucinations)
- [ ] Code quality checks pass (type-check, lint, format)
- [ ] No regressions in existing engine tests (entity-resolution, omission, narrative)
- [ ] Documentation added for API surface (JSDoc comments)
- [ ] Phase 2 integration interface defined and documented
- [ ] Performance acceptable (<2s for 5000-word documents)
- [ ] No security vulnerabilities introduced (API key handling follows existing patterns)

## Architecture Decisions

### Data Model

**IMPORTANT**: Extend existing types from `src/lib/engines/temporal.ts` rather than replacing them.

**Existing Structure** (maintain compatibility):
```typescript
interface TemporalEvent {
  id: string;
  date: string;              // YYYY-MM-DD format
  time?: string;             // HH:MM format (optional)
  description: string;
  sourceDocumentId: string;
  confidence: 'exact' | 'inferred' | 'estimated';
}
```

**Phase 1 Enhancements** (add new optional fields):
```typescript
interface TemporalEvent {
  id: string;
  date: string;              // YYYY-MM-DD format (existing)
  time?: string;             // HH:MM format (existing)
  description: string;       // (existing)
  sourceDocumentId: string;  // (existing)
  confidence: 'exact' | 'inferred' | 'estimated';  // (existing)

  // NEW Phase 1 fields for enhanced tracking:
  rawText?: string;          // Original extracted text ("three weeks later")
  position?: number;         // Character index in source (from chrono-node)
  dateType?: 'absolute' | 'relative' | 'resolved';
  anchorDate?: string;       // Reference date if dateType='resolved' (YYYY-MM-DD)
  extractionMethod?: 'ai' | 'chrono' | 'validated';  // Confidence source
}

interface TemporalInconsistency {
  description: string;
  events: string[];          // Event IDs (existing)
  severity: 'critical' | 'high' | 'medium';  // (existing)

  // NEW Phase 1 fields:
  type?: 'BACKDATING' | 'IMPOSSIBLE_SEQUENCE' | 'CONTRADICTION';
}

interface TemporalAnalysisResult {
  timeline: TemporalEvent[];           // Sorted chronologically (existing)
  inconsistencies: TemporalInconsistency[];  // (existing)

  // NEW Phase 1 metadata:
  metadata?: {
    documentsAnalyzed: number;
    datesExtracted: number;
    validationLayersUsed: string[];    // e.g., ['ai', 'chrono', 'date-fns']
  };
}
```

### Validation Pipeline

```
Document Text
     ↓
[Layer 1: AI Client Extraction]
  → Broad coverage, context-aware
  → Returns candidate dates + confidence
     ↓
[Layer 2: chrono-node Validation]
  → Confirms dates exist in source text
  → Filters hallucinations
  → Provides precise position tracking
     ↓
[Layer 3: date-fns Normalization]
  → Validates with isValid()
  → Normalizes formats
  → Resolves relative dates with anchors
     ↓
[Layer 4: Temporal Logic Analysis]
  → isBefore/isAfter impossibility checks
  → Cross-document contradiction detection
     ↓
TemporalAnalysisResult
```

## Phase 2 Integration Interface

For future timeline visualization integration:

```typescript
interface TimelineVisualizationData {
  events: Array<{
    id: string;
    date: string;           // ISO 8601 format
    label: string;
    documentId: string;
    confidence: number;
    flagged: boolean;       // True if part of inconsistency
  }>;
  inconsistencies: Array<{
    id: string;
    type: string;
    affectedEventIds: string[];
    severity: string;
  }>;
}

// Export function for Phase 2
export function prepareTimelineData(
  result: TemporalAnalysisResult
): TimelineVisualizationData;
```

## Dependencies

### Already Installed
- date-fns@4.1.0 - Date manipulation and validation
- @anthropic-ai/sdk@0.71.2 - AI-powered extraction
- groq-sdk@0.8.0 - Fallback AI provider
- better-sqlite3 - Optional persistence layer

### To Install
- chrono-node@^2.7.0 - Natural language date parsing and validation

### Future (Phase 2)
- vis-timeline - Timeline visualization (deferred)

## Risk Assessment

### High Risk
- **AI Hallucination**: AI may fabricate dates not in source
  - Mitigation: chrono-node validation layer, confidence scoring
- **Accuracy Threshold**: 95% target may be challenging for varied formats
  - Mitigation: Multi-layer validation, strict mode for formal docs

### Medium Risk
- **Relative Date Anchoring**: "Three weeks later" requires context
  - Mitigation: Clear flagging when anchor missing, conservative resolution
- **Performance**: chrono-node slower on large documents (5000+ words)
  - Mitigation: Document chunking, async processing

### Low Risk
- **Timezone Handling**: Phase 1 punts on this complexity
  - Mitigation: Explicit UTC assumption, flag international docs
- **Calendar Systems**: Non-Gregorian dates out of scope
  - Mitigation: Detection and skipping with warning flags

---

**Implementation Estimate**: 2-3 days for core engine + validation layers + unit tests
**Testing Estimate**: 1 day for integration tests + ground-truth dataset validation
**Total**: ~4 days to production-ready temporal analysis engine
