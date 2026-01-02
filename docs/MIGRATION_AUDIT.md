# Migration Audit & Logic Porting Guide

### Status: Completed

The following API routes are considered **deleted** as of `HEAD`. Their logic has been successfully ported to Tauri commands. If these contained critical logic, you must consult your local backups or rewrite them using the new Tauri patterns.

- `src/app/api/documents/process/route.ts` -> **Rewrite as Tauri Command**
- `src/app/api/documents/upload/route.ts` -> **Rewrite as Tauri Command**
- `src/app/api/engines/...` -> **Move to Python Sidecar**

## Porting Strategy

### 1. File Uploads

**Old Way (Next.js):** `POST /api/upload` (FormData)
**New Way (Tauri):**

- Frontend: `await invoke('upload_document', { path: ... })`
- Backend (Rust): `src-tauri/src/commands/upload.rs`
- **Action**: Implement `upload_document` command in Rust.

### 2. OCR Processing

**Old Way:** `POST /api/process` -> calls Python script via `child_process`.
**New Way:**

- Frontend: `await invoke('process_document', { id: ... })`
- Backend (Rust): Manage `Sidecar` process for `tools/ocr/process_messages_ocr.py`.
- **Action**: Define `Command` wrapper in Rust to call the Python tool.

## Next Steps

1. **Commit the cleanup:** `git add . && git commit -m "chore: restructure repo and fix gitignore"`
2. **Implement IPC:** Create the Rust commands defined above.
