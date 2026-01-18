# Apatheia Labs - Phronesis Platform

> "Clarity Without Distortion"

Forensic intelligence platform for institutional accountability analysis. Desktop application built with Vite, React Router, and Tauri.

## Overview

Phronesis employs the **Systematic Adversarial Methodology (S.A.M.)** for reading institutional documents "against the grain" - tracing how false premises propagate through agencies, accumulate authority through repetition, and cause harmful outcomes.

## Stack

| Layer    | Technology                                               |
| -------- | -------------------------------------------------------- |
| Frontend | Vite 6, React 18, React Router 7, Tailwind CSS, Radix UI |
| Desktop  | Tauri 2 (Rust backend)                                   |
| State    | Zustand, TanStack React Query                            |
| AI       | Anthropic Claude API                                     |
| Database | SQLite (local)                                           |
| Testing  | Jest, Testing Library                                    |

## S.A.M. Methodology

Four-phase cascade analysis:

- **ANCHOR** - Identify false premise origin points
- **INHERIT** - Track institutional propagation without verification
- **COMPOUND** - Document authority accumulation through repetition
- **ARRIVE** - Map catastrophic outcomes

### Eight Contradiction Types

| Code               | Type                     |
| ------------------ | ------------------------ |
| SELF               | Internal contradiction   |
| INTER_DOC          | Cross-document conflict  |
| TEMPORAL           | Timeline mismatch        |
| EVIDENTIARY        | Claim vs evidence gap    |
| MODALITY_SHIFT     | Certainty/tone change    |
| SELECTIVE_CITATION | Cherry-picking           |
| SCOPE_SHIFT        | Unexplained scope change |
| UNEXPLAINED_CHANGE | Position flip            |

## Quick Start

```bash
# Install dependencies
npm install

# Start development server (Vite)
npm run dev

# Start Tauri desktop app in dev mode
npm run tauri:dev

# Build for production
npm run build

# Build Tauri desktop app
npm run tauri:build
```

## Platform + Website Workflow

- Platform code lives in `src/`, `src-tauri/`, and `packages/`.
- Website content lives in `website/` and is independent of app builds.
- Edit markdown sources in `website/research/` or `website/docs/research/`.
- Regenerate static research pages with `npm run website:build`.
- Treat `website/landing/` as generated output.

## Project Structure

```
apatheia-labs/
├── src/                          # Frontend source
│   ├── pages/                    # React Router pages
│   │   ├── dashboard.tsx         # Home dashboard
│   │   ├── documents.tsx         # Document management
│   │   ├── investigate.tsx       # Analytics hub
│   │   └── settings.tsx          # Configuration
│   ├── components/
│   │   ├── analysis/             # Analysis visualization
│   │   ├── documents/            # Document components
│   │   ├── investigate/          # Investigation dashboard
│   │   ├── layout/               # App layout & navigation
│   │   ├── sam/                  # S.A.M. visualization
│   │   └── ui/                   # Radix-based UI primitives
│   ├── hooks/                    # TanStack Query hooks
│   ├── lib/                      # Utilities & data layer
│   ├── App.tsx                   # Main app with routing
│   ├── main.tsx                  # Vite entry point
│   └── CONTRACT.ts               # Type definitions (IPC types)
├── src-tauri/                    # Rust desktop backend
│   └── src/
│       ├── engines/              # 11 analysis engines (Rust)
│       ├── ai/                   # Claude API integration
│       ├── commands/             # Tauri IPC commands
│       ├── db/                   # SQLite database layer
│       ├── orchestrator/         # Engine job queue
│       ├── processing/           # Document processing
│       ├── sam/                  # S.A.M. methodology
│       └── storage/              # File storage
├── packages/                     # Workspace packages
│   ├── mcp-server/               # MCP Server for Claude integration
│   └── obsidian-plugin/          # Obsidian plugin for knowledge sync
├── docs/                         # Documentation
├── website/                      # Marketing site + research content
└── scripts/                      # Development utilities
```

## Analysis Engines

Implemented in Rust (`src-tauri/src/engines/`):

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
| Media Reporting   | `documentary.rs`    | News/media portrayal vs sources    |
| Narrative         | `narrative.rs`      | Claim mutation tracking            |

## Workspace Packages

### MCP Server (`packages/mcp-server/`)

Model Context Protocol server for Claude integration. Provides tools for document analysis and S.A.M. methodology.

```bash
npm run mcp:dev    # Development
npm run mcp:build  # Build
npm run mcp:start  # Start server
```

### Obsidian Plugin (`packages/obsidian-plugin/`)

Obsidian plugin for syncing analysis results and knowledge management.

```bash
npm run obsidian:dev    # Development
npm run obsidian:build  # Build
```

## Architecture

Local-first design:

- **Tauri** provides local document storage and processing via SQLite
- **Documents never leave user control** without explicit consent

## Development

```bash
# Type check
npm run type-check

# Lint
npm run lint

# Test
npm test

# Format code
npm run format

# Validate (type-check + lint + test)
npm run validate

# Rust check
cargo check --manifest-path src-tauri/Cargo.toml
```

### Docker Services

```bash
npm run docker:up       # Start services
npm run docker:down     # Stop services
npm run docker:reset-db # Reset database
```

### Vault Sync (Obsidian)

```bash
npm run vault:sync    # Bidirectional sync
npm run vault:import  # Import from vault
npm run vault:export  # Export to vault
npm run vault:status  # Check sync status
```

## License

Proprietary - Apatheia Labs
