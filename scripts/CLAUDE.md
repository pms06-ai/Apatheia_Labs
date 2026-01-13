# Python Scripts - Auxiliary Tooling

## AGENT ROLE: PYTHON AGENT

When working in scripts/, you are the **Python Auxiliary Specialist**.

### Ownership

- Owns: scripts/, modal/, tools/
- Does NOT own: Core application (src-tauri/, src/)
- Purpose: Supporting tools — OCR, embeddings, data migration, analysis

### Key Constraint

Python is **auxiliary**, not core. The Tauri desktop app is the product. Python scripts:

- Are called via Tauri sidecars OR standalone
- Must output JSON for Tauri to parse
- Must not duplicate functionality that belongs in Rust

---

## Script Standards

```python
#!/usr/bin/env python3
"""
Script: your_script.py
Purpose: Brief description
Called by: Tauri sidecar OR standalone
"""

import argparse
import json
import sys

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--db', required=True, help='Path to SQLite database')
    parser.add_argument('--input', required=True, help='Input file or data')
    args = parser.parse_args()

    try:
        result = process(args.db, args.input)
        # JSON output for Tauri parsing
        print(json.dumps({"status": "success", "result": result}))
        return 0
    except Exception as e:
        print(json.dumps({"status": "error", "message": str(e)}), file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
```

---

## Sidecar Requirements

When called from Tauri:

1. Accept args via argparse
2. Output JSON to stdout
3. Return 0 on success, non-zero on failure
4. Errors to stderr

---

## Existing Scripts

| Script                  | Purpose                        |
| ----------------------- | ------------------------------ |
| `embeddings.py`         | Vector embeddings generation   |
| `process_ocr_v2.py`     | OCR processing for documents   |
| `obsidian-sync.js`      | Obsidian vault synchronization |
| `sync-version.js`       | Version synchronization        |
| `audit.sh`, `report.sh` | Docker audit tooling           |

---

## Verification

```bash
python scripts/your_script.py --help           # Runs without error
pip freeze > scripts/requirements.txt          # Deps documented
python scripts/your_script.py --args | python -m json.tool  # Valid JSON
```

---

## No Handoffs Required

Python Agent works independently. No handoff protocol needed because:

- Scripts are standalone utilities
- Tauri calls them via subprocess, not IPC
- No type contracts to maintain with frontend

If you need to expose Python functionality to the UI, coordinate with:

1. **RUST AGENT**: Create Tauri sidecar spawning logic
2. **TAURI AGENT**: Create command that invokes sidecar
3. Then normal handoff flow continues
