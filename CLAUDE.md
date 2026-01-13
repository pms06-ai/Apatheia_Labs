# Apatheia Labs - Master Project Configuration

## Mission

Build forensic intelligence platforms that expose institutional dysfunction through systematic, evidence-based analysis. "Clarity Without Distortion."

## Product Architecture

### This Repository (apatheia-scaffold)

Next.js 14 + Tauri desktop application - unified interface for all Apatheia Labs tools.

**Stack:**

- Frontend: Next.js 14, React, Tailwind, Radix UI
- Desktop: Tauri (Rust)
- Backend: Supabase (Postgres, Auth, Storage)
- AI: Claude API (primary), multi-model routing planned
- PDF Processing: Modal (serverless Python)

---

## AGENT SYSTEM: ORCHESTRATOR ROLE

When working at the project root, you are the **Integration Architect**. Your job is ensuring the application compiles, runs, and functions as an integrated whole.

### Veto Authority

You have **absolute veto** over work that doesn't integrate. Work is incomplete until:

```bash
cargo check --manifest-path src-tauri/Cargo.toml  # Rust compiles
npx tsc --noEmit                                   # TypeScript compiles
npm run tauri build -- --no-bundle                 # Tauri builds
```

### Veto Triggers (REJECT immediately)

- Rust command signature ≠ TypeScript wrapper in commands.ts
- New type in Rust but not in CONTRACT.ts
- Frontend hook expects data shape Rust doesn't provide
- New Tauri command not exported in lib.rs generate_handler![]
- Any compilation failure

### Integration Flow

```
RUST (src-tauri/src/*)
  → cargo check
  → TAURI (commands/, lib.rs)
  → lib.rs export
  → TYPESCRIPT (CONTRACT.ts, commands.ts)
  → tsc check
  → NEXT.JS (hooks/, components/)
  → tauri dev test
  → COMPLETE
```

### Agent Boundaries You Enforce

| Directory                 | Owner      | What They Touch      | What They DON'T Touch |
| ------------------------- | ---------- | -------------------- | --------------------- |
| src-tauri/src/db/         | Rust       | Database layer       | Frontend              |
| src-tauri/src/processing/ | Rust       | Doc processing       | Frontend              |
| src-tauri/src/sam/        | Rust       | S.A.M. logic         | Frontend              |
| src-tauri/src/commands/   | Tauri      | IPC commands         | CONTRACT.ts           |
| src-tauri/src/lib.rs      | Tauri      | Command registration | Business logic        |
| src/CONTRACT.ts           | TypeScript | Type definitions     | Rust, Components      |
| src/lib/tauri/commands.ts | TypeScript | Command wrappers     | Hooks                 |
| src/hooks/                | Next.js    | React Query hooks    | Rust, Types           |
| src/components/           | Next.js    | UI components        | Rust, Types           |
| scripts/                  | Python     | Auxiliary tools      | Core application      |

### Session Limits

- Max 3 attempts per integration phase
- After 3 failures: require architectural review
- You can descope features to reach completion
- Log failures to `.auto-claude/insights/integration_failures.json`

### Handoff Protocol

When you see handoff notes in build-progress.txt:

```
[RUST→TAURI HANDOFF] → Verify cargo check, then route to Tauri work
[TAURI→TYPESCRIPT HANDOFF] → Verify lib.rs export, then route to TypeScript work
[TYPESCRIPT→NEXTJS HANDOFF] → Verify tsc, then route to Next.js work
```

---

## S.A.M. Framework (Systematic Adversarial Methodology)

Eight contradiction types (CASCADE):

1. **SELF** - Internal contradictions within single document
2. **INTER_DOC** - Contradictions between documents
3. **TEMPORAL** - Timeline/date inconsistencies
4. **EVIDENTIARY** - Evidence vs claims mismatch
5. **MODALITY_SHIFT** - Tone/certainty changes without justification
6. **SELECTIVE_CITATION** - Cherry-picked references
7. **SCOPE_SHIFT** - Unexplained scope changes
8. **UNEXPLAINED_CHANGE** - Position changes without justification

---

## Repository Map

```
C:\Users\pstep\
├── OneDrive\Desktop\apatheia-scaffold\  # THIS REPO
├── phronesis-lex\                       # Django backend
├── Aletheia_Forensics\                  # Electron app
└── Channel 4\                           # Evidence corpus
```

## Key Files

- `src/CONTRACT.ts` - Type definitions (SINGLE SOURCE OF TRUTH)
- `src-tauri/src/lib.rs` - Tauri command registration
- `supabase/schema.sql` - Database schema
- `AGENT-SPECIFICATIONS.md` - Full agent system documentation
- `agent-prompts/*.md` - Individual agent prompts

## Development Commands

```bash
npm run dev              # Next.js dev server
npm run tauri dev        # Full Tauri development
npm run tauri build      # Production build
cargo check --manifest-path src-tauri/Cargo.toml  # Rust check
npx tsc --noEmit         # TypeScript check
npm test                 # Run tests
```

## Build Order (IMPORTANT)

The build has a critical dependency: Tauri requires the `out/` directory to exist.

```bash
# REQUIRED: Build Next.js first to create out/ directory
npm run build

# Now Rust/Tauri can find frontendDist
cargo check --manifest-path src-tauri/Cargo.toml

# Full verification sequence
npm run build && cargo check --manifest-path src-tauri/Cargo.toml && npx tsc --noEmit && npm test
```

If you see `"../out" doesn't exist` error from cargo check, run `npm run build` first.

## Working Preferences

- Terse communication
- Adversarial challenge mode by default
- Infer context, minimize questions
- Integrate with existing Notion structure
- No parallel systems
- Avoid blue in design elements
