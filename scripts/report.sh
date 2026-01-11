#!/bin/bash
# Apatheia Labs - Architect Agent
# Report Generation Script v1.0

# Don't exit on error - handle gracefully
set +e

BRONZE='\033[0;33m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'

REPOS_DIR="${REPOS_DIR:-/workspace/repos}"
AUDITS_DIR="${AUDITS_DIR:-/workspace/audits}"
KNOWLEDGE_DB="${KNOWLEDGE_DB:-/workspace/knowledge/architect.db}"

if [ $# -lt 1 ]; then
    echo "Usage: report.sh <repo-name> [--markdown|--json|--summary|--cross-repo]"
    echo ""
    echo "Options:"
    echo "  --markdown    Full markdown report (default)"
    echo "  --json        JSON format for processing"
    echo "  --summary     One-page executive summary"
    echo "  --cross-repo  Cross-repository analysis report"
    echo "  --all         Generate report for all audited repos"
    exit 1
fi

REPO_NAME="$1"
FORMAT="${2:---markdown}"
AUDIT_DATE=$(date +%Y-%m-%d)
REPO_PATH="${REPOS_DIR}/${REPO_NAME}"
AUDIT_DIR="${AUDITS_DIR}/${REPO_NAME}"
REPORT_FILE="${AUDIT_DIR}/audit-report-${AUDIT_DATE}.md"

# Ensure audit directory exists
mkdir -p "$AUDIT_DIR"

# ============================================================================
# Gather Data
# ============================================================================

gather_repo_data() {
    local repo_path="$1"
    
    # Basic info
    if [ -d "${repo_path}/.git" ]; then
        CREATION_DATE=$(git -C "$repo_path" log --reverse --format="%ai" 2>/dev/null | head -1 | cut -d' ' -f1)
        LAST_COMMIT=$(git -C "$repo_path" log -1 --format="%ai" 2>/dev/null | cut -d' ' -f1)
        LAST_COMMIT_MSG=$(git -C "$repo_path" log -1 --format="%s" 2>/dev/null)
        COMMIT_COUNT=$(git -C "$repo_path" rev-list --count HEAD 2>/dev/null || echo "0")
        BRANCH_COUNT=$(git -C "$repo_path" branch -a 2>/dev/null | wc -l)
    fi
    
    # README extract
    if [ -f "${repo_path}/README.md" ]; then
        README_EXCERPT=$(head -30 "${repo_path}/README.md" | grep -v "^#" | grep -v "^$" | head -5)
    else
        README_EXCERPT="No README found"
    fi
    
    # Tech stack detection
    HAS_NODE=$( [ -f "${repo_path}/package.json" ] && echo "yes" || echo "no" )
    HAS_RUST=$( [ -f "${repo_path}/Cargo.toml" ] && echo "yes" || echo "no" )
    HAS_PYTHON=$( [ -f "${repo_path}/requirements.txt" ] || [ -f "${repo_path}/pyproject.toml" ] && echo "yes" || echo "no" )
    
    # Framework detection
    FRAMEWORKS=""
    if [ "$HAS_NODE" = "yes" ]; then
        [ -n "$(grep -l 'react' "${repo_path}/package.json" 2>/dev/null)" ] && FRAMEWORKS="${FRAMEWORKS}React, "
        [ -n "$(grep -l 'tauri' "${repo_path}/package.json" 2>/dev/null)" ] && FRAMEWORKS="${FRAMEWORKS}Tauri, "
        [ -n "$(grep -l 'vite' "${repo_path}/package.json" 2>/dev/null)" ] && FRAMEWORKS="${FRAMEWORKS}Vite, "
    fi
    if [ "$HAS_RUST" = "yes" ]; then
        [ -n "$(grep -l 'tauri' "${repo_path}/Cargo.toml" 2>/dev/null)" ] && FRAMEWORKS="${FRAMEWORKS}Tauri, "
        [ -n "$(grep -l 'tokio' "${repo_path}/Cargo.toml" 2>/dev/null)" ] && FRAMEWORKS="${FRAMEWORKS}Tokio, "
    fi
    if [ "$HAS_PYTHON" = "yes" ]; then
        [ -n "$(grep -l 'django' "${repo_path}/requirements.txt" 2>/dev/null)" ] && FRAMEWORKS="${FRAMEWORKS}Django, "
        [ -n "$(grep -l 'fastapi' "${repo_path}/requirements.txt" 2>/dev/null)" ] && FRAMEWORKS="${FRAMEWORKS}FastAPI, "
    fi
    FRAMEWORKS="${FRAMEWORKS%, }"  # Remove trailing comma
    
    # Line counts
    if command -v tokei &> /dev/null; then
        LINES_OF_CODE=$(tokei "$repo_path" --exclude node_modules --exclude .next --output json 2>/dev/null | jq '.Total.code // 0')
    else
        LINES_OF_CODE=$(find "$repo_path" -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.py" -o -name "*.rs" 2>/dev/null | xargs wc -l 2>/dev/null | tail -1 | awk '{print $1}')
    fi
    
    # Contract detection
    HAS_CONTRACT=$( find "$repo_path" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" \( -name "CONTRACT.ts" -o -name "contracts.ts" -o -name "types.ts" \) 2>/dev/null | head -1 )
    
    # Technical debt indicators
    TODO_COUNT=$(grep -r "TODO\|FIXME\|HACK\|XXX" "$repo_path" --exclude-dir={node_modules,.git,.next} --include="*.ts" --include="*.tsx" --include="*.rs" --include="*.py" --include="*.js" --include="*.jsx" 2>/dev/null | wc -l)
    FIXME_COUNT=$(grep -r "FIXME" "$repo_path" --exclude-dir={node_modules,.git,.next} --include="*.ts" --include="*.tsx" --include="*.rs" --include="*.py" --include="*.js" --include="*.jsx" 2>/dev/null | wc -l)

    # Security indicators
    ENV_FILES=$(find "$repo_path" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" -name ".env*" 2>/dev/null | wc -l)
    GITIGNORE_EXISTS=$( [ -f "${repo_path}/.gitignore" ] && echo "yes" || echo "no" )

    # Test coverage indicators
    # Test coverage indicators
    TEST_FILES=$(find "$repo_path" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" \( -name "*test*" -o -name "*spec*" \) -type f 2>/dev/null | wc -l)
    HAS_TEST_DIR=$( [ -d "${repo_path}/tests" ] || [ -d "${repo_path}/test" ] || [ -d "${repo_path}/__tests__" ] && echo "yes" || echo "no" )

    # Documentation indicators
    # Documentation indicators
    DOC_FILES=$(find "$repo_path" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" \( -name "*.md" -o -name "*.rst" -o -name "docs" \) 2>/dev/null | wc -l)
    HAS_CHANGELOG=$( [ -f "${repo_path}/CHANGELOG.md" ] || [ -f "${repo_path}/changelog.md" ] && echo "yes" || echo "no" )
}

# ============================================================================
# Generate Markdown Report
# ============================================================================

generate_markdown_report() {
    cat > "$REPORT_FILE" << EOF
# Repository Audit: ${REPO_NAME}

**Audit Date:** ${AUDIT_DATE}  
**Auditor:** Architect Agent (MAOF v1.0)  
**Protocol:** RAP v1.0  

---

## Executive Summary

| Field | Value |
|-------|-------|
| **Repository** | ${REPO_NAME} |
| **Verdict** | ⚠️ *Requires manual verification* |
| **FCIP Relevance** | *To be determined* |
| **Recommended Action** | *To be determined* |

**In one sentence:** *[Complete after manual review]*

**Key Finding:** *[Complete after manual review]*

**Blocking Issues:** *[Complete after manual review]*

---

## Tier 1: Non-Negotiable Evaluations

### 1.1 Identity & Purpose

| Field | Value |
|-------|-------|
| Repository Name | ${REPO_NAME} |
| Creation Date | ${CREATION_DATE:-Unknown} |
| Last Commit | ${LAST_COMMIT:-Unknown} |
| Last Commit Message | ${LAST_COMMIT_MSG:-Unknown} |
| Total Commits | ${COMMIT_COUNT:-0} |
| Branch Count | ${BRANCH_COUNT:-0} |

**Stated Purpose (from README):**
> ${README_EXCERPT:-No README found}

**Actual Purpose:** *[Complete after code review]*

**Lifecycle Status:** \`active | maintenance | dormant | abandoned | experimental\`

---

### 1.2 Executability State

| Test | Result |
|------|--------|
| Clone & Install | ⚠️ Not tested |
| Build | ⚠️ Not tested |
| Runtime | ⚠️ Not tested |

**Blocking Issues:** *Run \`test-exec.sh ${REPO_NAME}\` to verify*

**Last Verified Working:** *Unknown*

---

### 1.3 Technical Stack

| Component | Value |
|-----------|-------|
| Node.js Project | ${HAS_NODE} |
| Rust Project | ${HAS_RUST} |
| Python Project | ${HAS_PYTHON} |
| Frameworks | ${FRAMEWORKS:-None detected} |
| Lines of Code | ${LINES_OF_CODE:-Unknown} |

---

### 1.4 Architecture & Structure

**Directory Structure:**
\`\`\`
$(tree -L 2 -d "$REPO_PATH" 2>/dev/null | head -25 || find "$REPO_PATH" -maxdepth 2 -type d 2>/dev/null | head -25)
\`\`\`

**Architectural Pattern:** \`monolith | modular | microservice | library | cli | hybrid\`

**Separation of Concerns:** \`clean | adequate | mixed | poor\`

---

### 1.5 Data Flow & State Management

*[Complete after code review]*

- State Location:
- Data Flow Direction:
- Synchronisation Mechanism:
- Single Source of Truth:
- Race Condition Risks:

---

### 1.6 Contract Drift Analysis

| Check | Result |
|-------|--------|
| CONTRACT.ts Present | ${HAS_CONTRACT:-Not found} |
| TypeScript Interfaces | $(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" -name "*.ts" -exec grep -l "export interface" {} \; 2>/dev/null | wc -l) files |
| Rust Structs | $(find "$REPO_PATH" -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/.next/*" -name "*.rs" -exec grep -l "pub struct" {} \; 2>/dev/null | wc -l) files |

**Drift Evidence:** *[Complete after comparison]*

---

### 1.7 FCIP Relevance Assessment

**Engine Alignment:**
- [ ] Ε Entity Resolution
- [ ] Τ Temporal Parser
- [ ] Α Argumentation
- [ ] Β Bias Detection
- [ ] Κ Contradiction
- [ ] Λ Accountability Audit
- [ ] Π Professional Tracker
- [ ] Ο Omission Detection (P1)
- [ ] Ξ Expert Witness (P2)
- [ ] Δ Documentary Analysis (P3)
- [ ] Μ Narrative Evolution (P4)
- [ ] Σ Cross-Institutional (P5)

**Reusable Components:** *[List components worth extracting]*

**Integration Potential:** \`high | medium | low | none\`

---

## Quality Indicators

### Technical Debt
| Indicator | Count |
|-----------|-------|
| TODO/FIXME comments | ${TODO_COUNT:-0} |
| FIXME comments | ${FIXME_COUNT:-0} |

### Security & Configuration
| Check | Status |
|-------|--------|
| Environment files present | ${ENV_FILES:-0} files |
| .gitignore present | ${GITIGNORE_EXISTS:-no} |

### Testing & Documentation
| Metric | Value |
|--------|-------|
| Test files | ${TEST_FILES:-0} |
| Test directory | ${HAS_TEST_DIR:-no} |
| Documentation files | ${DOC_FILES:-0} |
| Changelog present | ${HAS_CHANGELOG:-no} |

---

## Critical Questions

1. **Can I run this today?**  
   *[Answer definitively]*

2. **What problem does this solve?**  
   *[Answer definitively]*

3. **Does this duplicate something else?**  
   *[Answer definitively]*

4. **Where are the contracts defined?**  
   *[Answer definitively]*

5. **What would break if I deleted this?**  
   *[Answer definitively]*

6. **What's worth extracting for FCIP?**  
   *[Answer definitively]*

7. **What mistakes were made here?**  
   *[Answer definitively]*

8. **Should this exist as a separate repo?**  
   *[Answer definitively]*

---

## FCIP Disposition

- [ ] Core Platform Component
- [ ] Engine Implementation
- [ ] Shared Utility
- [ ] Reference/Learning Only
- [ ] Archive Candidate
- [ ] Requires Further Investigation

---

## Recommendations

### Immediate Actions
1. *[Action item]*

### Integration Opportunities
1. *[Opportunity]*

### Technical Debt to Address
1. *[Debt item]*

### Consolidation Suggestions
1. *[Suggestion]*

---

*Generated by Architect Agent • Apatheia Labs • RAP v1.0*
EOF

    echo -e "${WHITE}Report generated: ${REPORT_FILE}${NC}"
}

# ============================================================================
# Generate JSON Report
# ============================================================================

generate_json_report() {
    local json_file="${AUDIT_DIR}/audit-report-${AUDIT_DATE}.json"
    
    cat > "$json_file" << EOF
{
  "meta": {
    "repo_name": "${REPO_NAME}",
    "audit_date": "${AUDIT_DATE}",
    "auditor": "Architect Agent",
    "protocol": "RAP v1.0"
  },
  "identity": {
    "creation_date": "${CREATION_DATE:-null}",
    "last_commit": "${LAST_COMMIT:-null}",
    "commit_count": ${COMMIT_COUNT:-0},
    "branch_count": ${BRANCH_COUNT:-0}
  },
  "tech_stack": {
    "has_node": ${HAS_NODE:-false},
    "has_rust": ${HAS_RUST:-false},
    "has_python": ${HAS_PYTHON:-false},
    "frameworks": "${FRAMEWORKS:-}",
    "lines_of_code": ${LINES_OF_CODE:-0}
  },
  "contracts": {
    "contract_file": "${HAS_CONTRACT:-null}"
  },
  "tech_debt": {
    "todo_count": ${TODO_COUNT:-0},
    "fixme_count": ${FIXME_COUNT:-0}
  },
  "verdict": null,
  "fcip_relevance": null,
  "recommended_action": null
}
EOF

    echo -e "${WHITE}JSON report generated: ${json_file}${NC}"
}

# ============================================================================
# Cross-Repository Analysis
# ============================================================================

generate_cross_repo_report() {
    local report_file="${AUDITS_DIR}/cross-repo-analysis-${AUDIT_DATE}.md"

    cat > "$report_file" << 'EOF'
# Cross-Repository Analysis Report

**Analysis Date:** AUDIT_DATE_PLACEHOLDER
**Auditor:** Architect Agent (MAOF v1.0)
**Protocol:** RAP v1.0

---

## Repository Inventory

EOF

    # Get repository summary from knowledge base
    sqlite3 "$KNOWLEDGE_DB" << 'EOF_SQL' >> "$report_file"
.mode table
.header on

SELECT
    name as 'Repository',
    fcip_disposition as 'FCIP Status',
    last_audited as 'Last Audit',
    lifecycle_status as 'Lifecycle'
FROM repositories
ORDER BY
    CASE fcip_disposition
        WHEN 'core' THEN 1
        WHEN 'engine' THEN 2
        WHEN 'utility' THEN 3
        WHEN 'reference' THEN 4
        WHEN 'archive' THEN 5
        ELSE 6
    END,
    last_audited DESC;
EOF_SQL

    cat >> "$report_file" << 'EOF'

## FCIP Integration Opportunities

### Core Platform Candidates
EOF

    sqlite3 "$KNOWLEDGE_DB" << 'EOF_SQL' >> "$report_file"
.mode table
.header on
SELECT r.name, a.verdict, a.recommended_action
FROM repositories r
LEFT JOIN audits a ON r.id = a.repo_id
WHERE r.fcip_disposition = 'core'
ORDER BY a.audit_date DESC;
EOF_SQL

    cat >> "$report_file" << 'EOF'

### Engine Implementations
EOF

    sqlite3 "$KNOWLEDGE_DB" << 'EOF_SQL' >> "$report_file"
.mode table
.header on
SELECT r.name, GROUP_CONCAT(DISTINCT ea.engine_symbol, ', ') as engines
FROM repositories r
LEFT JOIN engine_alignment ea ON r.id = ea.repo_id
WHERE r.fcip_disposition IN ('core', 'engine')
GROUP BY r.id, r.name
ORDER BY LENGTH(engines) DESC;
EOF_SQL

    cat >> "$report_file" << 'EOF'

## Contract Drift Overview
EOF

    sqlite3 "$KNOWLEDGE_DB" << 'EOF_SQL' >> "$report_file"
.mode table
.header on
SELECT r.name as repo, cd.drift_type, cd.severity, cd.resolved_at
FROM repositories r
JOIN contracts c ON r.id = c.repo_id
LEFT JOIN contract_drift cd ON c.id = cd.frontend_contract_id
WHERE cd.id IS NOT NULL
ORDER BY cd.severity DESC, cd.resolved_at IS NULL DESC;
EOF_SQL

    cat >> "$report_file" << 'EOF'

## Technical Debt Hotspots
EOF

    sqlite3 "$KNOWLEDGE_DB" << 'EOF_SQL' >> "$report_file"
.mode table
.header on
SELECT r.name, td.debt_type, td.severity, COUNT(*) as count
FROM repositories r
JOIN tech_debt td ON r.id = td.repo_id
GROUP BY r.id, r.name, td.debt_type, td.severity
ORDER BY count DESC;
EOF_SQL

    cat >> "$report_file" << 'EOF'

## Recommendations

### Immediate Consolidation Opportunities
1. **[Priority 1]** Identify duplicate implementations across repositories
2. **[Priority 1]** Standardize contract definitions (CONTRACT.ts patterns)
3. **[Priority 2]** Establish shared component library for reusable parts

### FCIP Integration Roadmap
1. **[Week 1]** Complete engine alignment assessment for all active repos
2. **[Week 2]** Create integration plan for core platform components
3. **[Week 3]** Begin phased migration to unified architecture

---

*Generated by Architect Agent • Apatheia Labs • RAP v1.0*
EOF

    # Replace placeholder
    sed -i "s/AUDIT_DATE_PLACEHOLDER/${AUDIT_DATE}/g" "$report_file"

    echo -e "${WHITE}Cross-repo analysis generated: ${report_file}${NC}"
}

# ============================================================================
# Main
# ============================================================================

echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}  Generating Audit Report: ${REPO_NAME}${NC}"
echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ! -d "$REPO_PATH" ]; then
    echo -e "${RED}Repository not found: ${REPO_PATH}${NC}"
    exit 1
fi

echo -e "${GRAY}Gathering repository data...${NC}"
gather_repo_data "$REPO_PATH"

case "$FORMAT" in
    --json)
        generate_json_report
        ;;
    --cross-repo)
        generate_cross_repo_report
        ;;
    --summary)
        generate_markdown_report
        echo -e "${GRAY}Summary mode - review and complete the executive summary section${NC}"
        ;;
    --all)
        echo -e "${GRAY}Generating reports for all audited repositories...${NC}"
        # Get all repo names from knowledge base
        REPO_LIST=$(sqlite3 "$KNOWLEDGE_DB" "SELECT name FROM repositories;")
        for repo in $REPO_LIST; do
            echo -e "${GRAY}Generating report for: ${repo}${NC}"
            # Temporarily set repo name for report generation
            REPO_NAME="$repo"
            REPORT_FILE="${AUDITS_DIR}/${repo}/audit-report-${AUDIT_DATE}.md"
            gather_repo_data "${REPOS_DIR}/${repo}"
            generate_markdown_report
        done
        echo -e "${GREEN}Generated reports for all repositories${NC}"
        ;;
    *)
        generate_markdown_report
        ;;
esac

# Record in knowledge base
sqlite3 "$KNOWLEDGE_DB" << EOF
INSERT OR REPLACE INTO repositories (name, path, last_audited)
VALUES ('${REPO_NAME}', '${REPO_PATH}', '${AUDIT_DATE}');
EOF

echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

