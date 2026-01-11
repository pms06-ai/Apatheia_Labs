#!/bin/bash
# Apatheia Labs - Architect Agent
# List Available Repositories

BRONZE='\033[0;33m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
GREEN='\033[0;32m'
NC='\033[0m'

REPOS_DIR="${REPOS_DIR:-/workspace/repos}"
KNOWLEDGE_DB="${KNOWLEDGE_DB:-/workspace/knowledge/architect.db}"

echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}  Available Repositories${NC}"
echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

if [ ! -d "$REPOS_DIR" ]; then
    echo -e "${GRAY}Repos directory not found: ${REPOS_DIR}${NC}"
    echo -e "${GRAY}Mount your repos directory when starting the container.${NC}"
    exit 1
fi

# List repos with audit status
echo ""
printf "${WHITE}%-30s %-12s %-15s${NC}\n" "REPOSITORY" "AUDITED" "LAST AUDIT"
echo -e "${GRAY}──────────────────────────────────────────────────────────────${NC}"

for repo in "$REPOS_DIR"/*/; do
    if [ -d "$repo" ]; then
        repo_name=$(basename "$repo")
        
        # Check if audited
        audit_status=$(sqlite3 "$KNOWLEDGE_DB" "SELECT last_audited FROM repositories WHERE name='${repo_name}';" 2>/dev/null)
        
        if [ -n "$audit_status" ]; then
            printf "%-30s ${GREEN}%-12s${NC} %-15s\n" "$repo_name" "Yes" "$audit_status"
        else
            printf "%-30s ${GRAY}%-12s${NC} %-15s\n" "$repo_name" "No" "-"
        fi
    fi
done

echo ""
echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Summary
total=$(ls -d "$REPOS_DIR"/*/ 2>/dev/null | wc -l)
audited=$(sqlite3 "$KNOWLEDGE_DB" "SELECT COUNT(*) FROM repositories;" 2>/dev/null || echo "0")

echo -e "${GRAY}Total: ${total} repositories | Audited: ${audited}${NC}"
echo ""
echo -e "${WHITE}Usage:${NC}"
echo -e "  ${GRAY}audit.sh <repo-name>      Run audit${NC}"
echo -e "  ${GRAY}test-exec.sh <repo-name>  Test executability${NC}"
echo -e "  ${GRAY}report.sh <repo-name>     Generate report${NC}"
echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

