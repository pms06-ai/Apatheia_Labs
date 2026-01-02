import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getDataLayer, isDesktop } from '@/lib/data'
import { fileToBytes } from '@/lib/tauri'
import type { Document, DocType } from '@/CONTRACT'

// ============================================
// DOCUMENTS
// ============================================

export function useDocuments(caseId: string) {
  return useQuery({
    queryKey: ['documents', caseId],
    queryFn: async () => {
      const db = await getDataLayer()
      return db.getDocuments(caseId)
    },
    enabled: !!caseId,
  })
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ['document', documentId],
    queryFn: async () => {
      const db = await getDataLayer()
      return db.getDocument(documentId)
    },
    enabled: !!documentId,
  })
}

export function useUploadDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      file,
      caseId,
      docType,
    }: {
      file: File
      caseId: string
      docType?: DocType
    }) => {
      const db = await getDataLayer()
      return db.uploadDocument({ caseId, file, docType })
    },
    onMutate: async (variables) => {
      await queryClient.cancelQueries({ queryKey: ['documents', variables.caseId] })

      const previousDocs = queryClient.getQueryData<Document[]>(['documents', variables.caseId])

      // Optimistic update with pending document
      if (previousDocs) {
        const optimisticDoc: Document = {
          id: `temp-${Date.now()}`,
          case_id: variables.caseId,
          filename: variables.file.name,
          file_type: variables.file.type || 'application/octet-stream',
          file_size: variables.file.size,
          storage_path: '',
          hash_sha256: '',
          acquisition_date: new Date().toISOString(),
          doc_type: variables.docType || null,
          source_entity: null,
          status: 'pending',
          extracted_text: null,
          page_count: null,
          metadata: {},
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }
        queryClient.setQueryData<Document[]>(
          ['documents', variables.caseId],
          [optimisticDoc, ...previousDocs]
        )
      }

      return { previousDocs }
    },
    onError: (_err, variables, context) => {
      if (context?.previousDocs) {
        queryClient.setQueryData(['documents', variables.caseId], context.previousDocs)
      }
    },
    onSettled: (_, __, variables) => {
      queryClient.invalidateQueries({ queryKey: ['documents', variables.caseId] })
    },
  })
}

export function useDeleteDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      const db = await getDataLayer()
      return db.deleteDocument(documentId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}

export function useProcessDocument() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (documentId: string) => {
      // In desktop mode, processing happens automatically after upload
      // But if we want to manually re-trigger it:
      if (isDesktop()) {
        const { processDocument } = await import('@/lib/tauri/commands')
        return processDocument(documentId)
      }

      // Web mode - deprecated API
      throw new Error('Web mode API is deprecated. Use Desktop app.')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] })
    },
  })
}
