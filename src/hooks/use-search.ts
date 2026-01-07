import { useQuery } from '@tanstack/react-query'
import { isDesktop } from '@/lib/tauri/client'
import { searchDocuments } from '@/lib/tauri/commands'
import type { Engine } from '@/CONTRACT'

// ============================================
// ENGINES
// ============================================

export function useEngines() {
  return useQuery({
    queryKey: ['engines'],
    queryFn: async () => {
      // In desktop mode, engines are bundled - use metadata
      if (isDesktop()) {
        const { getActiveEngines } = await import('@/lib/engines/metadata')
        return getActiveEngines()
      }

      // Web mode: fetch from API
      const response = await fetch('/api/engines')
      if (!response.ok) throw new Error('Failed to fetch engines')
      return response.json()
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  })
}

// ============================================
// SEARCH
// ============================================

// UI-expected shape for header.tsx
interface UISearchResult {
  id: string
  document_name: string
  content: string
  score: number
}

export function useSearch(query: string, caseId?: string) {
  return useQuery({
    queryKey: ['search', query, caseId],
    queryFn: async () => {
      if (isDesktop()) {
        if (!caseId) {
          throw new Error('caseId is required for desktop search')
        }
        const rustResults = await searchDocuments(query, caseId)
        // Map Rust shape → UI shape
        const results: UISearchResult[] = rustResults.map((r) => ({
          id: r.chunk_id,
          document_name: r.document_id,
          content: r.content,
          score: r.similarity,
        }))
        return { results }
      }

      // Web mode fallback
      const params = new URLSearchParams({ q: query })
      if (caseId) params.append('caseId', caseId)

      const response = await fetch(`/api/search?${params}`)

      if (!response.ok) {
        throw new Error('Search failed')
      }

      return response.json()
    },
    enabled: query.length > 2,
    staleTime: 30 * 1000, // 30 seconds
  })
}
