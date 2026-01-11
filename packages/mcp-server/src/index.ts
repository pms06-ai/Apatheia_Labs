#!/usr/bin/env node
/**
 * Phronesis Analysis MCP Server
 *
 * Exposes all analytical engines via MCP protocol + optional HTTP API
 *
 * Usage:
 *   npx phronesis-mcp --db /path/to/phronesis.db
 *   npx phronesis-mcp --db /path/to/phronesis.db --http --port 3847
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  type Tool,
} from '@modelcontextprotocol/sdk/types.js'
import { z } from 'zod'
import { initDatabase, closeDatabase } from './db/connection.js'
import { analyzeContradictions } from './tools/contradiction.js'
import { analyzeOmissions } from './tools/omission.js'
import { analyzeBias } from './tools/bias.js'
import { analyzeEntities } from './tools/entity.js'
import { analyzeTimeline } from './tools/timeline.js'
import { analyzeArgumentation } from './tools/argumentation.js'
import { analyzeAccountability } from './tools/accountability.js'
import { analyzeProfessional } from './tools/professional.js'
import { analyzeExpertWitness } from './tools/expert-witness.js'
import { analyzeDocumentary } from './tools/documentary.js'
import { analyzeNarrative } from './tools/narrative.js'
import { analyzeCoordination } from './tools/coordination.js'
import { runSAMPipeline } from './tools/sam-pipeline.js'
import type { CascadeType } from './types/index.js'

// ═══════════════════════════════════════════════════════════════════════════
// Tool Definitions
// ═══════════════════════════════════════════════════════════════════════════

const TOOLS: Tool[] = [
  {
    name: 'analyze_contradictions',
    description: 'Detect contradictions using 8-type CASCADE methodology. Finds direct, implicit, temporal, and other inconsistencies across documents.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'IDs of documents to analyze for contradictions',
        },
        cascade_types: {
          type: 'array',
          items: {
            type: 'string',
            enum: ['SELF', 'INTER_DOC', 'TEMPORAL', 'EVIDENTIARY', 'MODALITY_SHIFT', 'SELECTIVE_CITATION', 'SCOPE_SHIFT', 'UNEXPLAINED_CHANGE'],
          },
          description: 'Optional: Filter by specific CASCADE contradiction types',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_omissions',
    description: 'Detect what was selectively omitted from target documents compared to source documents. Calculates bias direction.',
    inputSchema: {
      type: 'object',
      properties: {
        source_document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Source documents (original/complete)',
        },
        target_document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Target documents (derived/summary)',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['source_document_ids', 'target_document_ids'],
    },
  },
  {
    name: 'analyze_bias',
    description: 'Statistical bias analysis including framing ratio, effect size, and significance testing.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to analyze for bias',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_entities',
    description: 'Entity resolution: identify and canonicalize people, organizations, and locations across documents.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to extract entities from',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_timeline',
    description: 'Temporal reconstruction: build timeline, detect gaps, and find temporal anomalies.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to extract timeline events from',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_argumentation',
    description: 'Toulmin structure analysis: extract claims, evidence, warrants, and argument chains.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to analyze for arguments',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_accountability',
    description: 'Map statutory duties, identify breaches, and recommend remedies.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to analyze for duty breaches',
        },
        institution: {
          type: 'string',
          description: 'Institution name to audit',
        },
        institution_type: {
          type: 'string',
          enum: ['local_authority', 'police', 'nhs', 'court', 'media', 'regulator'],
          description: 'Type of institution',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids', 'institution'],
    },
  },
  {
    name: 'analyze_professional',
    description: 'Track professional conduct incidents across documents by individual.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to analyze for professional conduct',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_expert_witness',
    description: 'Evaluate expert witness reports for FJC compliance, scope issues, and methodology problems.',
    inputSchema: {
      type: 'object',
      properties: {
        report_document_id: {
          type: 'string',
          description: 'Expert witness report document ID',
        },
        instruction_document_id: {
          type: 'string',
          description: 'Optional: Letter of instruction document ID',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['report_document_id'],
    },
  },
  {
    name: 'analyze_documentary',
    description: 'Compare broadcast/published content against source material for bias and distortion.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to analyze (broadcast transcripts, source materials)',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_narrative',
    description: 'Track how claims mutate and evolve across documents over time.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to track narrative evolution',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'analyze_coordination',
    description: 'Detect hidden coordination between supposedly independent institutions.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to analyze for coordination patterns',
        },
        case_id: {
          type: 'string',
          description: 'Optional: Case ID for storing findings',
        },
      },
      required: ['document_ids'],
    },
  },
  {
    name: 'run_sam_pipeline',
    description: 'Run full S.A.M. (Systematic Adversarial Methodology) pipeline: ANCHOR → INHERIT → COMPOUND → ARRIVE.',
    inputSchema: {
      type: 'object',
      properties: {
        document_ids: {
          type: 'array',
          items: { type: 'string' },
          description: 'Documents to run through S.A.M. pipeline',
        },
        case_id: {
          type: 'string',
          description: 'Case ID (required for S.A.M.)',
        },
        start_phase: {
          type: 'string',
          enum: ['anchor', 'inherit', 'compound', 'arrive'],
          description: 'Optional: Resume from specific phase',
        },
      },
      required: ['document_ids', 'case_id'],
    },
  },
]

// ═══════════════════════════════════════════════════════════════════════════
// Input Schemas for Validation
// ═══════════════════════════════════════════════════════════════════════════

const ContradictionInputSchema = z.object({
  document_ids: z.array(z.string()),
  cascade_types: z.array(z.enum([
    'SELF', 'INTER_DOC', 'TEMPORAL', 'EVIDENTIARY',
    'MODALITY_SHIFT', 'SELECTIVE_CITATION', 'SCOPE_SHIFT', 'UNEXPLAINED_CHANGE',
  ])).optional(),
  case_id: z.string().optional(),
})

const OmissionInputSchema = z.object({
  source_document_ids: z.array(z.string()),
  target_document_ids: z.array(z.string()),
  case_id: z.string().optional(),
})

const DocumentIdsInputSchema = z.object({
  document_ids: z.array(z.string()),
  case_id: z.string().optional(),
})

const AccountabilityInputSchema = z.object({
  document_ids: z.array(z.string()),
  institution: z.string(),
  institution_type: z.enum(['local_authority', 'police', 'nhs', 'court', 'media', 'regulator']).optional(),
  case_id: z.string().optional(),
})

const ExpertWitnessInputSchema = z.object({
  report_document_id: z.string(),
  instruction_document_id: z.string().optional(),
  case_id: z.string().optional(),
})

const SAMPipelineInputSchema = z.object({
  document_ids: z.array(z.string()),
  case_id: z.string(),
  start_phase: z.enum(['anchor', 'inherit', 'compound', 'arrive']).optional(),
})

// ═══════════════════════════════════════════════════════════════════════════
// Server Setup
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  // Parse CLI arguments
  const args = process.argv.slice(2)
  let dbPath = ''
  let httpMode = false
  let httpPort = 3847

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--db' && args[i + 1]) {
      dbPath = args[++i]
    } else if (args[i] === '--http') {
      httpMode = true
    } else if (args[i] === '--port' && args[i + 1]) {
      httpPort = parseInt(args[++i], 10)
    }
  }

  if (!dbPath) {
    // Default path for Windows
    dbPath = process.env.PHRONESIS_DB ||
      'C:\\Users\\pstep\\AppData\\Roaming\\com.apatheia.phronesis\\phronesis.db'
  }

  // Initialize database
  initDatabase(dbPath)
  console.error(`[phronesis-mcp] Database initialized: ${dbPath}`)

  if (httpMode) {
    // HTTP mode - start Express server
    const { startHttpServer } = await import('./http-server.js')
    await startHttpServer(httpPort)
    console.error(`[phronesis-mcp] HTTP server running on http://localhost:${httpPort}`)
  } else {
    // MCP mode - start stdio server
    const server = new Server(
      {
        name: 'phronesis-analysis',
        version: '0.1.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    )

    // List tools handler
    server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: TOOLS,
    }))

    // Call tool handler
    server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params

      try {
        let result: unknown

        switch (name) {
          case 'analyze_contradictions': {
            const input = ContradictionInputSchema.parse(args)
            result = await analyzeContradictions(
              input.document_ids,
              input.cascade_types as CascadeType[] | undefined,
              input.case_id
            )
            break
          }

          case 'analyze_omissions': {
            const input = OmissionInputSchema.parse(args)
            result = await analyzeOmissions(
              input.source_document_ids,
              input.target_document_ids,
              input.case_id
            )
            break
          }

          case 'analyze_bias': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeBias(input.document_ids, input.case_id)
            break
          }

          case 'analyze_entities': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeEntities(input.document_ids, input.case_id)
            break
          }

          case 'analyze_timeline': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeTimeline(input.document_ids, input.case_id)
            break
          }

          case 'analyze_argumentation': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeArgumentation(input.document_ids, input.case_id)
            break
          }

          case 'analyze_accountability': {
            const input = AccountabilityInputSchema.parse(args)
            result = await analyzeAccountability(
              input.document_ids,
              input.institution,
              input.institution_type,
              input.case_id
            )
            break
          }

          case 'analyze_professional': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeProfessional(input.document_ids, input.case_id)
            break
          }

          case 'analyze_expert_witness': {
            const input = ExpertWitnessInputSchema.parse(args)
            result = await analyzeExpertWitness(
              input.report_document_id,
              input.instruction_document_id,
              input.case_id
            )
            break
          }

          case 'analyze_documentary': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeDocumentary(input.document_ids, input.case_id)
            break
          }

          case 'analyze_narrative': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeNarrative(input.document_ids, input.case_id)
            break
          }

          case 'analyze_coordination': {
            const input = DocumentIdsInputSchema.parse(args)
            result = await analyzeCoordination(input.document_ids, input.case_id)
            break
          }

          case 'run_sam_pipeline': {
            const input = SAMPipelineInputSchema.parse(args)
            result = await runSAMPipeline(
              input.document_ids,
              input.case_id,
              input.start_phase
            )
            break
          }

          default:
            throw new Error(`Unknown tool: ${name}`)
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(result, null, 2),
            },
          ],
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error)
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: errorMessage }, null, 2),
            },
          ],
          isError: true,
        }
      }
    })

    // Handle shutdown
    process.on('SIGINT', () => {
      closeDatabase()
      process.exit(0)
    })

    process.on('SIGTERM', () => {
      closeDatabase()
      process.exit(0)
    })

    // Start server
    const transport = new StdioServerTransport()
    await server.connect(transport)
    console.error('[phronesis-mcp] MCP server running on stdio')
  }
}

main().catch((error) => {
  console.error('[phronesis-mcp] Fatal error:', error)
  process.exit(1)
})
