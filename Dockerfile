# Apatheia Labs - Architect Agent Brain
# FCIP v6.0 Repository Audit Environment
# RAP v1.0 Compliant

FROM ubuntu:24.04

LABEL maintainer="Apatheia Labs"
LABEL description="Architect Agent environment for systematic repository audits"
LABEL version="1.0"

# Prevent interactive prompts
ENV DEBIAN_FRONTEND=noninteractive
ENV TZ=Europe/London

# Core system packages
RUN apt-get update && apt-get install -y \
    # Essentials
    curl \
    wget \
    git \
    build-essential \
    pkg-config \
    libssl-dev \
    # Python build dependencies
    python3 \
    python3-pip \
    python3-venv \
    python3-dev \
    # Database
    sqlite3 \
    libsqlite3-dev \
    # Analysis tools
    jq \
    tree \
    ripgrep \
    fd-find \
    cloc \
    # Tauri dependencies (for Rust GUI builds)
    libgtk-3-dev \
    libwebkit2gtk-4.1-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Node.js 20 LTS
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y nodejs \
    && npm install -g npm@latest \
    && npm install -g pnpm yarn

# Rust toolchain
RUN curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
ENV PATH="/root/.cargo/bin:${PATH}"

# Rust analysis tools
RUN cargo install tokei cargo-audit cargo-outdated

# Python packages for analysis
RUN pip3 install --break-system-packages --ignore-installed \
    pylint \
    mypy \
    bandit \
    safety \
    pipdeptree

# Create workspace structure
RUN mkdir -p /workspace/{repos,audits,knowledge,protocols,scripts}

# Set working directory
WORKDIR /workspace

# Copy protocols and scripts
COPY protocols/ /workspace/protocols/
COPY scripts/ /workspace/scripts/

# Make scripts executable
RUN chmod +x /workspace/scripts/*.sh

# Initialize knowledge base
COPY knowledge/init-db.sql /tmp/init-db.sql
RUN mkdir -p /workspace/knowledge && sqlite3 /workspace/knowledge/architect.db < /tmp/init-db.sql

# Environment variables
ENV ARCHITECT_HOME=/workspace
ENV REPOS_DIR=/workspace/repos
ENV AUDITS_DIR=/workspace/audits
ENV KNOWLEDGE_DB=/workspace/knowledge/architect.db
ENV PROTOCOLS_DIR=/workspace/protocols

# Default command
CMD ["/bin/bash"]

