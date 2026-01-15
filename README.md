# Apatheia Labs - Phronesis Platform

> "Clarity Without Distortion"
>
> Forensic intelligence platform for institutional accountability analysis. Desktop application built with Vite, React Router, and Tauri.
>
> ## Overview
>
> Phronesis (FCIP v6.0) employs the **Systematic Adversarial Methodology (S.A.M.)** for reading institutional documents "against the grain" - tracing how false premises propagate through agencies, accumulate authority through repetition, and cause harmful outcomes.
>
> ## Stack
>
> | Layer | Technology |
> |-------|------------|
> | Frontend | Vite 6, React 18, React Router 7, Tailwind CSS, Radix UI |
> | Desktop | Tauri 2 (Rust backend) |
> | State | Zustand, TanStack React Query |
> | AI | Anthropic Claude API, Google Generative AI, Groq SDK |
> | Database | SQLite (local), Supabase (optional cloud sync) |
> | Testing | Jest, Testing Library |
>
> ## S.A.M. Methodology
>
> Four-phase cascade analysis:
>
> - **ANCHOR** - Identify false premise origin points
> - - **INHERIT** - Track institutional propagation without verification
>   - - **COMPOUND** - Document authority accumulation through repetition
>     - - **ARRIVE** - Map catastrophic outcomes
>      
>       - ### Eight Contradiction Types
>      
>       - | Code | Type |
>       - |------|------|
>       - | SELF | Internal contradiction |
> | INTER_DOC | Cross-document conflict |
> | TEMPORAL | Timeline mismatch |
> | EVIDENTIARY | Claim vs evidence gap |
> | MODALITY_SHIFT | Certainty/tone change |
> | SELECTIVE_CITATION | Cherry-picking |
> | SCOPE_SHIFT | Unexplained scope change |
> | UNEXPLAINED_CHANGE | Position flip |
>
> ## Quick Start
>
> ```bash
> # Install dependencies
> npm install
>
> # Start development server (Vite)
> npm run dev
>
> # Start Tauri desktop app in dev mode
> npm run tauri:dev
>
> # Build for production
> npm run build
>
> # Build Tauri desktop app
> npm run tauri:build
> ```
>
> ## Project Structure
>
> ```
> apatheia-scaffold/
> ├── src/                          # Frontend source
> │   ├── pages/                    # React Router pages
> │   │   ├── analysis.tsx          # Analysis dashboard
> │   │   ├── complaints.tsx        # Complaint management
> │   │   ├── documents.tsx         # Document management
> │   │   ├── sam.tsx               # S.A.M. analysis pipeline
> │   │   └── settings.tsx          # Configuration
> │   ├── components/
> │   │   ├── analysis/             # Analysis visualization
> │   │   ├── cases/                # Case management
> │   │   ├── dashboard/            # Dashboard widgets
> │   │   ├── documents/            # Document components
> │   │   ├── layout/               # App layout & navigation
> │   │   ├── sam/                  # S.A.M. visualization
> │   │   ├── search/               # Search functionality
> │   │   └── ui/                   # Radix-based UI primitives
> │   ├── hooks/                    # React hooks
> │   ├── lib/                      # Utilities & data layer
> │   ├── App.tsx                   # Main app with routing
> │   ├── main.tsx                  # Vite entry point
> │   └── CONTRACT.ts               # Type definitions
> ├── src-tauri/                    # Rust desktop backend
> │   └── src/
> │       ├── engines/              # Analysis engines (Rust)
> │       │   ├── accountability.rs # Statutory duty violations
> │       │   ├── argumentation.rs  # Toulmin structure building
> │       │   ├── bias.rs           # Statistical imbalance
> │       │   ├── contradiction.rs  # Cross-document inconsistencies
> │       │   ├── documentary.rs    # Broadcast vs source comparison
> │       │   ├── entity.rs         # Canonical identity mapping
> │       │   ├── expert.rs         # FJC compliance analysis
> │       │   ├── narrative.rs      # Claim mutation tracking
> │       │   ├── omission.rs       # Source-to-report gaps
> │       │   ├── professional.rs   # Per-professional patterns
> │       │   └── temporal.rs       # Timeline construction
> │       ├── ai/                   # AI integration
> │       ├── commands/             # Tauri commands
> │       ├── complaint/            # Complaint processing
> │       ├── db/                   # SQLite database layer
> │       ├── orchestrator/         # Engine orchestration
> │       ├── processing/           # Document processing
> │       ├── sam/                  # S.A.M. methodology
> │       └── storage/              # File storage
> ├── packages/                     # Workspace packages
> │   ├── mcp-server/               # MCP Server for Claude integration
> │   └── obsidian-plugin/          # Obsidian plugin for knowledge sync
> ├── docs/                         # Documentation
> ├── docker/                       # Docker configurations
> ├── scripts/                      # Development utilities
> └── tools/                        # CLI tools
> ```
>
> ## Analysis Engines (FCIP v6.0)
>
> Implemented in Rust (`src-tauri/src/engines/`):
>
> | Engine | File | Function |
> |--------|------|----------|
> | Entity Resolution | `entity.rs` | Canonical identity mapping |
> | Temporal Parser | `temporal.rs` | Timeline construction |
> | Argumentation | `argumentation.rs` | Toulmin structure building |
> | Bias Detection | `bias.rs` | Statistical imbalance analysis |
> | Contradiction | `contradiction.rs` | Cross-document inconsistencies |
> | Accountability | `accountability.rs` | Statutory duty violations |
> | Professional | `professional.rs` | Per-professional behavior patterns |
> | Omission | `omission.rs` | Source-to-report gap analysis |
> | Expert Witness | `expert.rs` | FJC compliance, scope analysis |
> | Documentary | `documentary.rs` | Broadcast vs source comparison |
> | Narrative | `narrative.rs` | Claim mutation tracking |
>
> ## Workspace Packages
>
> ### MCP Server (`packages/mcp-server/`)
>
> Model Context Protocol server for Claude integration. Provides tools for document analysis and S.A.M. methodology.
>
> ```bash
> npm run mcp:dev    # Development
> npm run mcp:build  # Build
> npm run mcp:start  # Start server
> ```
>
> ### Obsidian Plugin (`packages/obsidian-plugin/`)
>
> Obsidian plugin for syncing analysis results and knowledge management.
>
> ```bash
> npm run obsidian:dev    # Development
> npm run obsidian:build  # Build
> ```
>
> ## Architecture
>
> Local-first with optional cloud sync:
>
> - **Tauri** provides local document storage and processing via SQLite
> - - **Supabase** enables cross-device sync when connected (optional)
>   - - **Documents never leave user control** without explicit consent
>    
>     - ## Development
>    
>     - ```bash
>       # Type check
>       npm run type-check
>
>       # Lint
>       npm run lint
>
>       # Test
>       npm test
>
>       # Format code
>       npm run format
>
>       # Validate (type-check + lint + test)
>       npm run validate
>
>       # Rust check
>       cargo check --manifest-path src-tauri/Cargo.toml
>       ```
>
> ### Docker Services
>
> ```bash
> npm run docker:up       # Start services
> npm run docker:down     # Stop services
> npm run docker:reset-db # Reset database
> ```
>
> ### Vault Sync (Obsidian)
>
> ```bash
> npm run vault:sync    # Bidirectional sync
> npm run vault:import  # Import from vault
> npm run vault:export  # Export to vault
> npm run vault:status  # Check sync status
> ```
>
> ## License
>
> Proprietary - Apatheia Labs
