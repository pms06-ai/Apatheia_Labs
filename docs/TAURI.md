# Phronesis FCIP - Tauri Desktop App

Local-first forensic case intelligence platform built with Tauri.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    React Frontend                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────────────┐  │
│  │Components│  │ Zustand  │  │    React Query       │  │
│  └────┬─────┘  └────┬─────┘  └──────────┬───────────┘  │
│       │             │                    │              │
│       └─────────────┴────────────────────┘              │
│                         │                               │
│              ┌──────────▼───────────┐                   │
│              │  src/lib/tauri/      │                   │
│              │  (IPC Client)        │                   │
│              └──────────┬───────────┘                   │
└─────────────────────────┼───────────────────────────────┘
                          │ Tauri IPC
┌─────────────────────────┼───────────────────────────────┐
│                         ▼                               │
│  ┌──────────────────────────────────────────────────┐  │
│  │              Rust Backend (src-tauri/)            │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  │  │
│  │  │  Commands  │  │  Database  │  │  Storage   │  │  │
│  │  │  (IPC)     │  │  (SQLite)  │  │  (Files)   │  │  │
│  │  └────────────┘  └────────────┘  └────────────┘  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│                    Tauri Application                    │
└─────────────────────────────────────────────────────────┘
```

## Prerequisites

1. **Node.js** 18+ (for frontend)
2. **Rust** 1.77+ (for Tauri backend)
   - Install: https://rustup.rs/
3. **Tauri Prerequisites** (per platform):
   - **Windows**: Microsoft Visual Studio C++ Build Tools
   - **macOS**: Xcode Command Line Tools
   - **Linux**: Build essentials, webkit2gtk, etc.

## Installation

```bash
# Install dependencies
npm install

# Install Rust (if not installed)
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

## Development

```bash
# Run in development mode (hot reload)
npm run tauri:dev
```

## Build

```bash
# Build for production
npm run tauri:build
```

Built applications will be in `src-tauri/target/release/bundle/`.

## Project Structure

```
apatheia-scaffold/
├── src/                        # React frontend
│   ├── lib/tauri/              # Tauri IPC client
│   │   ├── client.ts           # TauriClient class
│   │   ├── commands.ts         # Command wrappers
│   │   └── index.ts            # Exports
│   └── ...
├── src-tauri/                  # Rust backend
│   ├── src/
│   │   ├── commands/           # IPC command handlers
│   │   │   ├── mod.rs
│   │   │   ├── cases.rs
│   │   │   ├── documents.rs
│   │   │   └── analysis.rs
│   │   ├── db/                 # SQLite database
│   │   │   ├── mod.rs
│   │   │   └── schema.rs
│   │   ├── storage/            # File storage
│   │   │   └── mod.rs
│   │   ├── lib.rs              # Library entry
│   │   └── main.rs             # App entry
│   ├── Cargo.toml              # Rust dependencies
│   └── tauri.conf.json         # Tauri config
├── out/                        # Static build output
├── next.config.js              # Next.js (static export)
└── package.json
```

## IPC Commands

| Command | Description |
|---------|-------------|
| `get_cases` | List all cases |
| `get_case` | Get single case |
| `create_case` | Create new case |
| `delete_case` | Delete case |
| `get_documents` | List documents for case |
| `get_document` | Get single document |
| `upload_document` | Upload and store document |
| `update_document_status` | Update processing status |
| `delete_document` | Delete document |
| `get_findings` | List findings for case |
| `get_analysis` | Get full analysis results |
| `run_engine` | Execute analysis engine |
| `save_finding` | Save a finding |

## Frontend Usage

```typescript
import { isDesktop, getCases, uploadDocument } from '@/lib/tauri'

// Check if running in Tauri
if (isDesktop()) {
  // Use Tauri IPC
  const cases = await getCases()
} else {
  // Web mode - use Supabase
}
```

## Data Storage

All data is stored locally:

- **Database**: `%APPDATA%/com.apatheia.phronesis/phronesis.db` (SQLite)
- **Documents**: `%APPDATA%/com.apatheia.phronesis/storage/documents/`

## Schema

The SQLite schema matches `src/CONTRACT.ts` types:

- `cases` - Case management
- `documents` - Document metadata
- `document_chunks` - Text chunks for search
- `entities` - People and organizations
- `claims` - Extracted claims
- `findings` - Analysis results
- `contradictions` - Detected contradictions
- `omissions` - Detected omissions
- `timeline_events` - Temporal events

## Environment Detection

The frontend automatically detects whether it's running in Tauri or web mode:

```typescript
import { isDesktop, isWeb } from '@/lib/tauri'

isDesktop() // true in Tauri app
isWeb()     // true in browser
```

