'use client'

import { useState, useRef, useEffect } from 'react'
import { Download, FileText, ChevronDown, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { isDesktop } from '@/lib/tauri'
import type { ExportFormat, ExportStatus } from '@/lib/types/export'

// ============================================
// Tauri Export Types
// ============================================

interface ExportResult {
    success: boolean
    path: string | null
    error: string | null
}

interface ExportButtonProps {
    caseId: string
    disabled?: boolean
    className?: string
}

type ExportOption = {
    format: ExportFormat
    label: string
    description: string
    mimeType: string
    extension: string
}

const EXPORT_OPTIONS: ExportOption[] = [
    {
        format: 'pdf',
        label: 'Export PDF',
        description: 'Legal citation format with full evidence package',
        mimeType: 'application/pdf',
        extension: 'pdf',
    },
    {
        format: 'docx',
        label: 'Export Word',
        description: 'Editable document with structured sections',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        extension: 'docx',
    },
]

export function ExportButton({ caseId, disabled = false, className = '' }: ExportButtonProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [status, setStatus] = useState<ExportStatus>('idle')
    const [activeFormat, setActiveFormat] = useState<ExportFormat | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }

        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    // Close dropdown on escape key
    useEffect(() => {
        function handleEscape(event: KeyboardEvent) {
            if (event.key === 'Escape') {
                setIsOpen(false)
            }
        }

        document.addEventListener('keydown', handleEscape)
        return () => document.removeEventListener('keydown', handleEscape)
    }, [])

    /**
     * Save file using native Tauri save dialog (desktop mode)
     */
    const saveWithTauri = async (blob: Blob, filename: string): Promise<{ success: boolean; path?: string; error?: string }> => {
        try {
            const { invoke } = await import('@tauri-apps/api/core')

            // Convert blob to byte array for Tauri IPC
            const arrayBuffer = await blob.arrayBuffer()
            const data = Array.from(new Uint8Array(arrayBuffer))

            const result = await invoke<ExportResult>('save_export_file', {
                filename,
                data,
            })

            if (result.success && result.path) {
                return { success: true, path: result.path }
            } else {
                return { success: false, error: result.error || 'Save failed' }
            }
        } catch (error) {
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Failed to save file'
            }
        }
    }

    /**
     * Save file using browser download (web mode fallback)
     */
    const saveWithBrowser = (blob: Blob, filename: string): void => {
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = filename
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        window.URL.revokeObjectURL(url)
    }

    const handleExport = async (option: ExportOption) => {
        if (!caseId || status === 'generating') {
            return
        }

        setIsOpen(false)
        setStatus('preparing')
        setActiveFormat(option.format)

        try {
            setStatus('generating')

            let blob: Blob
            let filename: string

            // Generate export client-side (Tauri app with static export)
            if (option.format === 'pdf') {
                const { generatePDF } = await import('@/lib/export/pdf-generator')
                const result = await generatePDF(caseId)

                if (!result.success || !result.blob) {
                    throw new Error(result.error || 'PDF generation failed')
                }

                blob = result.blob
                filename = result.filename
            } else {
                const { generateDOCX } = await import('@/lib/export/docx-generator')
                const result = await generateDOCX(caseId)

                if (!result.success || !result.blob) {
                    throw new Error(result.error || 'DOCX generation failed')
                }

                blob = result.blob
                filename = result.filename
            }

            // Use native save dialog in desktop mode, browser download in web mode
            if (isDesktop()) {
                const result = await saveWithTauri(blob, filename)

                if (result.success) {
                    setStatus('completed')
                    // Show path in success message for desktop saves
                    const shortPath = result.path && result.path.length > 50
                        ? '...' + result.path.slice(-47)
                        : result.path
                    toast.success(`${option.format.toUpperCase()} saved to ${shortPath}`)
                } else {
                    // User cancelled or error occurred
                    if (result.error === 'Save cancelled by user') {
                        setStatus('idle')
                        setActiveFormat(null)
                        return
                    }
                    throw new Error(result.error || 'Save failed')
                }
            } else {
                // Web mode: use browser download
                saveWithBrowser(blob, filename)
                setStatus('completed')
                toast.success(`${option.format.toUpperCase()} export downloaded successfully`)
            }

            // Reset status after a delay
            setTimeout(() => {
                setStatus('idle')
                setActiveFormat(null)
            }, 2000)

        } catch (error) {
            setStatus('failed')
            const message = error instanceof Error ? error.message : 'Export failed'
            toast.error(message)

            // Reset status after a delay
            setTimeout(() => {
                setStatus('idle')
                setActiveFormat(null)
            }, 3000)
        }
    }

    const isLoading = status === 'preparing' || status === 'generating'
    const isDisabled = disabled || !caseId || isLoading

    return (
        <div ref={dropdownRef} className={`relative inline-block ${className}`}>
            {/* Main Button */}
            <button
                onClick={() => !isDisabled && setIsOpen(!isOpen)}
                disabled={isDisabled}
                className={`
                    flex items-center gap-2 rounded-lg px-4 py-2.5 font-medium transition-all duration-200
                    ${isDisabled
                        ? 'bg-charcoal-700 text-charcoal-500 cursor-not-allowed'
                        : 'bg-gradient-to-r from-bronze-600 to-bronze-700 text-white shadow-lg shadow-bronze-900/20 hover:from-bronze-500 hover:to-bronze-600 hover:shadow-bronze-500/20 hover:-translate-y-0.5'
                    }
                `}
                aria-expanded={isOpen}
                aria-haspopup="listbox"
            >
                {isLoading ? (
                    <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>Exporting...</span>
                    </>
                ) : (
                    <>
                        <Download className="h-4 w-4" />
                        <span>Export Evidence</span>
                        <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                    </>
                )}
            </button>

            {/* Dropdown Menu */}
            {isOpen && !isLoading && (
                <div
                    className={`
                        absolute right-0 mt-2 w-64 rounded-lg border border-charcoal-700 bg-charcoal-800 shadow-xl shadow-black/30
                        overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200
                    `}
                    role="listbox"
                >
                    <div className="p-1">
                        {EXPORT_OPTIONS.map((option) => (
                            <button
                                key={option.format}
                                onClick={() => handleExport(option)}
                                className={`
                                    w-full flex items-start gap-3 p-3 rounded-md text-left transition-colors duration-150
                                    hover:bg-charcoal-700/50 focus:bg-charcoal-700/50 focus:outline-none
                                    ${activeFormat === option.format ? 'bg-bronze-500/10' : ''}
                                `}
                                role="option"
                                aria-selected={activeFormat === option.format}
                            >
                                <div className={`
                                    flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border
                                    ${option.format === 'pdf'
                                        ? 'border-red-500/30 bg-red-500/10 text-red-400'
                                        : 'border-blue-500/30 bg-blue-500/10 text-blue-400'
                                    }
                                `}>
                                    <FileText className="h-5 w-5" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-charcoal-100">
                                            {option.label}
                                        </span>
                                        <span className="text-[10px] font-mono uppercase text-charcoal-500 bg-charcoal-700 px-1.5 py-0.5 rounded">
                                            .{option.extension}
                                        </span>
                                    </div>
                                    <p className="text-xs text-charcoal-400 mt-0.5 line-clamp-2">
                                        {option.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Footer hint */}
                    <div className="border-t border-charcoal-700/50 px-3 py-2 bg-charcoal-900/50">
                        <p className="text-[10px] text-charcoal-500 text-center">
                            Exports include legal citations, audit trail & methodology
                        </p>
                    </div>
                </div>
            )}

            {/* Status indicator for completed/failed */}
            {status === 'completed' && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-status-success shadow-[0_0_6px_rgba(74,154,106,0.6)] animate-pulse" />
            )}
            {status === 'failed' && (
                <div className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-status-critical shadow-[0_0_6px_rgba(239,68,68,0.6)] animate-pulse" />
            )}
        </div>
    )
}
