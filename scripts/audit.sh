#!/bin/bash
# Apatheia Labs - Architect Agent
# Repository Audit Script v1.0

set -e

# Colors for output
BRONZE='\033[0;33m'
GRAY='\033[0;90m'
WHITE='\033[1;37m'
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

# Environment
REPOS_DIR="${REPOS_DIR:-/workspace/repos}"
AUDITS_DIR="${AUDITS_DIR:-/workspace/audits}"
KNOWLEDGE_DB="${KNOWLEDGE_DB:-/workspace/knowledge/architect.db}"

# Functions
print_header() {
    echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${WHITE}  APATHEIA LABS │ Architect Agent │ Repository Audit${NC}"
    echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

print_section() {
    echo -e "\n${BRONZE}▸ $1${NC}"
}

print_subsection() {
    echo -e "  ${GRAY}$1${NC}"
}

print_success() {
    echo -e "  ${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "  ${RED}✗${NC} $1"
}

print_info() {
    echo -e "  ${WHITE}→${NC} $1"
}

usage() {
    echo "Usage: audit.sh <repo-name> [options]"
    echo ""
    echo "Options:"
    echo "  --full          Complete audit (all tiers)"
    echo "  --quick         Tier 1 only (identity, executability, stack)"
    echo "  --exec-only     Test executability only"
    echo "  --report        Generate report without re-auditing"
    echo "  --help          Show this help"
    echo ""
    echo "Example:"
    echo "  audit.sh phronesis-lex --full"
    exit 1
}

# Check arguments
if [ $# -lt 1 ]; then
    usage
fi

REPO_NAME="$1"
REPO_PATH="${REPOS_DIR}/${REPO_NAME}"
AUDIT_MODE="${2:---full}"
AUDIT_DATE=$(date +%Y-%m-%d)
AUDIT_DIR="${AUDITS_DIR}/${REPO_NAME}"
REPORT_FILE="${AUDIT_DIR}/audit-${AUDIT_DATE}.md"

# Validate repo exists
if [ ! -d "$REPO_PATH" ]; then
    echo -e "${RED}Error: Repository not found at ${REPO_PATH}${NC}"
    echo "Available repositories:"
    ls -1 "$REPOS_DIR" 2>/dev/null || echo "  (none found)"
    exit 1
fi

# Create audit directory
mkdir -p "$AUDIT_DIR"

print_header
echo -e "${GRAY}Repository: ${WHITE}${REPO_NAME}${NC}"
echo -e "${GRAY}Path: ${WHITE}${REPO_PATH}${NC}"
echo -e "${GRAY}Date: ${WHITE}${AUDIT_DATE}${NC}"
echo -e "${GRAY}Mode: ${WHITE}${AUDIT_MODE}${NC}"

# ============================================================================
# TIER 1: Identity & Purpose
# ============================================================================
print_section "TIER 1.1: Identity & Purpose"

# Check for README
if [ -f "${REPO_PATH}/README.md" ]; then
    print_success "README.md found"
    STATED_PURPOSE=$(head -20 "${REPO_PATH}/README.md" | grep -v "^#" | grep -v "^$" | head -3)
    print_info "Stated purpose: ${STATED_PURPOSE:0:100}..."
else
    print_error "No README.md found"
fi

# Git history
if [ -d "${REPO_PATH}/.git" ]; then
    CREATION_DATE=$(git -C "$REPO_PATH" log --reverse --format="%ai" | head -1 | cut -d' ' -f1)
    LAST_COMMIT=$(git -C "$REPO_PATH" log -1 --format="%ai" | cut -d' ' -f1)
    COMMIT_COUNT=$(git -C "$REPO_PATH" rev-list --count HEAD 2>/dev/null || echo "0")
    print_success "Git repository"
    print_info "Created: ${CREATION_DATE}"
    print_info "Last commit: ${LAST_COMMIT}"
    print_info "Total commits: ${COMMIT_COUNT}"
else
    print_error "Not a git repository"
fi

# ============================================================================
# TIER 1: Technical Stack Detection
# ============================================================================
print_section "TIER 1.3: Technical Stack"

# Language detection
print_subsection "Languages:"
if command -v tokei &> /dev/null; then
    tokei "$REPO_PATH" --compact 2>/dev/null | head -20
else
    # Fallback: simple file counting
    echo "  TypeScript: $(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -name "*.ts" -o -name "*.tsx" 2>/dev/null | wc -l) files"
    echo "  JavaScript: $(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -name "*.js" -o -name "*.jsx" 2>/dev/null | wc -l) files"
    echo "  Python: $(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -name "*.py" 2>/dev/null | wc -l) files"
    echo "  Rust: $(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -name "*.rs" 2>/dev/null | wc -l) files"
fi

# Package managers & frameworks
print_subsection "Package Managers & Frameworks:"

if [ -f "${REPO_PATH}/package.json" ]; then
    print_success "Node.js project (package.json)"
    # Check for specific frameworks
    if grep -q "react" "${REPO_PATH}/package.json" 2>/dev/null; then
        print_info "Framework: React"
    fi
    if grep -q "next" "${REPO_PATH}/package.json" 2>/dev/null; then
        print_info "Framework: Next.js"
    fi
    if grep -q "vite" "${REPO_PATH}/package.json" 2>/dev/null; then
        print_info "Build tool: Vite"
    fi
fi

if [ -f "${REPO_PATH}/Cargo.toml" ]; then
    print_success "Rust project (Cargo.toml)"
    if grep -q "tauri" "${REPO_PATH}/Cargo.toml" 2>/dev/null; then
        print_info "Framework: Tauri"
    fi
fi

if [ -f "${REPO_PATH}/requirements.txt" ] || [ -f "${REPO_PATH}/pyproject.toml" ]; then
    print_success "Python project"
    if [ -f "${REPO_PATH}/requirements.txt" ]; then
        if grep -q "django" "${REPO_PATH}/requirements.txt" 2>/dev/null; then
            print_info "Framework: Django"
        fi
        if grep -q "fastapi" "${REPO_PATH}/requirements.txt" 2>/dev/null; then
            print_info "Framework: FastAPI"
        fi
    fi
fi

# ============================================================================
# TIER 1: Architecture & Structure
# ============================================================================
print_section "TIER 1.4: Architecture & Structure"

print_subsection "Directory Structure (depth 2):"
tree -L 2 -d "$REPO_PATH" 2>/dev/null | head -30 || find "$REPO_PATH" -maxdepth 2 -type d | head -30

# Identify entry points
print_subsection "Entry Points:"
for entry in "src/main" "src/index" "src/app" "main" "index" "app"; do
    for ext in ".ts" ".tsx" ".js" ".jsx" ".py" ".rs"; do
        if [ -f "${REPO_PATH}/${entry}${ext}" ]; then
            print_info "Found: ${entry}${ext}"
        fi
    done
done

# ============================================================================
# TIER 1: Executability Test
# ============================================================================
print_section "TIER 1.2: Executability State"

EXEC_RESULT="unknown"

# Node.js project
if [ -f "${REPO_PATH}/package.json" ]; then
    print_subsection "Testing Node.js build..."

    # Check for lock file
    if [ -f "${REPO_PATH}/package-lock.json" ]; then
        print_info "Lock file: package-lock.json (npm)"
    elif [ -f "${REPO_PATH}/pnpm-lock.yaml" ]; then
        print_info "Lock file: pnpm-lock.yaml (pnpm)"
    elif [ -f "${REPO_PATH}/yarn.lock" ]; then
        print_info "Lock file: yarn.lock (yarn)"
    else
        print_error "No lock file found"
    fi

    # Check for common scripts
    if grep -q '"scripts"' "${REPO_PATH}/package.json" 2>/dev/null; then
        print_info "Scripts defined in package.json"
        # Check for key scripts
        if grep -q '"build"' "${REPO_PATH}/package.json" 2>/dev/null; then
            print_info "Build script available"
        fi
        if grep -q '"test"' "${REPO_PATH}/package.json" 2>/dev/null; then
            print_info "Test script available"
        fi
        if grep -q '"lint"' "${REPO_PATH}/package.json" 2>/dev/null; then
            print_info "Lint script available"
        fi
    fi

    # Check for TypeScript config
    if [ -f "${REPO_PATH}/tsconfig.json" ]; then
        print_success "TypeScript configuration found"
    fi

    print_info "Run 'npm install && npm run build' to verify"
fi

# Rust project
if [ -f "${REPO_PATH}/Cargo.toml" ]; then
    print_subsection "Testing Rust build..."

    if [ -f "${REPO_PATH}/Cargo.lock" ]; then
        print_success "Cargo.lock present"
    else
        print_error "No Cargo.lock (dependencies not locked)"
    fi

    # Check for Rust version requirement
    if grep -q "rust-version" "${REPO_PATH}/Cargo.toml" 2>/dev/null; then
        RUST_VERSION=$(grep "rust-version" "${REPO_PATH}/Cargo.toml" | sed 's/.*= "\(.*\)"/\1/')
        print_info "Requires Rust: ${RUST_VERSION}"
    fi

    print_info "Run 'cargo check' to verify compilation"
fi

# Python project
if [ -f "${REPO_PATH}/requirements.txt" ] || [ -f "${REPO_PATH}/pyproject.toml" ]; then
    print_subsection "Testing Python environment..."

    if [ -f "${REPO_PATH}/requirements.txt" ]; then
        print_info "Requirements file found"
        DEP_COUNT=$(wc -l < "${REPO_PATH}/requirements.txt" 2>/dev/null || echo "0")
        print_info "${DEP_COUNT} dependencies listed"
    fi

    if [ -f "${REPO_PATH}/pyproject.toml" ]; then
        print_success "Modern Python packaging (pyproject.toml)"
    fi

    print_info "Run 'pip install -r requirements.txt' to verify"
fi

# ============================================================================
# TIER 1: Security & Dependencies
# ============================================================================
print_section "TIER 1.7: Security & Dependencies"

print_subsection "Security Scanning:"

# Check for security-related files
if [ -f "${REPO_PATH}/.env" ] || [ -f "${REPO_PATH}/.env.local" ]; then
    print_error "Environment files found (should not be committed)"
fi

if [ -f "${REPO_PATH}/.gitignore" ]; then
    if grep -q ".env" "${REPO_PATH}/.gitignore" 2>/dev/null; then
        print_success ".env excluded from git"
    else
        print_error ".env not excluded from git"
    fi
fi

# Node.js security
if [ -f "${REPO_PATH}/package.json" ]; then
    # Check for known vulnerable packages in package.json
    if command -v npm &> /dev/null; then
        print_info "Run 'npm audit' for vulnerability check"
    fi
fi

# Rust security
if [ -f "${REPO_PATH}/Cargo.toml" ]; then
    if command -v cargo-audit &> /dev/null; then
        print_info "Run 'cargo audit' for security advisories"
    fi
fi

# Python security
if [ -f "${REPO_PATH}/requirements.txt" ]; then
    if command -v safety &> /dev/null; then
        print_info "Run 'safety check --file requirements.txt' for known vulnerabilities"
    fi
fi

# ============================================================================
# TIER 1: Contract Drift Analysis
# ============================================================================
print_section "TIER 1.6: Contract Drift Analysis"

print_subsection "Searching for type definitions..."

# TypeScript interfaces
TS_TYPES=$(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -name "*.ts" -exec grep -l "^export interface\|^export type" {} \; 2>/dev/null | wc -l)
if [ "$TS_TYPES" -gt 0 ]; then
    print_info "TypeScript type files: ${TS_TYPES}"
    # Look for CONTRACT.ts specifically
    if [ -f "${REPO_PATH}/CONTRACT.ts" ] || [ -f "${REPO_PATH}/src/CONTRACT.ts" ]; then
        print_success "CONTRACT.ts found (single source of truth)"
    else
        print_error "No CONTRACT.ts found"
    fi
fi

# Rust structs
RS_STRUCTS=$(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -name "*.rs" -exec grep -l "^pub struct" {} \; 2>/dev/null | wc -l)
if [ "$RS_STRUCTS" -gt 0 ]; then
    print_info "Rust struct files: ${RS_STRUCTS}"
fi

# Python dataclasses
PY_DATACLASS=$(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -name "*.py" -exec grep -l "@dataclass" {} \; 2>/dev/null | wc -l)
if [ "$PY_DATACLASS" -gt 0 ]; then
    print_info "Python dataclass files: ${PY_DATACLASS}"
fi

# ============================================================================
# Summary
# ============================================================================
print_section "Audit Summary"

echo -e "${GRAY}Audit data saved to: ${WHITE}${AUDIT_DIR}${NC}"
echo ""
echo -e "${BRONZE}Next Steps:${NC}"
echo "  1. Review findings above"
echo "  2. Test executability manually if needed"
echo "  3. Complete Tier 2/3 evaluations as appropriate"
echo "  4. Generate final report with: report.sh ${REPO_NAME}"
echo ""
echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

