# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Mission

Forensic intelligence platform exposing institutional dysfunction through systematic, evidence-based analysis. "Clarity Without Distortion."

## Architecture

Vite + React Router 7 + Tauri 2 desktop application (Phronesis FCIP v6.0).

**Stack:**

- Frontend: Vite 6, React 18, React Router 7, Tailwind CSS, Radix UI
- Desktop: Tauri 2.9 (Rust 2021)
- Database: SQLite (sqlx)
- AI: Claude (Anthropic)
- State: Zustand, TanStack Query
- Document Processing: pdf-extract (Rust), Docker Python tools for OCR
- Workspaces: MCP server (@apatheia/mcp-server), Obsidian plugin (obsidian-phronesis)

## Critical Integration Rules

Work is incomplete until all three verification steps pass:

```bash
cargo check --manifest-path src-tauri/Cargo.toml  # Rust compiles
npx tsc --noEmit                                   # TypeScript compiles
npm run tauri build -- --no-bundle                 # Tauri builds
```

### Type Contract Enforcement

**CONTRACT.ts is the SINGLE SOURCE OF TRUTH**. Every change must maintain this chain:

```
Rust type (src-tauri/src/*)
  → must match TypeScript (CONTRACT.ts)
  → must match wrapper (lib/tauri/commands.ts)
  → must match hook (hooks/*.ts)
```

**VETO immediately if:**

- Rust command signature ≠ TypeScript wrapper in commands.ts
- New type in Rust but not in CONTRACT.ts
- Frontend hook expects data shape Rust doesn't provide
- New Tauri command not exported in lib.rs `generate_handler![]`
- Any compilation failure

## Build Order

**CRITICAL:** Vite must build before Rust can compile (Tauri expects `dist/` as `frontendDist`).

```bash
# REQUIRED first
npm run build

# Then Rust can compile
cargo check --manifest-path src-tauri/Cargo.toml

# Full verification
npm run validate && npm run build && cargo check --manifest-path src-tauri/Cargo.toml
```

## Development Commands

```bash
# Development
npm run dev              # Vite dev server only
npm run tauri:dev        # Full Tauri desktop app

# Build
npm run build            # Vite production build → dist/
npm run tauri:build      # Production desktop app

# Verification
cargo check --manifest-path src-tauri/Cargo.toml  # Rust compile check
npx tsc --noEmit         # TypeScript compile check
npm run type-check       # TypeScript check (alias)
npm run lint             # ESLint
npm test                 # Jest tests
npm run validate         # type-check + lint + test

# Feature-specific builds (see FEATURES.md)
cargo build --manifest-path src-tauri/Cargo.toml --no-default-features --features custom-protocol  # Minimal build
cargo build --manifest-path src-tauri/Cargo.toml --features vendored-tls  # Static OpenSSL build

# Workspaces
npm run mcp:dev          # MCP server development
npm run mcp:build        # Build MCP server
npm run obsidian:build   # Build Obsidian plugin

# Docker
npm run docker:up        # Start services
npm run docker:ocr       # Run OCR processing
npm run docker:embed     # Generate embeddings

# Obsidian vault sync
npm run vault:sync       # Bidirectional sync
npm run vault:status     # Check sync status

# Sidecar (Node.js runner for AI engines)
npm run build:sidecar    # Build engine-runner.ts → engine-runner.js
```

## Key Files & Directories

### Type System

- **`src/CONTRACT.ts`** - Type definitions (SINGLE SOURCE OF TRUTH for IPC types)

### Rust Backend (src-tauri/src/)

- **`lib.rs`** - Tauri entry point, command registration, AppState
- **`commands/`** - Tauri IPC command handlers (analysis.rs, documents.rs, cases.rs, export.rs, settings.rs, investigate.rs)
- **`db/`** - SQLite database layer
- **`engines/`** - S.A.M. analysis engines (11 engines: entity, temporal, argumentation, bias, contradiction, accountability, professional, omission, expert, documentary, narrative)
- **`orchestrator/`** - Engine job queue system
- **`sam/`** - S.A.M. methodology implementation
- **`processing/`** - Document processing (PDF extraction, chunking)
- **`storage/`** - File storage layer
- **`ai/`** - Claude API integration
- **`credentials.rs`** - Keyring-based secure storage
- **`error.rs`** - Unified error handling

### TypeScript Frontend (src/)

- **`lib/tauri/commands.ts`** - Typed wrappers for Tauri commands (NEVER call invoke() directly)
- **`hooks/`** - TanStack Query hooks consuming commands.ts
- **`components/`** - React components (analysis/, cases/, documents/, layout/, sam/, ui/)
- **`pages/`** - React Router pages (dashboard, documents, investigate, settings)
- **`lib/engines/`** - TypeScript engine interfaces and metadata

### Navigation Structure

- **`/`** - Dashboard (home page)
- **`/documents`** - Document management
- **`/investigate`** - Analytics Hub (comprehensive forensic dashboard with visualizations)
- **`/settings`** - Application settings

### Workspaces

- **`packages/mcp-server/`** - MCP server for Claude integration
- **`packages/obsidian-plugin/`** - Obsidian plugin for vault integration

### Build Artifacts

- **`dist/`** - Vite build output (required by Tauri)
- **`src-tauri/sidecars/engine-runner.js`** - Built sidecar (Node.js process)

## Adding a New Tauri Command (Full Flow)

1. **Rust**: Implement business logic in `src-tauri/src/db/` or `src-tauri/src/processing/`
2. **Rust**: Add command handler in `src-tauri/src/commands/*.rs`
3. **Rust**: Register in `src-tauri/src/lib.rs` → `generate_handler![]`
4. **Rust**: Verify: `cargo check --manifest-path src-tauri/Cargo.toml`
5. **TypeScript**: Add types to `src/CONTRACT.ts`
6. **TypeScript**: Add wrapper to `src/lib/tauri/commands.ts`
7. **TypeScript**: Verify: `npx tsc --noEmit`
8. **React**: Create hook in `src/hooks/`
9. **React**: Use hook in component
10. **Integration**: Verify: `npm run tauri dev` (end-to-end test)

## Module Boundaries

| Directory                 | Owner      | Touches              | NEVER Touches     |
| ------------------------- | ---------- | -------------------- | ----------------- |
| src-tauri/src/db/         | Rust       | Database layer       | Frontend          |
| src-tauri/src/processing/ | Rust       | Document processing  | Frontend          |
| src-tauri/src/engines/    | Rust       | S.A.M. engines       | Frontend          |
| src-tauri/src/commands/   | Tauri      | IPC commands         | CONTRACT.ts       |
| src-tauri/src/lib.rs      | Tauri      | Command registration | Business logic    |
| src/CONTRACT.ts           | TypeScript | Type definitions     | Rust, Components  |
| src/lib/tauri/commands.ts | TypeScript | Command wrappers     | Hooks, Components |
| src/hooks/                | React      | TanStack Query       | Rust, Types       |
| src/components/           | React      | UI components        | Rust, Types       |

## S.A.M. Framework

Systematic Adversarial Methodology - four-phase cascade analysis:

### Four Phases

1. **ANCHOR** - Identify false premise origin points
2. **INHERIT** - Track institutional propagation without verification
3. **COMPOUND** - Document authority accumulation through repetition
4. **ARRIVE** - Map catastrophic outcomes

### Eight Contradiction Types

| Code                   | Type                     | Description                                  |
| ---------------------- | ------------------------ | -------------------------------------------- |
| **SELF**               | Internal contradiction   | Within single document                       |
| **INTER_DOC**          | Cross-document conflict  | Between documents                            |
| **TEMPORAL**           | Timeline mismatch        | Date/time inconsistencies                    |
| **EVIDENTIARY**        | Claim vs evidence gap    | Evidence doesn't support claims              |
| **MODALITY_SHIFT**     | Certainty/tone change    | Tone/certainty changes without justification |
| **SELECTIVE_CITATION** | Cherry-picking           | Selective use of references                  |
| **SCOPE_SHIFT**        | Unexplained scope change | Scope changes without explanation            |
| **UNEXPLAINED_CHANGE** | Position flip            | Position changes without justification       |

## Analysis Engines

11 specialized engines in `src-tauri/src/engines/`:

| Engine            | File                | Function                           |
| ----------------- | ------------------- | ---------------------------------- |
| Entity Resolution | `entity.rs`         | Canonical identity mapping         |
| Temporal Parser   | `temporal.rs`       | Timeline construction              |
| Argumentation     | `argumentation.rs`  | Toulmin structure building         |
| Bias Detection    | `bias.rs`           | Statistical imbalance analysis     |
| Contradiction     | `contradiction.rs`  | Cross-document inconsistencies     |
| Accountability    | `accountability.rs` | Statutory duty violations          |
| Professional      | `professional.rs`   | Per-professional behavior patterns |
| Omission          | `omission.rs`       | Source-to-report gap analysis      |
| Expert Witness    | `expert.rs`         | FJC compliance, scope analysis     |
| Documentary       | `documentary.rs`    | News/media portrayal vs sources    |
| Narrative         | `narrative.rs`      | Claim mutation tracking            |

**Key Integrity Notes:**

- Bias cascade tracing uses the last document that actually matched the claim as the source for each step
- Network statistics count all extracted entities, including isolated mentions, when computing totals and derived metrics

## Rust Patterns

### Command Handler Template

```rust
use tauri::State;
use crate::AppState;

/// Tauri command for [functionality].
/// TypeScript: commands.ts::yourCommand()
/// CONTRACT.ts: YourResponse
#[tauri::command]
pub async fn your_command(
    state: State<'_, AppState>,
    input: String,
) -> Result<YourResponse, String> {
    let db = state.db.read().await;
    // Implementation...
    Ok(result)
}
```

### Error Handling

Always return `Result<T, String>` for IPC. Use `.map_err(|e| e.to_string())` or `.map_err(|e| format!("Context: {}", e))`.

### Type Annotations

Document Rust types that cross IPC:

```rust
/// TypeScript: YourType in CONTRACT.ts
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct YourType { ... }
```

## TypeScript Patterns

### Command Wrapper Template

```typescript
import { invoke } from '@tauri-apps/api/core'
import { isDesktop } from './client'
import type { YourResponse } from '@/CONTRACT'

/**
 * Tauri command: commands::module::your_command
 */
export async function yourCommand(input: string): Promise<YourResponse> {
  if (!isDesktop()) {
    throw new Error('yourCommand requires Tauri')
  }
  return invoke<YourResponse>('your_command', { input })
}
```

### React Query Hook Template

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { yourCommand } from '@/lib/tauri/commands'

export function useYourFeature() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['feature'],
    queryFn: () => yourCommand('input'),
  })

  return { data: query.data, isLoading: query.isLoading }
}
```

## Type Mapping (Rust ↔ TypeScript)

| Rust              | TypeScript          |
| ----------------- | ------------------- |
| `String`          | `string`            |
| `i32/i64/f32/f64` | `number`            |
| `bool`            | `boolean`           |
| `Option<T>`       | `T \| null`         |
| `Vec<T>`          | `T[]`               |
| `HashMap<K, V>`   | `Record<K, V>`      |
| `DateTime<Utc>`   | `string` (ISO 8601) |

## Testing

```bash
# TypeScript tests
npm test                                    # Run all tests
npm test -- --testPathPattern="entity"      # Run tests matching pattern
npm test -- src/__tests__/engines/          # Run tests in directory
npm run test:watch                          # Watch mode
npm run test:coverage                       # With coverage report

# Rust tests
cargo test --manifest-path src-tauri/Cargo.toml                    # All tests
cargo test --manifest-path src-tauri/Cargo.toml test_entity        # Single test
cargo test --manifest-path src-tauri/Cargo.toml -- --nocapture     # With output
```

## Cargo Features

See [FEATURES.md](./FEATURES.md) for detailed documentation on available Cargo features.

**Quick reference:**

- `custom-protocol` (default) - Tauri custom protocol for production
- `cloud-storage` (default) - Google Drive/OneDrive integration
- `vendored-tls` - Statically linked OpenSSL for portable builds
- `dev` - Development-only features

**Optimizations:**

- Tokio uses specific features (`rt-multi-thread`, `macros`, `sync`, `time`, `process`, `io-util`, `fs`) instead of `full`
- Cloud storage dependencies are optional and excluded in minimal builds

## Working Preferences

- Terse, technical communication
- Infer context, minimize clarifying questions
- Challenge architectural decisions (adversarial mode)
- No parallel systems - integrate with existing structure
- Avoid blue in design elements (brand guideline)
