'use client'

import { Search } from 'lucide-react'

export function Header() {
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
              <span className="text-bronze-400 font-medium">Apatheia</span>
              <span className="text-charcoal-400"> Labs</span>
            </div>
          </div>
        </div>

        <div className="mx-4 h-6 w-px bg-gradient-to-b from-transparent via-charcoal-600/50 to-transparent" />

        <div className="flex items-center gap-2 rounded border border-charcoal-700/50 bg-charcoal-800/50 px-3 py-1.5 backdrop-blur-sm">
          <span className="text-[10px] text-charcoal-500 font-mono uppercase tracking-widest">PHRONESIS</span>
          <div className="h-3 w-px bg-charcoal-700" />
          <span className="text-xs text-bronze-500 font-medium">FCIP v6.0</span>
        </div>
      </div>

      {/* Search */}
      <div className="flex items-center gap-4">
        <div className="group flex items-center gap-2 rounded-lg border border-charcoal-700/50 bg-charcoal-900/50 px-3 py-2 transition-colors hover:border-charcoal-600 hover:bg-charcoal-900 focus-within:border-bronze-500/50 focus-within:ring-1 focus-within:ring-bronze-500/20">
          <Search className="h-4 w-4 text-charcoal-500 group-focus-within:text-bronze-500 transition-colors" />
          <input
            type="text"
            placeholder="Search documents, entities, findings..."
            className="w-64 bg-transparent text-sm text-charcoal-200 placeholder:text-charcoal-600 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-charcoal-700 bg-charcoal-800 px-1.5 font-mono text-[10px] font-medium text-charcoal-400 opacity-100">
            <span className="text-xs">⌘</span>K
          </kbd>
        </div>

        <button className="relative overflow-hidden rounded-lg bg-gradient-to-b from-bronze-500 to-bronze-600 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all hover:scale-[1.02] hover:shadow-bronze-500/20 active:scale-[0.98]">
          <div className="absolute inset-0 bg-white/10 opacity-0 hover:opacity-100 transition-opacity" />
          Export Report
        </button>
      </div>
    </header>
  )
}
