/**
 * ACCOUNTABILITY AUDIT ENGINE TESTS
 *
 * Tests for the Accountability Audit Engine (Lambda)
 * "Statutory Duty Violations"
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals'

// Get mocked modules
const mockGenerateJSON = jest.fn()
const mockSupabaseFrom = jest.fn()

// Mock setup
jest.mock('@/lib/ai-client', () => ({
  generateJSON: (...args: unknown[]) => mockGenerateJSON(...args),
}))

const createMockChain = () => {
  const chain: any = {
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockResolvedValue({ data: null, error: null }),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: { id: 'doc-123', content: 'test', type: 'report', name: 'Test' },
      error: null,
    }),
  }
  return chain
}

let mockChainInstance = createMockChain()

jest.mock('@/lib/supabase/server', () => {
  return {
    supabaseAdmin: {
      from: (...args: unknown[]) => {
        mockSupabaseFrom(...args)
        return mockChainInstance
      },
    },
  }
})

describe('Accountability Audit Engine', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockChainInstance = createMockChain()
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
  })

  describe('Module Exports', () => {
    it('should export accountabilityAuditEngine singleton', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      expect(accountabilityAuditEngine).toBeDefined()
    })

    it('should export AccountabilityAuditEngine class', async () => {
      const { AccountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      expect(AccountabilityAuditEngine).toBeDefined()
    })

    it('should export helper functions', async () => {
      const { getStatutoryDutyLibrary, getDutiesByFramework, getFrameworks } =
        await import('@/lib/engines/accountability-audit')
      expect(getStatutoryDutyLibrary).toBeDefined()
      expect(getDutiesByFramework).toBeDefined()
      expect(getFrameworks).toBeDefined()
    })
  })

  describe('Statutory Duty Library', () => {
    it('should contain Children Act 1989 duties', async () => {
      const { getDutiesByFramework } = await import('@/lib/engines/accountability-audit')
      const duties = getDutiesByFramework('children_act_1989')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.some(d => d.section.includes('s.31'))).toBe(true)
      expect(duties.some(d => d.section.includes('s.1'))).toBe(true)
    })

    it('should contain Family Procedure Rules', async () => {
      const { getDutiesByFramework } = await import('@/lib/engines/accountability-audit')
      const duties = getDutiesByFramework('family_procedure_rules')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.some(d => d.section.includes('PD12J'))).toBe(true)
      expect(duties.some(d => d.section.includes('Part 25'))).toBe(true)
    })

    it('should contain UK GDPR duties', async () => {
      const { getDutiesByFramework } = await import('@/lib/engines/accountability-audit')
      const duties = getDutiesByFramework('uk_gdpr')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.some(d => d.section.includes('Article 6'))).toBe(true)
      expect(duties.some(d => d.section.includes('Article 17'))).toBe(true)
    })

    it('should contain Ofcom Broadcasting Code duties', async () => {
      const { getDutiesByFramework } = await import('@/lib/engines/accountability-audit')
      const duties = getDutiesByFramework('ofcom_broadcasting_code')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.some(d => d.section.includes('Section 5'))).toBe(true)
      expect(duties.some(d => d.section.includes('Section 7'))).toBe(true)
      expect(duties.some(d => d.section.includes('Section 8'))).toBe(true)
    })

    it('should contain HCPC Standards', async () => {
      const { getDutiesByFramework } = await import('@/lib/engines/accountability-audit')
      const duties = getDutiesByFramework('hcpc_standards')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.some(d => d.section.includes('Standard 1'))).toBe(true)
      expect(duties.some(d => d.section.includes('Standard 3'))).toBe(true)
    })

    it('should return all unique frameworks', async () => {
      const { getFrameworks } = await import('@/lib/engines/accountability-audit')
      const frameworks = getFrameworks()

      expect(frameworks).toContain('children_act_1989')
      expect(frameworks).toContain('family_procedure_rules')
      expect(frameworks).toContain('uk_gdpr')
      expect(frameworks).toContain('ofcom_broadcasting_code')
      expect(frameworks).toContain('hcpc_standards')
    })
  })

  describe('getApplicableDuties', () => {
    it('should return duties for local_authority', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      const duties = accountabilityAuditEngine.getApplicableDuties('local_authority')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.every(d => d.applicableTo.includes('local_authority'))).toBe(true)
    })

    it('should return duties for broadcaster', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      const duties = accountabilityAuditEngine.getApplicableDuties('broadcaster')

      expect(duties.length).toBeGreaterThan(0)
      // Should include Ofcom and GDPR duties
      expect(duties.some(d => d.framework === 'ofcom_broadcasting_code')).toBe(true)
      expect(duties.some(d => d.framework === 'uk_gdpr')).toBe(true)
    })

    it('should return duties for healthcare_professional', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      const duties = accountabilityAuditEngine.getApplicableDuties('healthcare_professional')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.some(d => d.framework === 'hcpc_standards')).toBe(true)
    })

    it('should return duties for family_court', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      const duties = accountabilityAuditEngine.getApplicableDuties('family_court')

      expect(duties.length).toBeGreaterThan(0)
      expect(duties.some(d => d.framework === 'children_act_1989')).toBe(true)
      expect(duties.some(d => d.framework === 'family_procedure_rules')).toBe(true)
    })
  })

  describe('getDutyById', () => {
    it('should find duty by ID', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      const duty = accountabilityAuditEngine.getDutyById('ca1989_s31_2')

      expect(duty).toBeDefined()
      expect(duty?.section).toBe('s.31(2)')
      expect(duty?.title).toBe('Threshold Criteria')
    })

    it('should return undefined for non-existent ID', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')
      const duty = accountabilityAuditEngine.getDutyById('non_existent_duty')

      expect(duty).toBeUndefined()
    })
  })

  describe('analyzeDocument', () => {
    it('should detect breaches in document', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = {
        id: 'doc-123',
        content: 'LA failed to investigate despite clear safeguarding concerns...',
        type: 'court_judgment',
        name: 'Judgment',
        date: '2024-01-15',
      }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        breaches: [
          {
            dutyId: 'ca1989_s47',
            dutySection: 's.47',
            dutyTitle: 'Duty to Investigate',
            breachType: 'failure_to_act',
            severity: 'critical',
            description: 'LA failed to investigate safeguarding concerns',
            evidence: {
              quotedText: 'No investigation conducted despite multiple referrals',
              pageReference: 'p.12',
              dateOfAction: '2024-01-10',
              actor: 'Social Services',
            },
            impact: 'Child remained in unsafe environment',
            remedyAvailable: true,
            suggestedRemedy: 'LGSCO complaint',
          },
        ],
        institutionAssessment: {
          overallCompliance: 'non-compliant',
          systematicIssues: true,
          commonFactors: ['Failure to follow protocol'],
        },
      })

      const breaches = await accountabilityAuditEngine.analyzeDocument(
        'doc-123',
        'case-123',
        'Cambridgeshire County Council',
        'local_authority'
      )

      expect(breaches).toHaveLength(1)
      expect(breaches[0].duty.section).toBe('s.47')
      expect(breaches[0].breachType).toBe('failure_to_act')
      expect(breaches[0].severity).toBe('critical')
    })

    it('should use mock breaches in placeholder mode', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'

      jest.resetModules()

      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const breaches = await accountabilityAuditEngine.analyzeDocument(
        'doc-123',
        'case-123',
        'Test LA',
        'local_authority'
      )

      expect(breaches).toHaveLength(1)
      expect(breaches[0].breachType).toBe('failure_to_act')
      expect(mockGenerateJSON).not.toHaveBeenCalled()
    })
  })

  describe('buildMatrix', () => {
    it('should build breach matrix for institution', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = {
        id: 'doc-123',
        content: 'Document content...',
        type: 'assessment',
        name: 'Assessment',
      }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        breaches: [
          {
            dutyId: 'ca1989_s31_2',
            dutySection: 's.31(2)',
            dutyTitle: 'Threshold Criteria',
            breachType: 'misdirection',
            severity: 'high',
            description: 'Wrong legal test applied',
            evidence: { quotedText: 'Quote', pageReference: 'p.5' },
            impact: 'Incorrect threshold finding',
            remedyAvailable: true,
          },
          {
            dutyId: 'ca1989_s1_1',
            dutySection: 's.1(1)',
            dutyTitle: 'Paramount Welfare',
            breachType: 'failure_to_act',
            severity: 'critical',
            description: 'Welfare checklist not applied',
            evidence: { quotedText: 'Quote 2', pageReference: 'p.10' },
            impact: 'Welfare not considered',
            remedyAvailable: true,
          },
        ],
        institutionAssessment: {
          overallCompliance: 'non-compliant',
          systematicIssues: true,
          commonFactors: ['Legal test errors'],
        },
      })

      const matrix = await accountabilityAuditEngine.buildMatrix(
        'case-123',
        'Family Court',
        'family_court',
        ['doc-1', 'doc-2']
      )

      expect(matrix.totalBreaches).toBe(4) // 2 breaches per doc, 2 docs
      expect(matrix.bySeverity.critical).toBeGreaterThan(0)
      expect(matrix.byFramework.children_act_1989.length).toBeGreaterThan(0)
    })

    it('should detect systematic failure patterns', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = { id: 'doc-123', content: '', type: 'report', name: 'Report' }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      // Return many breaches to trigger systematic failure detection
      mockGenerateJSON.mockResolvedValue({
        breaches: [
          {
            dutyId: 'd1',
            dutySection: 's.1',
            dutyTitle: 'T1',
            breachType: 'failure_to_act',
            severity: 'critical',
            description: 'D1',
            evidence: { quotedText: 'Q1' },
            impact: 'I1',
            remedyAvailable: true,
          },
          {
            dutyId: 'd2',
            dutySection: 's.2',
            dutyTitle: 'T2',
            breachType: 'failure_to_act',
            severity: 'critical',
            description: 'D2',
            evidence: { quotedText: 'Q2' },
            impact: 'I2',
            remedyAvailable: true,
          },
          {
            dutyId: 'd3',
            dutySection: 's.3',
            dutyTitle: 'T3',
            breachType: 'failure_to_act',
            severity: 'high',
            description: 'D3',
            evidence: { quotedText: 'Q3' },
            impact: 'I3',
            remedyAvailable: true,
          },
        ],
        institutionAssessment: {
          overallCompliance: 'non-compliant',
          systematicIssues: true,
          commonFactors: ['Factor'],
        },
      })

      const matrix = await accountabilityAuditEngine.buildMatrix(
        'case-123',
        'Test Institution',
        'local_authority',
        ['doc-1', 'doc-2']
      )

      expect(matrix.patternAnalysis.systematicFailure).toBe(true)
      expect(matrix.patternAnalysis.commonFactors.length).toBeGreaterThan(0)
    })
  })

  describe('analyzeCascade', () => {
    it('should detect cascade effects across institutions', async () => {
      const { accountabilityAuditEngine, AccountabilityAuditEngine } =
        await import('@/lib/engines/accountability-audit')

      mockGenerateJSON.mockResolvedValue({
        cascadeIdentified: true,
        originatingBreach: {
          institution: 'Police',
          dutyId: 'wt2023_info_sharing',
          description: 'Failed to share info',
        },
        propagationPath: [
          {
            fromInstitution: 'Police',
            toInstitution: 'Social Services',
            mechanism: 'Information gap',
          },
          {
            fromInstitution: 'Social Services',
            toInstitution: 'Court',
            mechanism: 'Incomplete report',
          },
        ],
        amplificationFactors: ['Poor communication', 'Lack of verification'],
        conclusion: 'Cascade of failures from initial police error',
      })

      // Create mock matrices
      const mockDuty = {
        id: 'test_duty',
        framework: 'children_act_1989' as const,
        section: 's.47',
        title: 'Test',
        description: 'Test duty',
        dutyType: 'mandatory' as const,
        applicableTo: ['local_authority' as const],
        triggers: [],
        requirements: [],
        remedies: [],
      }

      const matrices = [
        {
          caseId: 'case-123',
          institution: 'Police',
          institutionType: 'police' as const,
          breaches: [
            {
              id: 'b1',
              duty: mockDuty,
              institution: 'Police',
              institutionType: 'police' as const,
              breachType: 'failure_to_act' as const,
              severity: 'high' as const,
              description: 'Failed to share',
              evidence: [],
              impact: 'Info gap',
              remedyAvailable: true,
            },
          ],
          byFramework: {} as any,
          bySeverity: { critical: 0, high: 1, medium: 0, low: 0 },
          totalBreaches: 1,
          criticalBreaches: 0,
          unremediedBreaches: 0,
          patternAnalysis: {
            systematicFailure: false,
            affectedDuties: ['s.47'],
            commonFactors: [],
            cascadeEffect: false,
            conclusion: '',
          },
        },
        {
          caseId: 'case-123',
          institution: 'Social Services',
          institutionType: 'local_authority' as const,
          breaches: [
            {
              id: 'b2',
              duty: mockDuty,
              institution: 'Social Services',
              institutionType: 'local_authority' as const,
              breachType: 'procedural_error' as const,
              severity: 'critical' as const,
              description: 'Incomplete assessment',
              evidence: [],
              impact: 'Wrong decision',
              remedyAvailable: true,
            },
          ],
          byFramework: {} as any,
          bySeverity: { critical: 1, high: 0, medium: 0, low: 0 },
          totalBreaches: 1,
          criticalBreaches: 1,
          unremediedBreaches: 0,
          patternAnalysis: {
            systematicFailure: false,
            affectedDuties: ['s.47'],
            commonFactors: [],
            cascadeEffect: false,
            conclusion: '',
          },
        },
      ]

      const result = await accountabilityAuditEngine.analyzeCascade(matrices)

      expect(result.cascadeEffect).toBe(true)
      expect(result.systematicFailure).toBe(true)
      expect(result.commonFactors).toContain('Poor communication')
    })

    it('should return no cascade for single institution', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDuty = {
        id: 'test_duty',
        framework: 'children_act_1989' as const,
        section: 's.47',
        title: 'Test',
        description: 'Test duty',
        dutyType: 'mandatory' as const,
        applicableTo: ['local_authority' as const],
        triggers: [],
        requirements: [],
        remedies: [],
      }

      const matrices = [
        {
          caseId: 'case-123',
          institution: 'Single Institution',
          institutionType: 'local_authority' as const,
          breaches: [],
          byFramework: {} as any,
          bySeverity: { critical: 0, high: 0, medium: 0, low: 0 },
          totalBreaches: 0,
          criticalBreaches: 0,
          unremediedBreaches: 0,
          patternAnalysis: {
            systematicFailure: false,
            affectedDuties: [],
            commonFactors: [],
            cascadeEffect: false,
            conclusion: '',
          },
        },
      ]

      const result = await accountabilityAuditEngine.analyzeCascade(matrices)

      expect(result.cascadeEffect).toBe(false)
      expect(result.conclusion).toContain('multiple institutions')
    })
  })

  describe('generateRemedyMap', () => {
    it('should generate remedies for breach', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      mockGenerateJSON.mockResolvedValue({
        remedies: [
          {
            type: 'ombudsman',
            body: 'Local Government and Social Care Ombudsman',
            procedure: 'Submit complaint via website',
            limitation: '12 months from awareness',
            likelihood: 'high',
            costs: 'Free',
          },
          {
            type: 'judicial_review',
            body: 'Administrative Court',
            procedure: 'Pre-action protocol, then claim',
            limitation: '3 months from decision',
            likelihood: 'medium',
            costs: '£1000-5000',
          },
        ],
        recommendedAction: 'File LGSCO complaint first',
        timeframe: 'Within 6 months',
        precedents: ['R (G) v Barnet LBC [2003]'],
      })

      const mockDuty = {
        id: 'ca1989_s47',
        framework: 'children_act_1989' as const,
        section: 's.47',
        title: 'Duty to Investigate',
        description: 'Test',
        dutyType: 'mandatory' as const,
        applicableTo: ['local_authority' as const],
        triggers: [],
        requirements: [],
        remedies: [],
      }

      const breach = {
        id: 'breach-1',
        duty: mockDuty,
        institution: 'Test LA',
        institutionType: 'local_authority' as const,
        breachType: 'failure_to_act' as const,
        severity: 'critical' as const,
        description: 'Failed to investigate',
        evidence: [],
        impact: 'Child welfare compromised',
        remedyAvailable: true,
      }

      const remedyMap = await accountabilityAuditEngine.generateRemedyMap(breach)

      expect(remedyMap.availableRemedies).toHaveLength(2)
      expect(remedyMap.availableRemedies.some(r => r.type === 'ombudsman')).toBe(true)
      expect(remedyMap.recommendedAction).toBe('File LGSCO complaint first')
      expect(remedyMap.precedents).toContain('R (G) v Barnet LBC [2003]')
    })
  })

  describe('runFullAudit', () => {
    it('should run complete audit across multiple institutions', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = { id: 'doc-123', content: '', type: 'report', name: 'Report' }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        // Document analysis calls
        .mockResolvedValueOnce({
          breaches: [
            {
              dutyId: 'd1',
              dutySection: 's.1',
              dutyTitle: 'T1',
              breachType: 'failure_to_act',
              severity: 'critical',
              description: 'D1',
              evidence: { quotedText: 'Q1' },
              impact: 'I1',
              remedyAvailable: true,
            },
          ],
          institutionAssessment: {
            overallCompliance: 'non-compliant',
            systematicIssues: true,
            commonFactors: [],
          },
        })
        .mockResolvedValueOnce({
          breaches: [
            {
              dutyId: 'd2',
              dutySection: 's.2',
              dutyTitle: 'T2',
              breachType: 'procedural_error',
              severity: 'high',
              description: 'D2',
              evidence: { quotedText: 'Q2' },
              impact: 'I2',
              remedyAvailable: true,
            },
          ],
          institutionAssessment: {
            overallCompliance: 'partial',
            systematicIssues: false,
            commonFactors: [],
          },
        })
        // Cascade analysis
        .mockResolvedValueOnce({
          cascadeIdentified: true,
          propagationPath: [],
          amplificationFactors: ['Factor 1'],
          conclusion: 'Cascade detected',
        })
        // Remedy map
        .mockResolvedValue({
          remedies: [
            {
              type: 'complaint',
              body: 'LGSCO',
              procedure: 'Online',
              limitation: '12m',
              likelihood: 'high',
            },
          ],
          recommendedAction: 'File complaint',
          timeframe: '6 months',
          precedents: [],
        })

      const result = await accountabilityAuditEngine.runFullAudit('case-123', [
        { institution: 'LA', institutionType: 'local_authority', documentIds: ['doc-1'] },
        { institution: 'Court', institutionType: 'family_court', documentIds: ['doc-2'] },
      ])

      expect(result.matrices).toHaveLength(2)
      expect(result.summary.totalInstitutions).toBe(2)
      expect(result.summary.totalBreaches).toBe(2)
      expect(result.methodology).toContain('Accountability Audit Engine')
    })

    it('should generate priority actions for critical breaches', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = { id: 'doc-123', content: '', type: 'report', name: 'Report' }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        .mockResolvedValueOnce({
          breaches: [
            {
              dutyId: 'd1',
              dutySection: 's.1',
              dutyTitle: 'Critical Duty',
              breachType: 'failure_to_act',
              severity: 'critical',
              description: 'Critical breach',
              evidence: { quotedText: 'Q' },
              impact: 'Severe',
              remedyAvailable: true,
            },
          ],
          institutionAssessment: {
            overallCompliance: 'non-compliant',
            systematicIssues: true,
            commonFactors: [],
          },
        })
        .mockResolvedValueOnce({
          cascadeIdentified: false,
          propagationPath: [],
          amplificationFactors: [],
          conclusion: 'No cascade',
        })
        .mockResolvedValue({
          remedies: [
            {
              type: 'complaint',
              body: 'LGSCO',
              procedure: 'Online',
              limitation: '12m',
              likelihood: 'high',
            },
          ],
          recommendedAction: 'Urgent LGSCO complaint',
          timeframe: 'Immediate',
          precedents: [],
        })

      const result = await accountabilityAuditEngine.runFullAudit('case-123', [
        { institution: 'LA', institutionType: 'local_authority', documentIds: ['doc-1'] },
      ])

      expect(result.summary.criticalBreaches).toBe(1)
      expect(result.summary.priorityActions.length).toBeGreaterThan(0)
    })
  })

  describe('generateReport', () => {
    it('should generate markdown report', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockResult = {
        caseId: 'case-123',
        matrices: [
          {
            caseId: 'case-123',
            institution: 'Test LA',
            institutionType: 'local_authority' as const,
            breaches: [
              {
                id: 'b1',
                duty: {
                  id: 'ca1989_s47',
                  framework: 'children_act_1989' as const,
                  section: 's.47',
                  title: 'Duty to Investigate',
                  description: 'Test',
                  dutyType: 'mandatory' as const,
                  applicableTo: ['local_authority' as const],
                  triggers: [],
                  requirements: [],
                  remedies: [],
                },
                institution: 'Test LA',
                institutionType: 'local_authority' as const,
                breachType: 'failure_to_act' as const,
                severity: 'critical' as const,
                description: 'Failed to investigate',
                evidence: [],
                impact: 'Welfare compromised',
                remedyAvailable: true,
                suggestedRemedy: 'LGSCO complaint',
              },
            ],
            byFramework: {} as any,
            bySeverity: { critical: 1, high: 0, medium: 0, low: 0 },
            totalBreaches: 1,
            criticalBreaches: 1,
            unremediedBreaches: 0,
            patternAnalysis: {
              systematicFailure: true,
              affectedDuties: ['s.47'],
              commonFactors: ['Procedural failures'],
              cascadeEffect: false,
              conclusion: 'Systematic failure identified',
            },
          },
        ],
        allBreaches: [],
        remedyMaps: [],
        summary: {
          totalInstitutions: 1,
          totalBreaches: 1,
          criticalBreaches: 1,
          systemicPattern: true,
          primaryFrameworksBreach: ['children_act_1989' as const],
          priorityActions: ['File LGSCO complaint'],
        },
        methodology: 'Test methodology',
      }

      const report = accountabilityAuditEngine.generateReport(mockResult)

      expect(report).toContain('# ACCOUNTABILITY AUDIT REPORT')
      expect(report).toContain('case-123')
      expect(report).toContain('Test LA')
      expect(report).toContain('s.47')
      expect(report).toContain('Systemic Pattern:** YES')
      expect(report).toContain('Priority Actions')
    })
  })

  describe('Database Storage', () => {
    it('should store critical breaches as findings', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockInsert = jest.fn().mockResolvedValue({ data: null, error: null })
      const mockDoc = { id: 'doc-123', content: '', type: 'report', name: 'Report' }

      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: mockInsert,
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON
        .mockResolvedValueOnce({
          breaches: [
            {
              dutyId: 'd1',
              dutySection: 's.1',
              dutyTitle: 'T1',
              breachType: 'failure_to_act',
              severity: 'critical',
              description: 'Critical',
              evidence: { quotedText: 'Q' },
              impact: 'Severe',
              remedyAvailable: true,
            },
          ],
          institutionAssessment: {
            overallCompliance: 'non-compliant',
            systematicIssues: true,
            commonFactors: [],
          },
        })
        .mockResolvedValueOnce({
          cascadeIdentified: false,
          propagationPath: [],
          amplificationFactors: [],
          conclusion: '',
        })
        .mockResolvedValue({
          remedies: [],
          recommendedAction: '',
          timeframe: '',
          precedents: [],
        })

      await accountabilityAuditEngine.runFullAudit('case-123', [
        { institution: 'LA', institutionType: 'local_authority', documentIds: ['doc-1'] },
      ])

      expect(mockSupabaseFrom).toHaveBeenCalledWith('findings')
    })

    it('should skip storage in mock mode', async () => {
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://placeholder.supabase.co'

      jest.resetModules()

      const mockInsert = jest.fn()
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: {}, error: null }),
        insert: mockInsert,
      }

      jest.mock('@/lib/supabase/server', () => ({
        supabaseAdmin: {
          from: () => mockChain,
        },
      }))

      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      await accountabilityAuditEngine.runFullAudit('case-123', [
        { institution: 'LA', institutionType: 'local_authority', documentIds: ['doc-1'] },
      ])

      // In mock mode, insert should not be called on findings
      expect(mockInsert).not.toHaveBeenCalled()
    })
  })

  describe('Breach Types', () => {
    it('should handle failure_to_act breach type', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = { id: 'doc-123', content: '', type: 'report', name: 'Report' }
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        breaches: [
          {
            dutyId: 'd1',
            dutySection: 's.47',
            dutyTitle: 'Investigation',
            breachType: 'failure_to_act',
            severity: 'critical',
            description: 'No investigation',
            evidence: { quotedText: 'Q' },
            impact: 'I',
            remedyAvailable: true,
          },
        ],
        institutionAssessment: {
          overallCompliance: 'non-compliant',
          systematicIssues: false,
          commonFactors: [],
        },
      })

      const breaches = await accountabilityAuditEngine.analyzeDocument(
        'doc-1',
        'case-1',
        'LA',
        'local_authority'
      )

      expect(breaches[0].breachType).toBe('failure_to_act')
    })

    it('should handle procedural_error breach type', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = { id: 'doc-123', content: '', type: 'report', name: 'Report' }
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        breaches: [
          {
            dutyId: 'd1',
            dutySection: 'r.4.1',
            dutyTitle: 'Procedure',
            breachType: 'procedural_error',
            severity: 'medium',
            description: 'Wrong procedure',
            evidence: { quotedText: 'Q' },
            impact: 'I',
            remedyAvailable: true,
          },
        ],
        institutionAssessment: {
          overallCompliance: 'partial',
          systematicIssues: false,
          commonFactors: [],
        },
      })

      const breaches = await accountabilityAuditEngine.analyzeDocument(
        'doc-1',
        'case-1',
        'Court',
        'family_court'
      )

      expect(breaches[0].breachType).toBe('procedural_error')
    })

    it('should handle misdirection breach type', async () => {
      const { accountabilityAuditEngine } = await import('@/lib/engines/accountability-audit')

      const mockDoc = { id: 'doc-123', content: '', type: 'judgment', name: 'Judgment' }
      const mockChain = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
        single: jest.fn().mockResolvedValue({ data: mockDoc, error: null }),
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      }
      mockSupabaseFrom.mockReturnValue(mockChain)

      mockGenerateJSON.mockResolvedValue({
        breaches: [
          {
            dutyId: 'd1',
            dutySection: 's.31(2)',
            dutyTitle: 'Threshold',
            breachType: 'misdirection',
            severity: 'high',
            description: 'Wrong test applied',
            evidence: { quotedText: 'Q' },
            impact: 'I',
            remedyAvailable: true,
          },
        ],
        institutionAssessment: {
          overallCompliance: 'partial',
          systematicIssues: false,
          commonFactors: [],
        },
      })

      const breaches = await accountabilityAuditEngine.analyzeDocument(
        'doc-1',
        'case-1',
        'Court',
        'family_court'
      )

      expect(breaches[0].breachType).toBe('misdirection')
    })
  })
})
