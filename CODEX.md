# Codex Agent Instructions

> Quick-reference for OpenAI Codex working on apatheia-scaffold

## TL;DR

You're working on a **Tauri + Next.js** forensic intelligence app. The human (Paul) is terse, adversarial, and wants minimal hand-holding. Claude Code handles AI analysis; you handle code generation and refactoring.

**Read COLLABORATION.md for full context.**

---

## Critical Files

```
src/CONTRACT.ts              ← Type definitions (SSOT, don't duplicate)
src-tauri/src/db/schema.rs   ← Must match CONTRACT.ts
src-tauri/src/commands/      ← Tauri command handlers
scripts/                     ← Node.js utility scripts
```

## Architecture

```
Next.js 14 (frontend)
    ↓ IPC
Tauri (Rust backend)
    ↓ sqlx
SQLite (local DB)
    ↓ spawns
Node.js sidecars (engine execution)
```

## Commands You'll Use

```bash
npm run dev          # Next.js dev
npm run tauri dev    # Full Tauri dev
npm run tauri build  # Production build
```

## Style Guide

- TypeScript strict mode
- Rust: follow existing patterns in src-tauri/
- No blue in UI
- Minimal dependencies
- No over-engineering

## What Claude Code Does

- Runs AI analysis engines
- Generates findings from document corpus
- Makes architecture decisions
- Handles CASCADE contradiction detection

## What You Do

- Implement features from specs
- Refactor and optimize code
- Write tests
- Keep types in sync

## Handoff Checklist

When finishing a session:
1. Update `COLLABORATION.md` section 13
2. Commit with descriptive message
3. List what's done and what's next
4. Note any blockers

## Quick Links

| What | Where |
|------|-------|
| Full context | COLLABORATION.md |
| Types | src/CONTRACT.ts |
| DB Schema | src-tauri/src/db/schema.rs |
| Scripts | scripts/ |
| Vault | C:\Users\pstep\OneDrive\Documents\Obsidian Vault |

---

*Don't ask permission. Infer intent. Ship code.*
