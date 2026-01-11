#!/bin/bash
# Apatheia Labs - Architect Agent
# Executability Test Script v1.0
# Tests whether a repository can actually build and run

set -e

BRONZE='\033[0;33m'
RED='\033[0;31m'
GREEN='\033[0;32m'
WHITE='\033[1;37m'
GRAY='\033[0;90m'
NC='\033[0m'

REPOS_DIR="${REPOS_DIR:-/workspace/repos}"

if [ $# -lt 1 ]; then
    echo "Usage: test-exec.sh <repo-name> [--install] [--build] [--run]"
    exit 1
fi

REPO_NAME="$1"
REPO_PATH="${REPOS_DIR}/${REPO_NAME}"

if [ ! -d "$REPO_PATH" ]; then
    echo -e "${RED}Repository not found: ${REPO_PATH}${NC}"
    exit 1
fi

echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}  Executability Test: ${REPO_NAME}${NC}"
echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Create temporary working directory
WORK_DIR="/tmp/exec-test-${REPO_NAME}"
rm -rf "$WORK_DIR"
cp -r "$REPO_PATH" "$WORK_DIR"
cd "$WORK_DIR"

INSTALL_STATUS="not_tested"
BUILD_STATUS="not_tested"
RUN_STATUS="not_tested"
BLOCKING_ISSUES=""

# ============================================================================
# Node.js Project
# ============================================================================
if [ -f "package.json" ]; then
    echo -e "\n${WHITE}Node.js Project Detected${NC}\n"
    
    # Determine package manager
    if [ -f "pnpm-lock.yaml" ]; then
        PKG_MGR="pnpm"
    elif [ -f "yarn.lock" ]; then
        PKG_MGR="yarn"
    else
        PKG_MGR="npm"
    fi
    
    echo -e "${GRAY}Package manager: ${PKG_MGR}${NC}"
    
    # Install
    echo -e "\n${BRONZE}▸ Testing: npm install${NC}"
    if $PKG_MGR install 2>&1 | tee /tmp/install.log; then
        echo -e "${GREEN}✓ Install successful${NC}"
        INSTALL_STATUS="success"
    else
        echo -e "${RED}✗ Install failed${NC}"
        INSTALL_STATUS="failed"
        BLOCKING_ISSUES="${BLOCKING_ISSUES}Install failed. "
    fi
    
    # Build (if install succeeded)
    if [ "$INSTALL_STATUS" = "success" ]; then
        # Check if build script exists
        if grep -q '"build"' package.json; then
            echo -e "\n${BRONZE}▸ Testing: npm run build${NC}"
            if $PKG_MGR run build 2>&1 | tee /tmp/build.log; then
                echo -e "${GREEN}✓ Build successful${NC}"
                BUILD_STATUS="success"
            else
                echo -e "${RED}✗ Build failed${NC}"
                BUILD_STATUS="failed"
                BLOCKING_ISSUES="${BLOCKING_ISSUES}Build failed. "
            fi
        else
            echo -e "${GRAY}No build script defined${NC}"
            BUILD_STATUS="not_applicable"
        fi
    fi
    
    # Check for type errors (TypeScript)
    if [ -f "tsconfig.json" ] && [ "$INSTALL_STATUS" = "success" ]; then
        echo -e "\n${BRONZE}▸ Testing: TypeScript compilation${NC}"
        if npx tsc --noEmit 2>&1 | tee /tmp/tsc.log; then
            echo -e "${GREEN}✓ No TypeScript errors${NC}"
        else
            echo -e "${RED}✗ TypeScript errors found${NC}"
            BLOCKING_ISSUES="${BLOCKING_ISSUES}TypeScript errors. "
        fi
    fi
fi

# ============================================================================
# Rust Project
# ============================================================================
if [ -f "Cargo.toml" ]; then
    echo -e "\n${WHITE}Rust Project Detected${NC}\n"
    
    # Check
    echo -e "${BRONZE}▸ Testing: cargo check${NC}"
    if cargo check 2>&1 | tee /tmp/cargo-check.log; then
        echo -e "${GREEN}✓ Cargo check passed${NC}"
        INSTALL_STATUS="success"
        BUILD_STATUS="success"
    else
        echo -e "${RED}✗ Cargo check failed${NC}"
        BUILD_STATUS="failed"
        BLOCKING_ISSUES="${BLOCKING_ISSUES}Cargo check failed. "
    fi
    
    # Clippy (lints)
    echo -e "\n${BRONZE}▸ Testing: cargo clippy${NC}"
    if cargo clippy 2>&1 | tee /tmp/cargo-clippy.log; then
        echo -e "${GREEN}✓ Clippy passed${NC}"
    else
        echo -e "${GRAY}Clippy warnings present${NC}"
    fi
    
    # Audit (security)
    if command -v cargo-audit &> /dev/null; then
        echo -e "\n${BRONZE}▸ Testing: cargo audit${NC}"
        if cargo audit 2>&1 | tee /tmp/cargo-audit.log; then
            echo -e "${GREEN}✓ No known vulnerabilities${NC}"
        else
            echo -e "${RED}✗ Security vulnerabilities found${NC}"
            BLOCKING_ISSUES="${BLOCKING_ISSUES}Security vulnerabilities. "
        fi
    fi
fi

# ============================================================================
# Python Project
# ============================================================================
if [ -f "requirements.txt" ] || [ -f "pyproject.toml" ]; then
    echo -e "\n${WHITE}Python Project Detected${NC}\n"
    
    # Create virtual environment
    echo -e "${BRONZE}▸ Creating virtual environment${NC}"
    python3 -m venv .venv
    source .venv/bin/activate
    
    # Install
    echo -e "\n${BRONZE}▸ Testing: pip install${NC}"
    if [ -f "requirements.txt" ]; then
        if pip install -r requirements.txt 2>&1 | tee /tmp/pip-install.log; then
            echo -e "${GREEN}✓ Install successful${NC}"
            INSTALL_STATUS="success"
        else
            echo -e "${RED}✗ Install failed${NC}"
            INSTALL_STATUS="failed"
            BLOCKING_ISSUES="${BLOCKING_ISSUES}Pip install failed. "
        fi
    fi
    
    # Type check with mypy
    if [ "$INSTALL_STATUS" = "success" ] && command -v mypy &> /dev/null; then
        echo -e "\n${BRONZE}▸ Testing: mypy type check${NC}"
        if mypy . --ignore-missing-imports 2>&1 | tee /tmp/mypy.log; then
            echo -e "${GREEN}✓ Type check passed${NC}"
        else
            echo -e "${GRAY}Type check warnings${NC}"
        fi
    fi
    
    # Security check with bandit
    if [ "$INSTALL_STATUS" = "success" ] && command -v bandit &> /dev/null; then
        echo -e "\n${BRONZE}▸ Testing: bandit security scan${NC}"
        if bandit -r . -ll 2>&1 | tee /tmp/bandit.log; then
            echo -e "${GREEN}✓ No high-severity issues${NC}"
        else
            echo -e "${RED}✗ Security issues found${NC}"
        fi
    fi
    
    deactivate
fi

# ============================================================================
# Summary
# ============================================================================
echo -e "\n${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${WHITE}Executability Summary: ${REPO_NAME}${NC}"
echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

echo -e "Install: ${INSTALL_STATUS}"
echo -e "Build:   ${BUILD_STATUS}"
echo -e "Run:     ${RUN_STATUS}"

if [ -n "$BLOCKING_ISSUES" ]; then
    echo -e "\n${RED}Blocking Issues:${NC}"
    echo -e "${BLOCKING_ISSUES}"
else
    echo -e "\n${GREEN}No blocking issues detected${NC}"
fi

# Determine verdict
if [ "$INSTALL_STATUS" = "success" ] && [ "$BUILD_STATUS" = "success" ]; then
    VERDICT="working"
    echo -e "\n${GREEN}VERDICT: Working${NC}"
elif [ "$INSTALL_STATUS" = "success" ]; then
    VERDICT="partially_working"
    echo -e "\n${GRAY}VERDICT: Partially Working${NC}"
else
    VERDICT="broken"
    echo -e "\n${RED}VERDICT: Broken${NC}"
fi

# Cleanup
cd /
rm -rf "$WORK_DIR"

echo -e "${BRONZE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

