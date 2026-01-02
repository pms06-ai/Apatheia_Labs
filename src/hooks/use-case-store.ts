import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Case, Document, Entity, Finding } from '@/CONTRACT'

interface CaseState {
  // Current case
  activeCase: Case | null
  setActiveCase: (caseData: Case | null) => void

  // Documents
  documents: Document[]
  setDocuments: (docs: Document[]) => void
  addDocument: (doc: Document) => void
  updateDocument: (id: string, updates: Partial<Document>) => void

  // Entities
  entities: Entity[]
  setEntities: (entities: Entity[]) => void
  addEntity: (entity: Entity) => void

  // Findings
  findings: Finding[]
  setFindings: (findings: Finding[]) => void
  addFinding: (finding: Finding) => void

  // UI State
  selectedDocumentId: string | null
  setSelectedDocumentId: (id: string | null) => void
  
  selectedEntityId: string | null
  setSelectedEntityId: (id: string | null) => void

  activeEngine: string | null
  setActiveEngine: (engine: string | null) => void

  // Filters
  severityFilter: string[]
  setSeverityFilter: (severities: string[]) => void

  searchQuery: string
  setSearchQuery: (query: string) => void

  // Reset
  reset: () => void
}

const initialState = {
  activeCase: null,
  documents: [],
  entities: [],
  findings: [],
  selectedDocumentId: null,
  selectedEntityId: null,
  activeEngine: null,
  severityFilter: [],
  searchQuery: '',
}

export const useCaseStore = create<CaseState>()(
  persist(
    (set) => ({
      ...initialState,

      setActiveCase: (caseData) => set({ activeCase: caseData }),

      setDocuments: (documents) => set({ documents }),
      addDocument: (doc) =>
        set((state) => ({ documents: [...state.documents, doc] })),
      updateDocument: (id, updates) =>
        set((state) => ({
          documents: state.documents.map((d) =>
            d.id === id ? { ...d, ...updates } : d
          ),
        })),

      setEntities: (entities) => set({ entities }),
      addEntity: (entity) =>
        set((state) => ({ entities: [...state.entities, entity] })),

      setFindings: (findings) => set({ findings }),
      addFinding: (finding) =>
        set((state) => ({ findings: [...state.findings, finding] })),

      setSelectedDocumentId: (id) => set({ selectedDocumentId: id }),
      setSelectedEntityId: (id) => set({ selectedEntityId: id }),
      setActiveEngine: (engine) => set({ activeEngine: engine }),
      setSeverityFilter: (severities) => set({ severityFilter: severities }),
      setSearchQuery: (query) => set({ searchQuery: query }),

      reset: () => set(initialState),
    }),
    {
      name: 'apatheia-case-store',
      partialize: (state) => ({
        // Only persist certain fields
        activeCase: state.activeCase,
        activeEngine: state.activeEngine,
        severityFilter: state.severityFilter,
      }),
    }
  )
)

// Selectors - prefixed with "CaseStore" to avoid collision with React Query hooks
export const useActiveCase = () => useCaseStore((state) => state.activeCase)
export const useCaseStoreDocuments = () => useCaseStore((state) => state.documents)
export const useCaseStoreEntities = () => useCaseStore((state) => state.entities)
export const useCaseStoreFindings = () => useCaseStore((state) => state.findings)

// Filtered selectors
export const useCriticalFindings = () =>
  useCaseStore((state) =>
    state.findings.filter((f) => f.severity === 'critical')
  )

export const useFilteredFindings = () =>
  useCaseStore((state) => {
    const { findings, severityFilter, searchQuery, activeEngine } = state
    
    return findings.filter((f) => {
      // Engine filter
      if (activeEngine && f.engine !== activeEngine) return false
      
      // Severity filter
      if (severityFilter.length > 0 && !severityFilter.includes(f.severity || '')) {
        return false
      }
      
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        return (
          f.title.toLowerCase().includes(query) ||
          f.description?.toLowerCase().includes(query)
        )
      }
      
      return true
    })
  })
