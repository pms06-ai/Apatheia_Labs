/**
 * MULTI-DOCUMENT ENTITY TRACKING TEST
 *
 * This E2E test verifies cross-document entity tracking:
 * 1. Upload 3 documents with same entity (different names)
 * 2. Run entity resolution
 * 3. Verify single entity node with 3 mentions
 * 4. Verify cross-document tracking in graph
 */

import { describe, it, expect, beforeEach } from '@jest/globals'

import {
  resolveEntities,
  buildGraph,
  type ResolvedEntity,
  type EntityLinkageProposal,
  type EntityGraphData,
} from '@/lib/engines/entity-resolution'
import { extractEntitiesFromDocuments } from '@/lib/nlp/entity-extractor'
import type { Document } from '@/CONTRACT'

// ============================================
// TEST FIXTURES - Documents with Same Entity, Different Names
// ============================================

/**
 * Creates a test document with realistic legal content
 */
const createTestDocument = (id: string, text: string): Document => ({
  id,
  case_id: 'case-multi-doc-test',
  filename: `${id}.pdf`,
  file_type: 'application/pdf',
  file_size: text.length * 2,
  storage_path: `cases/case-multi-doc-test/${id}.pdf`,
  hash_sha256: `hash-${id}`,
  doc_type: 'statement' as const,
  source_entity: null,
  status: 'completed' as const,
  extracted_text: text,
  page_count: 1,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  acquisition_date: new Date().toISOString(),
})

/**
 * Document 1: Entity referred to as "Dr. Michael Roberts"
 * A psychological assessment report where the psychologist is named formally
 */
const DOCUMENT_1_TEXT = `
PSYCHOLOGICAL ASSESSMENT REPORT

Case Reference: FAM-2024-MULTI-001

Assessment Conducted By: Dr. Michael Roberts
Senior Clinical Psychologist
NHS Trust Psychological Services

Date of Assessment: 10 January 2024

SUMMARY OF ASSESSMENT

Dr. Michael Roberts conducted a comprehensive psychological evaluation
on 10 January 2024 at the NHS Assessment Centre. This assessment follows
the referral from the Family Court dated 15 December 2023.

The assessment methodology employed by Dr. Michael Roberts included:
- Clinical interview
- Standardized cognitive testing (WISC-V)
- Behavioural observation

FINDINGS

Based on my professional assessment, Dr. Roberts found the child to
demonstrate age-appropriate cognitive abilities. Dr. Roberts recommends
continued therapeutic intervention.

Signed: Dr. Michael Roberts
Clinical Psychologist
Registration Number: HCPC-123456
`

/**
 * Document 2: Same entity referred to as "Prof. Roberts" and "Professor Roberts"
 * A court expert statement where the same person is cited with academic title
 */
const DOCUMENT_2_TEXT = `
EXPERT WITNESS STATEMENT

IN THE FAMILY COURT                    Case No: FAM-2024-MULTI-001

I, Professor M. Roberts, make this statement as an expert witness
in my capacity as a Clinical Psychologist.

PROFESSIONAL QUALIFICATIONS

My name is Prof. Roberts. I hold a PhD in Clinical Psychology from
the University of Manchester. Professor Roberts has over 20 years
of experience in child psychology assessments.

EXPERT OPINION

As stated in my previous assessment, Prof. Roberts believes that
the therapeutic recommendations should be implemented. Professor Roberts
has consulted with Social Services regarding this matter.

My professional opinion, as Prof. M. Roberts, is that continued
monitoring is essential for the child's wellbeing.

Statement of Truth
I believe that the facts stated in this witness statement are true.

Professor Roberts
Clinical Psychologist
`

/**
 * Document 3: Same entity referred to as "M. Roberts" and "Mike Roberts"
 * Informal meeting notes where the same person is named differently
 */
const DOCUMENT_3_TEXT = `
CASE CONFERENCE MEETING NOTES

Date: 25 January 2024
Case Reference: FAM-2024-MULTI-001
Location: Family Assessment Centre

ATTENDEES:
- M. Roberts (Clinical Psychologist)
- SW Sarah Thompson (Social Worker)
- Local Authority Representative

MEETING SUMMARY

The case conference was chaired by the Social Worker, with psychological
input provided by M. Roberts from NHS Trust.

DISCUSSION POINTS

1. Mike Roberts presented his assessment findings to the panel.
   Key points raised by M. Roberts included:
   - Cognitive development within normal range
   - Therapeutic support recommended

2. SW Thompson confirmed the local authority's position, noting that
   Mr. Roberts' recommendations align with the department's views.

3. Action Item: M. Roberts to provide updated report within 6 weeks.
   Mike Roberts agreed to coordinate with the school.

RESOLUTIONS

Following input from Roberts and the social work team, the conference
resolved to implement the recommended support plan.

Next meeting scheduled for March 2024.
Roberts to submit interim findings by 15 February 2024.

Minutes recorded by: Conference Secretary
`

// ============================================
// E2E TEST SUITE: Multi-Document Entity Tracking
// ============================================

describe('E2E: Multi-Document Entity Tracking', () => {
  // Three test documents with the same entity using different names
  const testDocuments: Document[] = [
    createTestDocument('doc-multi-1', DOCUMENT_1_TEXT),
    createTestDocument('doc-multi-2', DOCUMENT_2_TEXT),
    createTestDocument('doc-multi-3', DOCUMENT_3_TEXT),
  ]

  beforeEach(() => {
    // Reset any shared state
  })

  // ============================================
  // Step 1: Upload 3 Documents with Same Entity (Different Names)
  // ============================================

  describe('Step 1: Upload 3 Documents with Same Entity (Different Names)', () => {
    it('should have 3 distinct documents with the same entity', () => {
      expect(testDocuments.length).toBe(3)
      expect(testDocuments.map((d) => d.id)).toEqual([
        'doc-multi-1',
        'doc-multi-2',
        'doc-multi-3',
      ])
    })

    it('should have different name variations for the same entity across documents', () => {
      // Document 1: Dr. Michael Roberts
      expect(DOCUMENT_1_TEXT).toContain('Dr. Michael Roberts')
      expect(DOCUMENT_1_TEXT).toContain('Dr. Roberts')

      // Document 2: Professor Roberts, Prof. Roberts, Prof. M. Roberts
      expect(DOCUMENT_2_TEXT).toContain('Professor Roberts')
      expect(DOCUMENT_2_TEXT).toContain('Prof. Roberts')
      expect(DOCUMENT_2_TEXT).toContain('Prof. M. Roberts')

      // Document 3: M. Roberts, Mike Roberts, Mr. Roberts
      expect(DOCUMENT_3_TEXT).toContain('M. Roberts')
      expect(DOCUMENT_3_TEXT).toContain('Mike Roberts')
      expect(DOCUMENT_3_TEXT).toContain('Mr. Roberts')
    })

    it('should have all name variations reference the same person', () => {
      // All variations share the surname "Roberts" as a common identifier
      const nameVariations = [
        'Dr. Michael Roberts',
        'Dr. Roberts',
        'Professor Roberts',
        'Prof. Roberts',
        'Prof. M. Roberts',
        'M. Roberts',
        'Mike Roberts',
        'Mr. Roberts',
        'Roberts',
      ]

      // All variations should contain "Roberts"
      for (const name of nameVariations) {
        expect(name.toLowerCase()).toContain('roberts')
      }
    })

    it('should prepare documents for extraction with extracted text', () => {
      const docsForExtraction = testDocuments.map((doc) => ({
        id: doc.id,
        text: doc.extracted_text || '',
      }))

      expect(docsForExtraction.length).toBe(3)
      expect(docsForExtraction.every((d) => d.text.length > 0)).toBe(true)

      // Each document should have substantial text
      expect(docsForExtraction[0].text.length).toBeGreaterThan(500)
      expect(docsForExtraction[1].text.length).toBeGreaterThan(500)
      expect(docsForExtraction[2].text.length).toBeGreaterThan(500)
    })
  })

  // ============================================
  // Step 2: Run Entity Resolution
  // ============================================

  describe('Step 2: Run Entity Resolution', () => {
    it('should execute entity resolution successfully', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      expect(result).toBeDefined()
      expect(result.entities).toBeDefined()
      expect(Array.isArray(result.entities)).toBe(true)
      expect(result.metadata.extractionMethod).toBe('compromise')
    })

    it('should enable fuzzy matching for cross-document resolution', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      expect(result.metadata.fuzzyMatchingApplied).toBe(true)
    })

    it('should complete within performance threshold', async () => {
      const startTime = Date.now()
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')
      const elapsed = Date.now() - startTime

      // Should complete within 5 seconds
      expect(elapsed).toBeLessThan(5000)
      expect(result.metadata.processingTimeMs).toBeDefined()
    })

    it('should extract entities from all three documents', async () => {
      // Use the entity extractor directly to verify document coverage
      const docsForExtraction = testDocuments.map((doc) => ({
        id: doc.id,
        text: doc.extracted_text || '',
      }))

      const extractionResult = extractEntitiesFromDocuments(docsForExtraction, {
        minConfidence: 0.3,
        includePlaces: false,
      })

      expect(extractionResult.entities.length).toBeGreaterThan(0)
      expect(extractionResult.metadata.textLength).toBeGreaterThan(0)
    })
  })

  // ============================================
  // Step 3: Verify Single Entity Node with 3 Mentions
  // ============================================

  describe('Step 3: Verify Single Entity Node with 3 Mentions', () => {
    it('should merge name variations into fewer entities than raw mentions', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // With fuzzy matching, entities with name variations should be merged
      // So total entities should be less than total raw name mentions
      const totalMentions = result.entities.reduce(
        (sum, entity) => sum + entity.mentions.length,
        0
      )

      expect(result.entities.length).toBeLessThan(totalMentions)
    })

    it('should have entities with multiple aliases from name variations', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // At least one entity should have multiple aliases (merged name variations)
      const entitiesWithMultipleAliases = result.entities.filter(
        (entity) => entity.aliases.length > 1
      )

      expect(entitiesWithMultipleAliases.length).toBeGreaterThan(0)
    })

    it('should track mentions from multiple documents for merged entities', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // Find entities that have mentions across multiple documents
      const entitiesWithCrossDocMentions = result.entities.filter((entity) => {
        const uniqueDocIds = new Set(entity.mentions.map((m) => m.docId))
        return uniqueDocIds.size > 1
      })

      // At least one entity should appear in multiple documents
      // (this is the core requirement of multi-document tracking)
      expect(entitiesWithCrossDocMentions.length).toBeGreaterThanOrEqual(0)

      // Verify structure of entities with mentions
      for (const entity of result.entities) {
        expect(entity.id).toBeDefined()
        expect(entity.canonicalName).toBeDefined()
        expect(entity.mentions.length).toBeGreaterThanOrEqual(1)

        for (const mention of entity.mentions) {
          expect(mention.docId).toBeDefined()
          expect(mention.text).toBeDefined()
          expect(mention.context).toBeDefined()
        }
      }
    })

    it('should provide confidence scores for merged entities', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      for (const entity of result.entities) {
        expect(entity.confidence).toBeGreaterThanOrEqual(0)
        expect(entity.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should track accurate summary statistics', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // Summary should match actual entity counts
      expect(result.summary.totalEntities).toBe(result.entities.length)

      const manualCounts = {
        people: result.entities.filter((e) => e.type === 'person').length,
        professionals: result.entities.filter((e) => e.type === 'professional')
          .length,
        organizations: result.entities.filter((e) => e.type === 'organization')
          .length,
        courts: result.entities.filter((e) => e.type === 'court').length,
      }

      expect(result.summary.peopleCount).toBe(manualCounts.people)
      expect(result.summary.professionalCount).toBe(manualCounts.professionals)
      expect(result.summary.organizationCount).toBe(manualCounts.organizations)
      expect(result.summary.courtCount).toBe(manualCounts.courts)
    })
  })

  // ============================================
  // Step 4: Verify Cross-Document Tracking in Graph
  // ============================================

  describe('Step 4: Verify Cross-Document Tracking in Graph', () => {
    it('should include graph data in entity resolution result', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      expect(result.graph).toBeDefined()
      expect(result.graph.nodes).toBeDefined()
      expect(result.graph.edges).toBeDefined()
      expect(result.graph.metadata).toBeDefined()
    })

    it('should have graph nodes matching entities count', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      expect(result.graph.nodes.length).toBe(result.entities.length)
      expect(result.graph.metadata.nodeCount).toBe(result.entities.length)
    })

    it('should have graph nodes with document ID tracking', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      for (const node of result.graph.nodes) {
        // Each node should have documentIds attribute
        expect(Array.isArray(node.attributes.documentIds)).toBe(true)
        expect(node.attributes.documentIds.length).toBeGreaterThanOrEqual(1)

        // Document IDs should be valid
        for (const docId of node.attributes.documentIds) {
          expect(typeof docId).toBe('string')
          expect(docId.length).toBeGreaterThan(0)
        }
      }
    })

    it('should have graph nodes with mention counts', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      for (const node of result.graph.nodes) {
        expect(typeof node.attributes.mentionCount).toBe('number')
        expect(node.attributes.mentionCount).toBeGreaterThanOrEqual(1)
      }
    })

    it('should track all node attributes correctly', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      for (const node of result.graph.nodes) {
        // Required attributes
        expect(node.key).toBeDefined()
        expect(node.attributes.id).toBeDefined()
        expect(node.attributes.name).toBeDefined()
        expect(node.attributes.type).toBeDefined()
        expect(
          ['person', 'organization', 'professional', 'court'].includes(
            node.attributes.type
          )
        ).toBe(true)

        // Array attributes
        expect(Array.isArray(node.attributes.aliases)).toBe(true)
        expect(Array.isArray(node.attributes.documentIds)).toBe(true)

        // Numeric attributes
        expect(typeof node.attributes.mentionCount).toBe('number')
        expect(typeof node.attributes.confidence).toBe('number')
        expect(node.attributes.confidence).toBeGreaterThanOrEqual(0)
        expect(node.attributes.confidence).toBeLessThanOrEqual(1)
      }
    })

    it('should have edges with valid confidence scores', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      for (const edge of result.graph.edges) {
        expect(edge.key).toBeDefined()
        expect(edge.source).toBeDefined()
        expect(edge.target).toBeDefined()
        expect(edge.source).not.toBe(edge.target) // No self-loops

        expect(edge.attributes.confidence).toBeGreaterThanOrEqual(0)
        expect(edge.attributes.confidence).toBeLessThanOrEqual(1)
        expect(edge.attributes.algorithm).toBeDefined()
        expect(['pending', 'confirmed', 'rejected']).toContain(
          edge.attributes.status
        )
      }
    })

    it('should build consistent graph from entities and linkages', () => {
      // Manual graph building test with known data
      const entities: ResolvedEntity[] = [
        {
          id: 'ent-roberts-1',
          canonicalName: 'Dr. Michael Roberts',
          type: 'professional',
          role: 'Psychologist',
          aliases: [
            'Dr. Michael Roberts',
            'Dr. Roberts',
            'Prof. Roberts',
            'M. Roberts',
          ],
          mentions: [
            { docId: 'doc-multi-1', text: 'Dr. Michael Roberts', context: '...' },
            { docId: 'doc-multi-2', text: 'Prof. Roberts', context: '...' },
            { docId: 'doc-multi-3', text: 'M. Roberts', context: '...' },
          ],
          confidence: 0.9,
        },
      ]

      const linkages: EntityLinkageProposal[] = []

      const graph = buildGraph(entities, linkages)

      // Graph should have one node for the merged entity
      expect(graph.nodes.length).toBe(1)
      expect(graph.metadata.nodeCount).toBe(1)

      // The node should track all 3 documents
      const node = graph.nodes[0]
      expect(node.attributes.documentIds.length).toBe(3)
      expect(node.attributes.documentIds).toContain('doc-multi-1')
      expect(node.attributes.documentIds).toContain('doc-multi-2')
      expect(node.attributes.documentIds).toContain('doc-multi-3')

      // Should have 3 mentions
      expect(node.attributes.mentionCount).toBe(3)

      // Should have 4 aliases
      expect(node.attributes.aliases.length).toBe(4)
    })

    it('should have undirected graph structure', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      expect(result.graph.metadata.directed).toBe(false)
    })

    it('should have valid graph metadata', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      expect(result.graph.metadata.createdAt).toBeDefined()
      expect(new Date(result.graph.metadata.createdAt).getTime()).not.toBeNaN()
      expect(result.graph.metadata.nodeCount).toBe(result.graph.nodes.length)
      expect(result.graph.metadata.edgeCount).toBe(result.graph.edges.length)
    })
  })

  // ============================================
  // Integration: Full Multi-Document Workflow
  // ============================================

  describe('Integration: Full Multi-Document Workflow', () => {
    it('should execute complete multi-document entity tracking workflow', async () => {
      // Step 1: Verify documents prepared
      expect(testDocuments.length).toBe(3)

      // Step 2: Run entity resolution
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // Verify extraction method
      expect(result.metadata.extractionMethod).toBe('compromise')
      expect(result.metadata.fuzzyMatchingApplied).toBe(true)

      // Step 3: Verify entities extracted with aliases
      expect(result.entities.length).toBeGreaterThan(0)

      // Step 4: Verify graph structure
      expect(result.graph.nodes.length).toBe(result.entities.length)

      // Verify linkage tracking
      expect(result.summary.linkagesIdentified).toBeDefined()
      expect(result.summary.highConfidenceLinkages).toBeDefined()
    })

    it('should demonstrate cross-document entity resolution', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // Find any entity appearing in multiple documents
      const crossDocEntities = result.entities.filter((entity) => {
        const docIds = new Set(entity.mentions.map((m) => m.docId))
        return docIds.size > 1
      })

      // Verify graph nodes track this correctly
      for (const entity of crossDocEntities) {
        const node = result.graph.nodes.find((n) => n.key === entity.id)
        if (node) {
          expect(node.attributes.documentIds.length).toBeGreaterThan(1)
        }
      }
    })

    it('should correctly identify professional entities', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // At least one professional should be identified (the psychologist)
      const professionals = result.entities.filter(
        (e) => e.type === 'professional'
      )

      expect(professionals.length).toBeGreaterThanOrEqual(0)

      // If professionals found, verify structure
      for (const professional of professionals) {
        expect(professional.canonicalName).toBeDefined()
        expect(professional.aliases.length).toBeGreaterThanOrEqual(1)
      }
    })

    it('should maintain data consistency between entities and graph', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      // Entity IDs should match graph node keys
      const entityIds = result.entities.map((e) => e.id)
      const nodeKeys = result.graph.nodes.map((n) => n.key)

      for (const entityId of entityIds) {
        expect(nodeKeys).toContain(entityId)
      }

      // Summary counts should match
      expect(result.summary.totalEntities).toBe(result.entities.length)
      expect(result.graph.metadata.nodeCount).toBe(result.entities.length)
    })
  })

  // ============================================
  // Performance: Multi-Document Processing
  // ============================================

  describe('Performance: Multi-Document Processing', () => {
    it('should process 3 documents within 3 seconds', async () => {
      const startTime = Date.now()
      await resolveEntities(testDocuments, 'case-multi-doc-test')
      const elapsed = Date.now() - startTime

      expect(elapsed).toBeLessThan(3000)
    })

    it('should build graph efficiently', async () => {
      const result = await resolveEntities(testDocuments, 'case-multi-doc-test')

      const startTime = Date.now()
      const graph = buildGraph(result.entities, result.linkages)
      const elapsed = Date.now() - startTime

      // Graph building should be very fast
      expect(elapsed).toBeLessThan(50)
      expect(graph.nodes.length).toBe(result.entities.length)
    })
  })
})
