# Apatheia Architecture

## Overview

Apatheia is a high-performance forensic analysis platform built on a hybrid architecture. It combines the safety and performance of **Rust (Tauri)** for system operations, the modernity of **Next.js** for the UI, and the specialized ecosystem of **Python** for machine learning and data processing.

## Components

### 1. The Core: Tauri (Rust)

- **Role:** System Orchestrator, Storage Manager, Security Boundary.
- **Responsibility:**
  - Manages the application lifecycle.
  - Handles file system I/O (securely).
  - Spawns and manages "Sidecar" processes (Python).
  - Exposes "Commands" to the frontend via IPC.

### 2. The Frontend: Next.js (SSG/SPA)

- **Role:** User Interface, State Management.
- **Responsibility:**
  - Renders the "Forensic Metallics" UI.
  - Calls Tauri Commands using `@tauri-apps/api`.
  - **NO API Routes:** The `pages/api` or `app/api` routes are deprecated. The frontend logic must be client-side only, communicating directly with Rust.

### 3. The Intelligence: Python Sidecar

- **Role:** Heavy Lifting, ML, OCR, unstructured data processing.
- **Responsibility:**
  - Runs as a standalone binary/script managed by Tauri.
  - Accepts jobs via Stdin/Stdout or a local socket.
  - Performs OCR (Gemini/Tesseract), NLP, and Entity Extraction.

## core Data FLow

1. **User** uploads a PDF in the UI.
2. **UI** invokes `process_document` (Rust Command).
3. **Rust** saves the file to the Vault.
4. **Rust** spawns/notifies the **Python Worker**.
5. **Python** processes the file and updates the `findings.json`.
6. **Rust** emits an event `analysis-complete` to the UI.
7. **UI** updates the view.

## Directory Structure

- `src-tauri/` -> Rust Core
- `src/` -> Next.js Frontend
- `tools/` -> Python Scripts & Utilities (The Brain)
