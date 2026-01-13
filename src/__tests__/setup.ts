/**
 * JEST TEST SETUP
 *
 * Configures the test environment with:
 * - Testing Library matchers
 * - Mock implementations
 * - Global test utilities
 */

import '@testing-library/jest-dom'

// ============================================
// ENVIRONMENT MOCKS
// ============================================

jest.mock('@react-pdf/renderer', () => {
  const pdfBytes = new Uint8Array(15000)
  // "%PDF-" header
  pdfBytes[0] = 0x25
  pdfBytes[1] = 0x50
  pdfBytes[2] = 0x44
  pdfBytes[3] = 0x46
  pdfBytes[4] = 0x2d

  return {
    Document: ({ children }: { children: unknown }) => children,
    Page: ({ children }: { children: unknown }) => children,
    Text: ({ children }: { children: unknown }) => children,
    View: ({ children }: { children: unknown }) => children,
    StyleSheet: { create: () => ({}) },
    Font: { register: () => {} },
    pdf: () => ({
      toBlob: async () => new Blob([pdfBytes], { type: 'application/pdf' }),
    }),
  }
})

// Mock environment variables
process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://test.supabase.co'
process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key'
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key'
process.env.GROQ_API_KEY = 'test-groq-key'
process.env.GOOGLE_AI_API_KEY = 'test-gemini-key'
process.env.R2_ACCESS_KEY_ID = 'test-r2-key'
process.env.R2_SECRET_ACCESS_KEY = 'test-r2-secret'
process.env.R2_BUCKET_NAME = 'test-bucket'
process.env.R2_ENDPOINT = 'https://test.r2.cloudflarestorage.com'

// ============================================
// FETCH MOCK
// ============================================

global.fetch = jest.fn()

beforeEach(() => {
  (global.fetch as jest.Mock).mockReset()
})

// ============================================
// SUPABASE MOCK
// ============================================

const mockSupabaseClient = {
  from: jest.fn(() => ({
    select: jest.fn().mockReturnThis(),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn().mockResolvedValue({ data: [], error: null }),
  })),
  auth: {
    getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
  storage: {
    from: jest.fn(() => ({
      upload: jest.fn().mockResolvedValue({ data: { path: 'test-path' }, error: null }),
      download: jest.fn().mockResolvedValue({ data: new Blob(), error: null }),
      getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
    })),
  },
}

jest.mock('@/lib/supabase/client', () => ({
  createClient: jest.fn(() => mockSupabaseClient),
}))

jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => mockSupabaseClient),
  createServerSupabaseClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
  createServerClient: jest.fn(() => Promise.resolve(mockSupabaseClient)),
  supabaseAdmin: mockSupabaseClient,
}))

// ============================================
// AI SERVICE MOCKS
// ============================================

/**
 * AI Client Mock
 *
 * The engines use generateJSON from @/lib/ai-client, which is the unified
 * AI interface. This is the primary mock needed for engine testing.
 */
jest.mock('@/lib/ai-client', () => ({
  analyze: jest.fn().mockResolvedValue({
    result: { analysis: 'Mock analysis result', mock_data: true },
    model: 'mock-model-v1',
    usage: { input_tokens: 100, output_tokens: 50 },
  }),
  generateJSON: jest.fn().mockResolvedValue({
    // Default mock response - tests can override with mockReturnValueOnce
    omissions: [],
    contradictions: [],
    claimClusters: [],
    systematicPattern: false,
    overallBiasDirection: 'neutral',
  }),
  compareDocuments: jest.fn().mockResolvedValue(
    JSON.stringify({
      contradictions: [],
      omissions: [],
      timeline_issues: [],
      unsupported_claims: [],
      summary: 'Mock comparison summary',
    })
  ),
}))

/**
 * Groq SDK Mock
 *
 * Matches actual exports from @/lib/groq:
 * - groq: Groq client instance
 * - MODELS: Available model constants
 * - analyze: Main analysis function
 * - analyzeStream: Streaming analysis generator
 * - analyzeBatch: Batch analysis function
 */
jest.mock('@/lib/groq', () => ({
  groq: {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: '{"result": "Mock Groq response"}' } }],
          usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
        }),
      },
    },
  },
  MODELS: {
    FAST: 'llama-3.1-8b-instant',
    BALANCED: 'llama-3.1-70b-versatile',
    MIXTRAL: 'mixtral-8x7b-32768',
  },
  analyze: jest.fn().mockResolvedValue({
    result: { entities: [], claims: [] },
    model: 'llama-3.1-70b-versatile',
    usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
  }),
  analyzeStream: jest.fn().mockImplementation(async function* () {
    yield 'Mock '
    yield 'streaming '
    yield 'response'
  }),
  analyzeBatch: jest.fn().mockResolvedValue([
    {
      result: { analysis: 'batch result 1' },
      model: 'mock',
      usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
    },
    {
      result: { analysis: 'batch result 2' },
      model: 'mock',
      usage: { prompt_tokens: 50, completion_tokens: 25, total_tokens: 75 },
    },
  ]),
}))

// Gemini SDK Mock - REMOVED (module deleted in refactor)
// Model routing now consolidated in @/lib/ai-client

/**
 * Anthropic SDK Mock
 *
 * Matches actual exports from @/lib/anthropic:
 * - MODELS: Available model constants
 * - analyze: Main analysis function
 */
jest.mock('@/lib/anthropic', () => ({
  MODELS: {
    FAST: 'claude-3-haiku-20240307',
    BALANCED: 'claude-3-5-sonnet-20241022',
    POWERFUL: 'claude-3-opus-20240229',
  },
  analyze: jest.fn().mockResolvedValue({
    result: { entities: [], claims: [] },
    model: 'claude-3-5-sonnet-20241022',
    usage: { input_tokens: 100, output_tokens: 50 },
  }),
}))

/**
 * Environment Mock
 *
 * Ensures consistent AI provider selection in tests.
 * Returns 'mock' provider to use built-in mock responses.
 */
jest.mock('@/lib/env', () => ({
  validateEnv: jest.fn().mockReturnValue({ success: true, env: {} }),
  getEnv: jest.fn().mockReturnValue({}),
  hasFeature: jest.fn().mockReturnValue(false),
  getPreferredAIProvider: jest.fn().mockReturnValue('mock'),
  checkEnvOnStartup: jest.fn(),
}))

// ============================================
// REACT ROUTER MOCKS
// ============================================

const mockNavigate = jest.fn()

jest.mock('react-router-dom', () => {
  // React is required dynamically for mocking JSX elements
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react')
  return {
    ...jest.requireActual('react-router-dom'),
    useNavigate: () => mockNavigate,
    useLocation: () => ({
      pathname: '/',
      search: '',
      hash: '',
      state: null,
      key: 'default',
    }),
    useSearchParams: () => [new URLSearchParams(), jest.fn()],
    useParams: () => ({}),
    Link: ({ children, to }: { children: React.ReactNode; to: string }) =>
      React.createElement('a', { href: to }, children),
    HashRouter: ({ children }: { children: React.ReactNode }) => children,
    BrowserRouter: ({ children }: { children: React.ReactNode }) => children,
  }
})

// ============================================
// BROWSER API MOCKS
// ============================================

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
})

// Mock ResizeObserver
class MockResizeObserver {
  observe = jest.fn()
  disconnect = jest.fn()
  unobserve = jest.fn()
}

Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: MockResizeObserver,
})

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock scrollTo
Object.defineProperty(window, 'scrollTo', {
  writable: true,
  value: jest.fn(),
})

// Ensure Blob.arrayBuffer exists in jsdom
if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
  Blob.prototype.arrayBuffer = function () {
    if (typeof Response !== 'undefined') {
      return new Response(this).arrayBuffer()
    }
    if (typeof FileReader !== 'undefined') {
      return new Promise<ArrayBuffer>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(this)
      })
    }
    return Promise.resolve(new ArrayBuffer(0))
  }
}

// ============================================
// CONSOLE SUPPRESSION
// ============================================

// Suppress specific console messages in tests
const originalError = console.error
const originalWarn = console.warn

beforeAll(() => {
  console.error = (...args) => {
    // Suppress React act() warnings
    if (args[0]?.includes?.('Warning: ReactDOM.render is no longer supported')) return
    if (args[0]?.includes?.('Warning: An update to')) return
    originalError.apply(console, args)
  }

  console.warn = (...args) => {
    // Suppress specific warnings
    if (args[0]?.includes?.('componentWillReceiveProps')) return
    originalWarn.apply(console, args)
  }
})

afterAll(() => {
  console.error = originalError
  console.warn = originalWarn
})

// ============================================
// GLOBAL TEST UTILITIES
// ============================================

// Helper to wait for async operations
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

// Helper to create mock documents
export const createMockDocument = (overrides = {}) => ({
  id: 'doc-123',
  case_id: 'case-123',
  filename: 'test-document.pdf',
  file_type: 'application/pdf',
  file_size: 1024,
  storage_path: 'cases/case-123/test-document.pdf',
  hash_sha256: 'abc123',
  doc_type: 'other',
  status: 'completed',
  extracted_text: 'Test document content',
  page_count: 5,
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// Helper to create mock cases
export const createMockCase = (overrides = {}) => ({
  id: 'case-123',
  reference: 'TEST-001',
  name: 'Test Case',
  case_type: 'family_court',
  status: 'active',
  description: 'A test case',
  metadata: {},
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  ...overrides,
})

// Helper to create mock findings
export const createMockFinding = (overrides = {}) => ({
  id: 'finding-123',
  case_id: 'case-123',
  engine: 'omission',
  title: 'Test Finding',
  description: 'A test finding',
  finding_type: 'omission',
  severity: 'high',
  document_ids: ['doc-123'],
  entity_ids: [],
  regulatory_targets: ['hcpc'],
  evidence: {},
  metadata: {},
  created_at: new Date().toISOString(),
  ...overrides,
})
