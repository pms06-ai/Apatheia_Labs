# Architect's Brain

*MAOF v1.0 • Apatheia Labs*

A Docker container environment for systematic repository audits supporting FCIP v6.0 development.

## Overview

Architect's Brain provides a containerized audit environment with comprehensive tooling for systematic repository analysis. Built on Ubuntu 24.04 with Node.js 20, Python 3.12, and Rust support, it enables automated testing and quality assessment of software projects.

### Key Features

- **Multi-language Support**: Node.js, Python, Rust, Bash
- **Automated Testing**: Build, lint, and security scanning
- **Knowledge Persistence**: SQLite database for audit results
- **Structured Reporting**: RAP v1.0 protocol compliance
- **Containerized**: Reproducible audit environment

---

## Prerequisites

**Required Versions:**
- Node.js: v25.2.0+
- npm: 11.6.2+
- Docker: 24.0+
- Rust: 1.75+ (for Tauri builds)

**Package Manager:** npm (standardized)

## Quick Start

```bash
# 1. Clone repository
git clone <architect-brain-repo>
cd architect-brain

# 2. Install dependencies (standardized on npm)
npm install

# 3. Build container
docker build -t architect-brain .

# 4. Run audit environment
docker run -it --rm \
  -v /path/to/repos:/workspace/repos \
  -v $(pwd)/knowledge:/workspace/knowledge \
  architect-brain

# 5. Run an audit (inside container)
audit.sh /workspace/repos/your-repo-name
```

---

## Architecture

### Container Stack

| Component | Version | Purpose |
|-----------|---------|---------|
| Ubuntu | 24.04 LTS | Base OS |
| Node.js | 20.x | JavaScript/TypeScript |
| Python | 3.12 | Python projects |
| Rust | Latest | Rust projects |
| SQLite | 3.x | Knowledge persistence |

### Audit Scripts

| Script | Purpose |
|--------|---------|
| `audit.sh` | Main audit orchestration |
| `report.sh` | Generate audit reports |
| `list-repos.sh` | Repository discovery |
| `test-exec.sh` | Executability testing |

---

## Project Structure

```
architect-brain/
├── scripts/                   # Audit scripts
│   ├── audit.sh              # Main audit orchestration
│   ├── report.sh             # Report generation
│   ├── list-repos.sh         # Repository discovery
│   └── test-exec.sh          # Executability testing
├── protocols/                # Audit protocols
│   └── RAP-v1.0.md          # Repository Audit Protocol
├── knowledge/                # SQLite knowledge base
│   └── architect.db          # Audit results database
├── audits/                   # Completed audit reports
│   └── architect-brain/      # Self-audit results
├── Dockerfile                # Container definition
├── docker-compose.yml        # Development environment
└── README.md                 # This file
```

## Script Reference

### Core Scripts

| Script | Purpose | Usage |
|--------|---------|-------|
| `audit.sh` | Complete repository audit | `./scripts/audit.sh <repo-name>` |
| `report.sh` | Generate audit reports | `./scripts/report.sh` |
| `list-repos.sh` | List available repos | `./scripts/list-repos.sh` |
| `test-exec.sh` | Test build/execution | `./scripts/test-exec.sh <repo-name>` |

### Common Workflows

**Audit a Repository:**
```bash
# Inside container
audit.sh my-project --full
report.sh
```

**Quick Health Check:**
```bash
audit.sh my-project --quick
```

**Batch Processing:**
```bash
# Audit all repos
for repo in $(list-repos.sh); do
  audit.sh "$repo" --full
done
report.sh --all
```

---

## Core Features

### 1. Automated Repository Auditing
- **Multi-language Support**: Node.js, Python, Rust, Bash projects
- **Build Testing**: Automated dependency installation and compilation
- **Quality Checks**: Linting, type checking, and security scanning
- **Structured Reporting**: RAP v1.0 protocol compliance

### 2. Knowledge Persistence
- **SQLite Database**: Persistent audit results storage
- **Repository Tracking**: Historical analysis and trend monitoring
- **Query Interface**: SQL-based audit result retrieval

### 3. Containerized Environment
- **Reproducible**: Consistent audit environment across systems
- **Isolated**: No host system contamination
- **Versioned**: Docker-based dependency management

### 4. Audit Scripts
- **audit.sh**: Main orchestration script with comprehensive checks
- **test-exec.sh**: Executability testing for multiple languages
- **report.sh**: Structured audit report generation
- **list-repos.sh**: Repository discovery and enumeration

---

## Database Schema

The audit results are stored in SQLite with the following key tables:

- `repositories` — Repository metadata and status
- `audits` — Individual audit sessions and results
- `findings` — Specific issues or observations
- `executability_tests` — Build/install/test results
- `security_scans` — Vulnerability and security findings

---

## Usage Examples

### Run Complete Audit
```bash
# Audit a Node.js repository
audit.sh /path/to/nodejs-repo

# Audit a Python repository
audit.sh /path/to/python-repo

# Generate audit report
report.sh /path/to/repo-audit-results
```

### Container Usage
```bash
# Run with volume mounts
docker run -it --rm \
  -v /host/repos:/workspace/repos \
  -v /host/results:/workspace/results \
  architect-brain

# Execute audit inside container
audit.sh /workspace/repos/target-repo
```

---

## Development

```bash
# Build container
docker build -t architect-brain .

# Run development environment
docker-compose up

# Test scripts
bash scripts/test-exec.sh test-repo

# View audit database
sqlite3 knowledge/architect.db
```

---

## Protocols

This project implements **RAP v1.0 (Repository Audit Protocol)**:

- Standardized audit methodology
- Structured finding classification
- Reproducible assessment criteria
- Knowledge persistence requirements

See `protocols/RAP-v1.0.md` for complete protocol specification.

---

## Troubleshooting

### Common Issues

**Container won't start:**
```bash
# Check Docker is running
docker info

# Check image exists
docker images architect-brain

# Rebuild if needed
docker build -t architect-brain .
```

**Scripts permission denied:**
```bash
# Inside container
chmod +x /workspace/scripts/*.sh
```

**Database issues:**
```bash
# Reset knowledge base
rm /workspace/knowledge/architect.db
sqlite3 /workspace/knowledge/architect.db < /tmp/init-db.sql
```

**Repository not found:**
```bash
# Check mounted volumes
ls /workspace/repos/
docker run -v /host/path:/workspace/repos architect-brain
```

### Support

For issues with architect-brain:
1. Check the audit logs in `/workspace/audits/`
2. Review the RAP protocol at `protocols/RAP-v1.0.md`
3. Check container logs: `docker logs <container-id>`

---

## License

Proprietary — Apatheia Labs
