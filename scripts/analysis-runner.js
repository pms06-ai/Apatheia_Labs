// Post-Ingestion Analysis Script
// Runs comprehensive analysis on ingested Obsidian vault
async function runCompleteAnalysis() {
    console.log('­ƒöì Starting comprehensive Phronesis analysis on PE23C50095 case');
    const caseId = 'obsidian-pe23c50095'; // Will be updated with actual case ID
    // Phase 1: Get all documents
    console.log('­ƒôï Retrieving case documents...');
    const docsResult = await window.__TAURI__.invoke('get_documents', { caseId });
    if (!docsResult.success) {
        throw new Error('Failed to get documents: ' + docsResult.error);
    }
    const documents = docsResult.data;
    console.log(­ƒôä Found  documents);
    // Phase 2: Process all documents
    console.log('ÔÜÖ´©Å Processing documents...');
    for (const doc of documents) {
        if (doc.status === 'pending') {
            console.log(   Processing: );
            await window.__TAURI__.invoke('process_document', { documentId: doc.id });
        }
    }
    // Phase 3: Run all 12 engines
    const engines = [
        'contradiction', 'omission', 'expert_witness', 'narrative', 
        'coordination', 'entity_resolution', 'temporal_parser', 'documentary',
        'argumentation', 'bias_detection', 'accountability_audit', 'professional_tracker'
    ];
    console.log('­ƒÜÇ Running all 12 analysis engines...');
    for (const engine of engines) {
        console.log(\n­ƒÄ» Running  engine...);
        try {
            const result = await window.__TAURI__.invoke('run_engine', {
                engineId: engine,
                caseId: caseId,
                documentIds: documents.map(d => d.id)
            });
            if (result.success) {
                console.log(   Ô£à :  findings);
            } else {
                console.log(   ÔÜá´©Å : );
            }
        } catch (error) {
            console.log(   ÔØî : );
        }
    }
    // Phase 4: Generate analysis report
    console.log('\n­ƒôè Generating analysis summary...');
    const findingsResult = await window.__TAURI__.invoke('get_analysis', { caseId });
    if (findingsResult.success) {
        const { findings, contradictions, omissions } = findingsResult.data;
        console.log('­ƒÄë Analysis Complete!');
        console.log(   Findings: );
        console.log(   Contradictions: );
        console.log(   Omissions: );
        // Summary by engine
        const byEngine = {};
        findings.forEach(f => {
            byEngine[f.engine] = (byEngine[f.engine] || 0) + 1;
        });
        console.log('\n­ƒôê Findings by engine:');
        Object.entries(byEngine).forEach(([engine, count]) => {
            console.log(   : );
        });
    } else {
        console.error('ÔØî Failed to get analysis results');
    }
}
// Make available globally
window.runCompleteAnalysis = runCompleteAnalysis;
