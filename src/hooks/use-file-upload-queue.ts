import { useState } from 'react'
import type { DocType } from '@/CONTRACT'

export interface QueuedFile {
  file?: File
  path?: string
  filename: string
  size?: number
  docType: DocType
  status: 'pending' | 'uploading' | 'processing' | 'completed' | 'error'
  progress: number
  error?: string
}

export function useFileUploadQueue(initialQueue: QueuedFile[] = []) {
  const [queue, setQueue] = useState<QueuedFile[]>(initialQueue)

  const addFiles = (newFiles: QueuedFile[]) => {
    setQueue((prev) => [...prev, ...newFiles])
  }

  const updateFile = (index: number, updater: (file: QueuedFile) => QueuedFile) => {
    setQueue((prev) => prev.map((item, i) => (i === index ? updater(item) : item)))
  }

  const removeFile = (index: number) => {
    setQueue((prev) => prev.filter((_, i) => i !== index))
  }

  return {
    queue,
    setQueue,
    addFiles,
    updateFile,
    removeFile,
  }
}
