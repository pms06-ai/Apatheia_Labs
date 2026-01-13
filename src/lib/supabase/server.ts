/**
 * Supabase Server Stub (DEPRECATED)
 *
 * This application is Tauri-only and uses local SQLite via the Rust backend.
 * This stub exists for test compatibility - actual data operations go through
 * the Tauri data layer at @/lib/data.
 *
 * TODO: Refactor TypeScript engines to use Tauri data layer, then delete this file.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const STUB_ERROR = 'Supabase removed - this is a Tauri-only app. Use @/lib/data instead.'

interface QueryResult {
  data: any
  error: { message: string } | null
}

interface MockQueryBuilder {
  select(columns?: string): MockQueryBuilder
  insert(data: any): MockQueryBuilder & Promise<QueryResult>
  update(data: any): MockQueryBuilder
  delete(): MockQueryBuilder
  eq(column: string, value: any): MockQueryBuilder
  neq(column: string, value: any): MockQueryBuilder
  in(column: string, values: any[]): MockQueryBuilder
  ilike(column: string, pattern: string): MockQueryBuilder
  single(): Promise<QueryResult>
  order(column: string, options?: { ascending?: boolean }): MockQueryBuilder
  limit(count: number): MockQueryBuilder
  upsert(data: any): Promise<QueryResult>
  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2>
}

function createMockQueryBuilder(): MockQueryBuilder {
  const result: QueryResult = { data: [], error: null }
  const singleResult: QueryResult = { data: null, error: { message: STUB_ERROR } }

  const insertResult = Object.assign(
    Promise.resolve({ data: null, error: { message: STUB_ERROR } }),
    { select: () => builder }
  )

  const builder: MockQueryBuilder = {
    select: () => builder,
    insert: () => insertResult as MockQueryBuilder & Promise<QueryResult>,
    update: () => builder,
    delete: () => builder,
    eq: () => builder,
    neq: () => builder,
    in: () => builder,
    ilike: () => builder,
    single: () => Promise.resolve(singleResult),
    order: () => builder,
    limit: () => builder,
    upsert: () => Promise.resolve({ data: null, error: { message: STUB_ERROR } }),
    then: (onfulfilled, onrejected) => {
      return Promise.resolve(result).then(onfulfilled, onrejected)
    },
  }
  return builder
}

interface MockSupabaseClient {
  from(table: string): MockQueryBuilder
  auth: {
    getSession: () => Promise<QueryResult>
  }
}

const mockClient: MockSupabaseClient = {
  from: (_table: string) => createMockQueryBuilder(),
  auth: {
    getSession: () => Promise.resolve({ data: null, error: { message: STUB_ERROR } }),
  },
}

/**
 * @deprecated Use @/lib/data getDataLayer() instead
 */
export function createServerClient(): MockSupabaseClient {
  console.warn('[STUB] createServerClient called - Supabase removed, use Tauri data layer')
  return mockClient
}

/**
 * @deprecated Use @/lib/data getDataLayer() instead
 */
export const supabaseAdmin = mockClient
