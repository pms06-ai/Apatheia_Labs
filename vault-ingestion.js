// Phronesis FCIP - Obsidian Vault Ingestion Script
// Ingests forensic case materials from Obsidian vault
const fs = require('fs');
const path = require('path');
async function ingestObsidianVault() {
    console.log('­ƒÜÇ Starting Phronesis FCIP - Obsidian Vault Ingestion');
    console.log('­ƒôè Target: 761+ forensic documents from PE23C50095 family court case');
    const vaultPath = 'C:/Users/pstep/OneDrive/Documents/Obsidian Vault';
    const caseId = 'obsidian-pe23c50095-' + Date.now();
    console.log(­ƒôØ Creating case: );
    // Create case
    try {
        const caseResult = await window.__TAURI__.invoke('create_case', {
            caseData: {
                reference: 'PE23C50095-Obsidian',
                name: 'PE23C50095 Family Court Case - Complete Obsidian Vault',
                case_type: 'family_court',
                description: 'Complete ingestion of PE23C50095 family court case materials from Obsidian vault including court documents, witness statements, expert reports, police disclosure, and forensic analysis work.'
            }
        });
        if (!caseResult.success) {
            throw new Error('Failed to create case: ' + caseResult.error);
        }
        console.log('Ô£à Case created successfully');
        // File categories to ingest
        const categories = [
            {
                name: 'Core Case Documents',
                path: path.join(vaultPath, '10 - Case Materials/PE23C50095'),
                pattern: '**/*.md',
                docType: 'court_bundle',
                priority: 1
            },
            {
                name: 'Witness Statements',
                path: path.join(vaultPath, '10 - Case Materials'),
                pattern: '**/*Statement*.md',
                docType: 'witness_statement', 
                priority: 2
            },
            {
                name: 'Position Statements',
                path: path.join(vaultPath, '10 - Case Materials'),
                pattern: '**/*Position*.md',
                docType: 'position_statement',
                priority: 2
            },
            {
                name: 'Contradiction Analysis',
                path: path.join(vaultPath, '40 - Analysis/40 - Contradiction Tracking'),
                pattern: '**/*.md',
                docType: 'analysis',
                priority: 3
            },
            {
                name: 'Institutional Analysis', 
                path: path.join(vaultPath, '40 - Analysis/50 - Institutional Analysis'),
                pattern: '**/*.md',
                docType: 'analysis',
                priority: 3
            },
            {
                name: 'Research Materials',
                path: path.join(vaultPath, '50 - Research'),
                pattern: '**/*.md',
                docType: 'research',
                priority: 4
            }
        ];
        let totalFiles = 0;
        let uploadedFiles = 0;
        for (const category of categories) {
            console.log(\n­ƒôé Processing category: );
            try {
                const files = await findMarkdownFiles(category.path, category.pattern);
                console.log(   Found  files);
                totalFiles += files.length;
                for (const filePath of files) {
                    try {
                        const content = fs.readFileSync(filePath, 'utf8');
                        const filename = path.basename(filePath);
                        const uploadResult = await window.__TAURI__.invoke('upload_document', {
                            caseId: caseResult.data.id,
                            filename,
                            fileType: 'text/markdown',
                            docType: category.docType,
                            data: Array.from(new Uint8Array(Buffer.from(content)))
                        });
                        if (uploadResult.success) {
                            uploadedFiles++;
                            if (uploadedFiles % 50 === 0) {
                                console.log(   ­ƒôñ Uploaded / files);
                            }
                        } else {
                            console.error(   ÔØî Failed to upload : );
                        }
                    } catch (fileError) {
                        console.error(   ÔØî Error processing : );
                    }
                }
            } catch (categoryError) {
                console.error(   ÔØî Error processing category : );
            }
        }
        console.log(\n­ƒÄë Ingestion complete!);
        console.log(­ƒôè Results:);
        console.log(   - Case ID: );
        console.log(   - Files found: );
        console.log(   - Files uploaded: );
        console.log(   - Success rate: %);
        console.log(\n­ƒÜÇ Ready for analysis with all 12 Phronesis engines!);
    } catch (error) {
        console.error('­ƒÆÑ Ingestion failed:', error);
    }
}
function findMarkdownFiles(dirPath, pattern) {
    const results = [];
    function scanDirectory(currentPath) {
        if (!fs.existsSync(currentPath)) return;
        const items = fs.readdirSync(currentPath);
        for (const item of items) {
            const fullPath = path.join(currentPath, item);
            const stat = fs.statSync(fullPath);
            if (stat.isDirectory() && !item.startsWith('.') && item !== 'node_modules') {
                scanDirectory(fullPath);
            } else if (stat.isFile() && item.endsWith('.md')) {
                results.push(fullPath);
            }
        }
    }
    scanDirectory(dirPath);
    return results;
}
// Make available globally
window.ingestObsidianVault = ingestObsidianVault;
