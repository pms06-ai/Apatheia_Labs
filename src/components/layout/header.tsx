'use client'

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Loader2, FileText, AlertCircle, X } from 'lucide-react'
import { useSearch } from '@/hooks/use-search'
import { useActiveCase } from '@/hooks/use-case-store'

export function Header() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const activeCase = useActiveCase()
  const { data, isLoading, error } = useSearch(query, activeCase?.id)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        !inputRef.current?.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Keyboard shortcut (Cmd/Ctrl + K)
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
        event.preventDefault()
        inputRef.current?.focus()
        setIsOpen(true)
      }
      if (event.key === 'Escape') {
        setIsOpen(false)
        inputRef.current?.blur()
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  const showDropdown = isOpen && query.length > 2
  const results = data?.results || []

  return (
    <header className="flex h-14 items-center justify-between border-b border-charcoal-600/30 bg-bg-secondary px-6">
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 items-center justify-center rounded bg-bronze-500 font-display text-lg font-bold text-charcoal-900 shadow-md">
            Α
          </div>
          <div>
            <div className="font-display text-base tracking-tight">
              <span className="font-medium text-bronze-400">Apatheia</span>
              <span className="text-charcoal-400"> Labs</span>
            </div>
          </div>
        </div>

        <div className="mx-4 h-6 w-px bg-gradient-to-b from-transparent via-charcoal-600/50 to-transparent" />

        <div className="flex items-center gap-2 rounded border border-charcoal-700/50 bg-charcoal-800/50 px-3 py-1.5 backdrop-blur-sm">
          <span className="font-mono text-[10px] uppercase tracking-widest text-charcoal-500">
            PHRONESIS
          </span>
          <div className="h-3 w-px bg-charcoal-700" />
          <span className="text-xs font-medium text-bronze-500">FCIP v6.0</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="group flex items-center gap-2 rounded-lg border border-charcoal-700/50 bg-charcoal-900/50 px-3 py-2 transition-colors focus-within:border-bronze-500/50 focus-within:ring-1 focus-within:ring-bronze-500/20 hover:border-charcoal-600 hover:bg-charcoal-900">
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin text-bronze-500" />
            ) : (
              <Search className="h-4 w-4 text-charcoal-500 transition-colors group-focus-within:text-bronze-500" />
            )}
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setIsOpen(true)
              }}
              onFocus={() => setIsOpen(true)}
              placeholder="Search documents, entities, findings..."
              className="w-64 bg-transparent text-sm text-charcoal-200 placeholder:text-charcoal-600 focus:outline-none"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setIsOpen(false)
                }}
                className="text-charcoal-500 hover:text-charcoal-300"
              >
                <X className="h-3 w-3" />
              </button>
            )}
            <kbd className="hidden h-5 items-center gap-1 rounded border border-charcoal-700 bg-charcoal-800 px-1.5 font-mono text-[10px] font-medium text-charcoal-400 opacity-100 sm:inline-flex">
              <span className="text-xs">⌘</span>K
            </kbd>
          </div>

          {/* Search Results Dropdown */}
          {showDropdown && (
            <div
              ref={dropdownRef}
              className="absolute right-0 top-full z-50 mt-2 w-96 overflow-hidden rounded-lg border border-charcoal-700 bg-charcoal-900 shadow-xl"
            >
              {/* Loading State */}
              {isLoading && (
                <div className="flex items-center justify-center gap-2 p-6 text-charcoal-400">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">Searching...</span>
                </div>
              )}

              {/* Error State */}
              {error && !isLoading && (
                <div className="p-4">
                  <div className="flex items-center gap-2 text-status-critical">
                    <AlertCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">Search failed</span>
                  </div>
                  <p className="mt-1 text-xs text-charcoal-500">
                    {error instanceof Error ? error.message : 'An error occurred'}
                  </p>
                </div>
              )}

              {/* No Case Selected */}
              {!activeCase && !isLoading && !error && (
                <div className="p-6 text-center">
                  <FileText className="mx-auto mb-2 h-8 w-8 text-charcoal-600" />
                  <p className="text-sm text-charcoal-400">No case selected</p>
                  <p className="mt-1 text-xs text-charcoal-500">
                    Select a case to search documents
                  </p>
                </div>
              )}

              {/* No Results */}
              {activeCase && !isLoading && !error && results.length === 0 && (
                <div className="p-6 text-center">
                  <Search className="mx-auto mb-2 h-8 w-8 text-charcoal-600" />
                  <p className="text-sm text-charcoal-400">No results found</p>
                  <p className="mt-1 text-xs text-charcoal-500">
                    No matches for &ldquo;{query}&rdquo;
                  </p>
                </div>
              )}

              {/* Results */}
              {!isLoading && !error && results.length > 0 && (
                <div className="max-h-80 overflow-y-auto">
                  <div className="border-b border-charcoal-800 px-3 py-2 text-xs text-charcoal-500">
                    {results.length} result{results.length !== 1 ? 's' : ''}
                  </div>
                  {results.map(
                    (result: {
                      id: string
                      document_name?: string
                      title?: string
                      content: string
                      score?: number
                    }) => (
                      <button
                        key={result.id}
                        onClick={() => {
                          // Navigate to document with chunk highlight
                          const docId = result.document_name || result.id
                          navigate(`/documents/${docId}?chunk=${result.id}`)
                          setQuery('')
                          setIsOpen(false)
                        }}
                        className="w-full border-b border-charcoal-800/50 px-3 py-2 text-left transition-colors last:border-0 hover:bg-charcoal-800"
                      >
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 flex-shrink-0 text-charcoal-500" />
                          <span className="truncate text-sm text-charcoal-200">
                            {result.document_name || result.title || 'Untitled'}
                          </span>
                          {result.score !== undefined && (
                            <span className="ml-auto text-xs text-charcoal-500">
                              {Math.round(result.score * 100)}%
                            </span>
                          )}
                        </div>
                        <p className="mt-1 line-clamp-2 pl-6 text-xs text-charcoal-500">
                          {result.content}
                        </p>
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <button className="relative overflow-hidden rounded-lg bg-gradient-to-b from-bronze-500 to-bronze-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-bronze-500/20 active:scale-[0.98]">
          <div className="absolute inset-0 bg-white/10 opacity-0 transition-opacity hover:opacity-100" />
          Export Report
        </button>
      </div>
    </header>
  )
}
