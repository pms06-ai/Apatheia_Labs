/**
 * Phronesis API Client
 *
 * Communicates with the Phronesis MCP HTTP server
 */

import { requestUrl, RequestUrlParam } from 'obsidian'
import type {
  ContradictionResult,
  OmissionResult,
  BiasResult,
  EntityResult,
  TimelineResult,
  SAMResult,
  CascadeType,
} from '../types'

export interface PhronesisApiConfig {
  endpoint: string
  timeout: number
}

export interface AnalysisRequest {
  document_ids?: string[]
  case_id?: string
  content?: string
  [key: string]: unknown
}

export interface AnalysisResponse<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

export class PhronesisApiClient {
  private endpoint: string
  private timeout: number

  constructor(config: PhronesisApiConfig) {
    this.endpoint = config.endpoint.replace(/\/$/, '')
    this.timeout = config.timeout
  }

  /**
   * Check if server is available
   */
  async checkStatus(): Promise<boolean> {
    try {
      const response = await this.request<{ status: string }>('GET', '/api/status')
      return response?.status === 'ok'
    } catch {
      return false
    }
  }

  /**
   * Get list of available engines
   */
  async getEngines(): Promise<{ id: string; name: string; symbol: string }[]> {
    const response = await this.request<{ engines: { id: string; name: string; symbol: string }[] }>('GET', '/api/engines')
    return response?.engines || []
  }

  /**
   * Analyze content for contradictions
   */
  async analyzeContradictions(
    content?: string,
    documentIds?: string[],
    caseId?: string,
    cascadeTypes?: CascadeType[]
  ): Promise<ContradictionResult> {
    return this.analyze<ContradictionResult>('contradictions', {
      content,
      document_ids: documentIds,
      case_id: caseId,
      cascade_types: cascadeTypes,
    })
  }

  /**
   * Analyze for omissions
   */
  async analyzeOmissions(
    content?: string,
    sourceDocIds?: string[],
    targetDocIds?: string[],
    caseId?: string
  ): Promise<OmissionResult> {
    return this.analyze<OmissionResult>('omissions', {
      content,
      source_document_ids: sourceDocIds,
      target_document_ids: targetDocIds,
      case_id: caseId,
    })
  }

  /**
   * Analyze for bias
   */
  async analyzeBias(
    content?: string,
    documentIds?: string[],
    caseId?: string
  ): Promise<BiasResult> {
    return this.analyze<BiasResult>('bias', {
      content,
      document_ids: documentIds,
      case_id: caseId,
    })
  }

  /**
   * Entity resolution
   */
  async analyzeEntities(
    content?: string,
    documentIds?: string[],
    caseId?: string
  ): Promise<EntityResult> {
    return this.analyze<EntityResult>('entities', {
      content,
      document_ids: documentIds,
      case_id: caseId,
    })
  }

  /**
   * Timeline analysis
   */
  async analyzeTimeline(
    content?: string,
    documentIds?: string[],
    caseId?: string
  ): Promise<TimelineResult> {
    return this.analyze<TimelineResult>('timeline', {
      content,
      document_ids: documentIds,
      case_id: caseId,
    })
  }

  /**
   * Run S.A.M. pipeline
   */
  async runSAMPipeline(
    caseId: string,
    content?: string,
    documentIds?: string[],
    startPhase?: string
  ): Promise<SAMResult> {
    return this.analyze<SAMResult>('sam', {
      content,
      document_ids: documentIds,
      case_id: caseId,
      start_phase: startPhase,
    })
  }

  /**
   * Analyze content with any engine
   */
  async analyzeContent<T = unknown>(
    engine: string,
    content: string,
    caseId?: string
  ): Promise<T> {
    return this.analyze<T>(engine, { content, case_id: caseId })
  }

  /**
   * Generic analysis endpoint
   */
  async analyze<T = unknown>(engine: string, params: AnalysisRequest): Promise<T> {
    return this.request<T>('POST', `/api/analyze/${engine}`, params)
  }

  /**
   * Make HTTP request
   */
  private async request<T>(method: 'GET' | 'POST', path: string, body?: unknown): Promise<T> {
    const url = `${this.endpoint}${path}`

    const options: RequestUrlParam = {
      url,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (body) {
      options.body = JSON.stringify(body)
    }

    try {
      const response = await requestUrl(options)

      if (response.status >= 400) {
        const error = response.json?.error || `HTTP ${response.status}`
        throw new Error(error)
      }

      return response.json as T
    } catch (error) {
      if (error instanceof Error) {
        throw error
      }
      throw new Error(`Request failed: ${String(error)}`)
    }
  }
}
