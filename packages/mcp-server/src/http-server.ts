/**
 * HTTP API Server for Phronesis
 *
 * Provides REST API for Obsidian plugin and other clients
 */

import express, { type Request, type Response, type NextFunction } from 'express'
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

const app = express()
app.use(express.json({ limit: '10mb' }))

// CORS for Obsidian plugin
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Origin', '*')
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization')

  if (req.method === 'OPTIONS') {
    res.sendStatus(200)
    return
  }

  next()
})

// Health check
app.get('/api/status', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    version: '0.1.0',
    engines: [
      'contradiction', 'omission', 'bias', 'entity', 'timeline',
      'argumentation', 'accountability', 'professional', 'expert_witness',
      'documentary', 'narrative', 'coordination', 'sam_pipeline',
    ],
  })
})

// List available engines
app.get('/api/engines', (req: Request, res: Response) => {
  res.json({
    engines: [
      { id: 'contradiction', name: 'Contradiction Detection', symbol: 'Κ' },
      { id: 'omission', name: 'Omission Detection', symbol: 'Ο' },
      { id: 'bias', name: 'Bias Analysis', symbol: 'Β' },
      { id: 'entity', name: 'Entity Resolution', symbol: 'Ε' },
      { id: 'timeline', name: 'Timeline Analysis', symbol: 'Τ' },
      { id: 'argumentation', name: 'Argumentation Analysis', symbol: 'Α' },
      { id: 'accountability', name: 'Accountability Audit', symbol: 'Λ' },
      { id: 'professional', name: 'Professional Tracker', symbol: 'Π' },
      { id: 'expert_witness', name: 'Expert Witness Analysis', symbol: 'Ξ' },
      { id: 'documentary', name: 'Documentary Analysis', symbol: 'Δ' },
      { id: 'narrative', name: 'Narrative Evolution', symbol: 'Μ' },
      { id: 'coordination', name: 'Coordination Detection', symbol: 'Σ' },
      { id: 'sam_pipeline', name: 'S.A.M. Pipeline', symbol: 'SAM' },
    ],
  })
})

// Analysis endpoints

app.post('/api/analyze/contradictions', async (req: Request, res: Response) => {
  try {
    const { document_ids, cascade_types, case_id } = req.body
    const result = await analyzeContradictions(
      document_ids,
      cascade_types as CascadeType[] | undefined,
      case_id
    )
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/omissions', async (req: Request, res: Response) => {
  try {
    const { source_document_ids, target_document_ids, case_id } = req.body
    const result = await analyzeOmissions(source_document_ids, target_document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/bias', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeBias(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/entities', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeEntities(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/timeline', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeTimeline(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/argumentation', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeArgumentation(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/accountability', async (req: Request, res: Response) => {
  try {
    const { document_ids, institution, institution_type, case_id } = req.body
    const result = await analyzeAccountability(document_ids, institution, institution_type, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/professional', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeProfessional(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/expert-witness', async (req: Request, res: Response) => {
  try {
    const { report_document_id, instruction_document_id, case_id } = req.body
    const result = await analyzeExpertWitness(report_document_id, instruction_document_id, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/documentary', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeDocumentary(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/narrative', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeNarrative(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/coordination', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id } = req.body
    const result = await analyzeCoordination(document_ids, case_id)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

app.post('/api/analyze/sam', async (req: Request, res: Response) => {
  try {
    const { document_ids, case_id, start_phase } = req.body
    if (!case_id) {
      res.status(400).json({ error: 'case_id is required for S.A.M. pipeline' })
      return
    }
    const result = await runSAMPipeline(document_ids, case_id, start_phase)
    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

// Generic analyze endpoint
app.post('/api/analyze/:engine', async (req: Request, res: Response) => {
  const { engine } = req.params
  const { document_ids, content, case_id, ...options } = req.body

  try {
    let result: unknown

    switch (engine) {
      case 'contradiction':
      case 'contradictions':
        result = await analyzeContradictions(document_ids, options.cascade_types, case_id, content)
        break
      case 'omission':
      case 'omissions':
        result = await analyzeOmissions(options.source_document_ids || document_ids, options.target_document_ids || [], case_id, content)
        break
      case 'bias':
        result = await analyzeBias(document_ids, case_id, content)
        break
      case 'entity':
      case 'entities':
        result = await analyzeEntities(document_ids, case_id, content)
        break
      case 'timeline':
        result = await analyzeTimeline(document_ids, case_id, content)
        break
      case 'argumentation':
        result = await analyzeArgumentation(document_ids, case_id, content)
        break
      case 'accountability':
        result = await analyzeAccountability(document_ids, options.institution || 'Unknown', options.institution_type, case_id, content)
        break
      case 'professional':
        result = await analyzeProfessional(document_ids, case_id, content)
        break
      case 'expert_witness':
      case 'expert-witness':
        result = await analyzeExpertWitness(document_ids?.[0], document_ids?.[1], case_id, content)
        break
      case 'documentary':
        result = await analyzeDocumentary(document_ids, case_id, content)
        break
      case 'narrative':
        result = await analyzeNarrative(document_ids, case_id, content)
        break
      case 'coordination':
        result = await analyzeCoordination(document_ids, case_id, content)
        break
      case 'sam':
      case 'sam_pipeline':
        if (!case_id) {
          res.status(400).json({ error: 'case_id is required for S.A.M. pipeline' })
          return
        }
        result = await runSAMPipeline(document_ids, case_id, options.start_phase)
        break
      default:
        res.status(404).json({ error: `Unknown engine: ${engine}` })
        return
    }

    res.json(result)
  } catch (error) {
    res.status(500).json({ error: (error as Error).message })
  }
})

export async function startHttpServer(port: number): Promise<void> {
  return new Promise((resolve) => {
    app.listen(port, () => {
      console.error(`[phronesis-http] Server listening on http://localhost:${port}`)
      resolve()
    })
  })
}

export { app }
