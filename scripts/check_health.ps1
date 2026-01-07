$ErrorActionPreference = "Stop"

function Write-Status {
    param($Name, $Success, $Message)
    if ($Success) {
        Write-Host "[$([char]0x2713)] $Name" -ForegroundColor Green
    } else {
        Write-Host "[$([char]0x2717)] $Name" -ForegroundColor Red
        if ($Message) {
            Write-Host "    $Message" -ForegroundColor DarkGray
        }
    }
}

Write-Host "Checking Phronesis Environment..." -ForegroundColor Cyan
Write-Host "================================"

# 1. Check Python
try {
    $pyVersion = python --version 2>&1
    Write-Status "Python Installation" $true $pyVersion
} catch {
    Write-Status "Python Installation" $false "Python is not in PATH"
}

# 2. Check Poppler
try {
    $pdftoppm = Get-Command pdftoppm -ErrorAction SilentlyContinue
    if ($pdftoppm) {
        Write-Status "Poppler (pdftoppm)" $true "Found at $($pdftoppm.Source)"
    } else {
        Write-Status "Poppler (pdftoppm)" $false "Not found in PATH. Required for PDF processing."
    }
} catch {
    Write-Status "Poppler (pdftoppm)" $false "Check failed"
}

# 3. Check Claude CLI
try {
    $claude = Get-Command claude -ErrorAction SilentlyContinue
    if ($claude) {
        Write-Status "Claude CLI" $true "Found at $($claude.Source)"
    } else {
        Write-Status "Claude CLI" $false "Not found. Run 'npm install -g @anthropic-ai/claude-code'"
    }
} catch {
    Write-Status "Claude CLI" $false "Check failed"
}

# 4. Check API Keys (Environment)
$geminiKey = $env:GEMINI_API_KEY
if ($geminiKey) {
    Write-Status "GEMINI_API_KEY" $true "Present in current session"
} else {
    # Check .env
    if (Test-Path ".env") {
        $envContent = Get-Content ".env"
        if ($envContent -match "GEMINI_API_KEY=") {
            Write-Status "GEMINI_API_KEY" $true "Found in .env file"
        } else {
             Write-Status "GEMINI_API_KEY" $false "Missing from environment and .env"
        }
    } else {
        Write-Status "GEMINI_API_KEY" $false "Missing from environment and .env"
    }
}

# 5. Check Python Requirements
if (Test-Path "scripts/requirements.txt") {
    try {
        # This is a loose check, just seeing if we can run pip freeze
        $installed = pip freeze 2>&1
        $reqs = Get-Content "scripts/requirements.txt"
        $missing = @()
        
        # Very basic check for key packages
        $keyPackages = @("google-generativeai", "pdf2image", "numpy", "scikit-learn")
        foreach ($pkg in $keyPackages) {
            if ($installed -notmatch "$pkg") {
                $missing += $pkg
            }
        }
        
        if ($missing.Count -eq 0) {
            Write-Status "Python Packages" $true "Key packages appear installed"
        } else {
            Write-Status "Python Packages" $false "Missing: $($missing -join ', ')"
        }
    } catch {
        Write-Status "Python Packages" $false "Failed to check pip packages"
    }
}

Write-Host "`nDone."
