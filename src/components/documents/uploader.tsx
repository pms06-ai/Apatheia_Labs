'use client'

import { useCallback, useState, useEffect } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, FileText, X, Loader2, FolderOpen } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useUploadDocument, useProcessDocument } from '@/hooks/use-api'
import { useCaseStore } from '@/hooks/use-case-store'
import { formatFileSize } from '@/lib/utils'
import { isDesktop } from '@/lib/tauri'
import { pickDocuments, uploadFromPath } from '@/lib/tauri/commands'
import toast from 'react-hot-toast'
import type { DocType } from '@/CONTRACT'
import { useFileUploadQueue } from '@/hooks/use-file-upload-queue'

const ACCEPTED_TYPES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'application/json': ['.json'],
  'text/csv': ['.csv'],
  'text/html': ['.html', '.htm'],
  'audio/mpeg': ['.mp3'],
  'audio/wav': ['.wav'],
  'video/mp4': ['.mp4'],
}

const DOC_TYPES: Array<{ value: DocType; label: string }> = [
  { value: 'court_order', label: 'Court Order' },
  { value: 'witness_statement', label: 'Witness Statement' },
  { value: 'expert_report', label: 'Expert Report' },
  { value: 'police_bundle', label: 'Police Bundle' },
  { value: 'social_work_assessment', label: 'SW Assessment' },
  { value: 'transcript', label: 'Transcript' },
  { value: 'correspondence', label: 'Correspondence' },
  { value: 'disclosure', label: 'Disclosure' },
  { value: 'threshold_document', label: 'Threshold Document' },
  { value: 'other', label: 'Other' },
]

export function DocumentUploader() {
  const { queue, addFiles, updateFile, removeFile } = useFileUploadQueue()
  const activeCase = useCaseStore(state => state.activeCase)
  // Check desktop mode after mount to ensure Tauri globals are available
  const [isDesktopMode, setIsDesktopMode] = useState(false)
  const defaultDocType: DocType = 'other'
  const isDocType = (value: string): value is DocType =>
    DOC_TYPES.some(type => type.value === value)

  useEffect(() => {
    setIsDesktopMode(isDesktop())
  }, [])

  const uploadMutation = useUploadDocument()
  const processMutation = useProcessDocument()

  // Web mode: handle dropped files
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const newFiles = acceptedFiles.map(file => ({
        file,
        filename: file.name,
        size: file.size,
        docType: defaultDocType,
        status: 'pending' as const,
        progress: 0,
      }))
      addFiles(newFiles)
    },
    [addFiles, defaultDocType]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: 50 * 1024 * 1024, // 50MB
    disabled: isDesktopMode, // Disable dropzone in desktop mode
  })

  // Desktop mode: open native file picker
  const handleNativePicker = async () => {
    try {
      const files = await pickDocuments()
      if (files.length === 0) return

      const newFiles = files.map(f => ({
        path: f.path,
        filename: f.filename,
        docType: defaultDocType,
        status: 'pending' as const,
        progress: 0,
      }))
      addFiles(newFiles)
    } catch (error) {
      toast.error('Failed to open file picker')
      console.error('File picker error:', error)
    }
  }

  const updateFileType = (index: number, docTypeValue: string) => {
    const nextDocType = isDocType(docTypeValue) ? docTypeValue : defaultDocType
    updateFile(index, item => ({ ...item, docType: nextDocType }))
  }

  const uploadFile = async (index: number) => {
    if (!activeCase) {
      toast.error('No active case selected')
      return
    }

    const item = queue[index]

    updateFile(index, file => ({ ...file, status: 'uploading', progress: 30 }))

    try {
      if (isDesktopMode && item.path) {
        // Desktop mode: upload from path
        console.log('[Uploader] Starting desktop upload:', {
          caseId: activeCase.id,
          path: item.path,
          docType: item.docType,
        })
        await uploadFromPath(activeCase.id, item.path, item.docType)

        updateFile(index, file => ({ ...file, status: 'completed', progress: 100 }))
      } else if (item.file) {
        console.log('[Uploader] Starting WEB upload (Fallback):', { file: item.file.name })
        // Web mode: upload file blob
        const result = await uploadMutation.mutateAsync({
          file: item.file,
          caseId: activeCase.id,
          docType: item.docType,
        })

        updateFile(index, file => ({ ...file, status: 'processing', progress: 60 }))

        // Trigger processing
        await processMutation.mutateAsync(result.id)

        updateFile(index, file => ({ ...file, status: 'completed', progress: 100 }))
      }

      toast.success(`${item.filename} uploaded and processed`)
    } catch (error) {
      updateFile(index, file => ({ ...file, status: 'error', error: 'Upload failed' }))
      toast.error(`Failed to upload ${item.filename}: ${(error as Error).message}`)
      console.error('Upload error:', error)
    }
  }

  const uploadAll = async () => {
    const pendingIndices = queue
      .map((item, index) => (item.status === 'pending' ? index : -1))
      .filter(i => i !== -1)

    for (const index of pendingIndices) {
      await uploadFile(index)
    }
  }

  return (
    <div className="space-y-4">
      {!isDesktopMode && (
        <div className="rounded-md border border-red-500/50 bg-red-900/50 p-4">
          <div className="flex">
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-200">Web Mode Detected</h3>
              <div className="mt-2 text-sm text-red-300">
                <p>
                  File uploads are currently disabled in the web browser. Please launch the Desktop
                  App (Tauri) to upload documents.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Upload Zone */}
      {isDesktopMode ? (
        // Desktop mode: Native file picker button
        <div
          onClick={handleNativePicker}
          className="cursor-pointer rounded-lg border-2 border-dashed border-charcoal-600 p-8 text-center transition hover:border-charcoal-500 hover:bg-charcoal-800/50"
        >
          <FolderOpen className="mx-auto h-10 w-10 text-charcoal-500" />
          <p className="mt-4 text-sm text-charcoal-300">Click to select documents</p>
          <p className="mt-1 text-xs text-charcoal-500">
            PDF, DOCX, TXT, MD, JSON, CSV, HTML (max 50MB)
          </p>
        </div>
      ) : (
        // Web mode: Dropzone
        <div
          {...getRootProps()}
          className={`cursor-pointer rounded-lg border-2 border-dashed p-8 text-center transition ${
            isDragActive
              ? 'border-bronze-500 bg-bronze-500/10'
              : 'border-charcoal-600 hover:border-charcoal-500 hover:bg-charcoal-800/50'
          }`}
        >
          <input {...getInputProps()} />
          <Upload className="mx-auto h-10 w-10 text-charcoal-500" />
          <p className="mt-4 text-sm text-charcoal-300">
            {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to select'}
          </p>
          <p className="mt-1 text-xs text-charcoal-500">PDF, DOCX, TXT, MP3, WAV, MP4 (max 50MB)</p>
        </div>
      )}

      {/* Queue */}
      {queue.length > 0 && (
        <Card className="divide-y divide-charcoal-600/30">
          <div className="flex items-center justify-between px-4 py-3">
            <h3 className="text-sm font-medium text-charcoal-100">
              Upload Queue ({queue.length} files)
            </h3>
            <button
              onClick={uploadAll}
              disabled={!activeCase || queue.every(f => f.status !== 'pending')}
              className="rounded-md bg-bronze-600 px-3 py-1.5 text-xs font-medium text-charcoal-900 transition hover:bg-bronze-500 disabled:opacity-50"
            >
              Upload All
            </button>
          </div>

          {queue.map((item, index) => (
            <div key={index} className="flex items-center gap-4 px-4 py-3">
              <FileText className="h-8 w-8 text-charcoal-500" />

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="truncate text-sm text-charcoal-200">{item.filename}</span>
                  {item.size && (
                    <span className="text-xs text-charcoal-500">{formatFileSize(item.size)}</span>
                  )}
                </div>

                {/* Progress bar */}
                {item.status !== 'pending' && (
                  <div className="mt-2 h-1 overflow-hidden rounded-full bg-charcoal-700">
                    <div
                      className={`h-full transition-all ${
                        item.status === 'completed'
                          ? 'bg-status-success'
                          : item.status === 'error'
                            ? 'bg-status-critical'
                            : 'bg-bronze-500'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                )}
              </div>

              {/* Doc type selector */}
              {item.status === 'pending' && (
                <select
                  value={item.docType}
                  onChange={e => updateFileType(index, e.target.value)}
                  className="rounded-md border border-charcoal-600 bg-charcoal-800 px-2 py-1 text-xs text-charcoal-200"
                >
                  {DOC_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              )}

              {/* Status */}
              {item.status === 'uploading' && (
                <Loader2 className="h-4 w-4 animate-spin text-bronze-500" />
              )}
              {item.status === 'processing' && <Badge variant="info">Processing</Badge>}
              {item.status === 'completed' && <Badge variant="success">Done</Badge>}
              {item.status === 'error' && <Badge variant="critical">Error</Badge>}

              {/* Actions */}
              {item.status === 'pending' && (
                <>
                  <button
                    onClick={() => uploadFile(index)}
                    disabled={!activeCase}
                    className="rounded-md bg-bronze-600 px-2 py-1 text-xs font-medium text-charcoal-900 transition hover:bg-bronze-500 disabled:opacity-50"
                  >
                    Upload
                  </button>
                  <button
                    onClick={() => removeFile(index)}
                    className="text-charcoal-500 hover:text-charcoal-300"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </>
              )}
            </div>
          ))}
        </Card>
      )}
    </div>
  )
}
