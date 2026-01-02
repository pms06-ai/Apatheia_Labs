import { invoke } from '@tauri-apps/api/core';
import { readTextFile, BaseDirectory } from '@tauri-apps/api/fs';
import { join } from '@tauri-apps/api/path';

async function createTestCaseAndUpload() {
  try {
    console.log('Creating test case...');
    
    // Create case
    const caseData = {
      reference: 'E2E-TEST-2024',
      name: 'End-to-End Test Case',
      case_type: 'family_court',
      description: 'Automated E2E test for Phronesis FCIP analysis engines'
    };
    
    const createResult = await invoke('create_case', { caseData });
    console.log('Case created:', createResult);
    
    const caseId = createResult.id;
    
    // Upload documents
    const testFiles = [
      'police_report_1.txt',
      'police_report_2.txt', 
      'witness_statement.txt',
      'psychological_assessment.pdf'
    ];
    
    for (const filename of testFiles) {
      console.log(Uploading ...);
      
      const filePath = await join('test-data', filename);
      const content = await readTextFile(filePath, { dir: BaseDirectory.Desktop });
      
      const uploadResult = await invoke('upload_document', {
        caseId,
        filename,
        fileType: filename.endsWith('.pdf') ? 'application/pdf' : 'text/plain',
        docType: filename.includes('police') ? 'police_bundle' : 
                filename.includes('witness') ? 'witness_statement' : 'expert_report',
        data: Array.from(new TextEncoder().encode(content))
      });
      
      console.log(${filename} uploaded:, uploadResult.success);
    }
    
    console.log('Test case setup complete!');
    return caseId;
    
  } catch (error) {
    console.error('Error:', error);
  }
}

createTestCaseAndUpload();
