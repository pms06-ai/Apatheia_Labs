import { Routes, Route } from 'react-router-dom'
import { Header } from './components/layout/header'
import { Sidebar } from './components/layout/sidebar'
import { Dashboard } from './components/dashboard'
import { ErrorBoundary } from './components/error-boundary'

// Lazy load page components for better code splitting
import { lazy, Suspense } from 'react'
import { Spinner } from './components/ui/spinner'

const DocumentsPage = lazy(() => import('./pages/documents'))
const AnalysisPage = lazy(() => import('./pages/analysis'))
const SAMPage = lazy(() => import('./pages/sam'))
const SettingsPage = lazy(() => import('./pages/settings'))

function PageLoader() {
  return (
    <div className="flex h-full items-center justify-center">
      <Spinner size="lg" />
    </div>
  )
}

function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen flex-col font-sans">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  )
}

function NotFound() {
  return (
    <div className="flex h-full flex-col items-center justify-center">
      <h1 className="font-display text-4xl text-charcoal-100">404</h1>
      <p className="mt-2 text-charcoal-400">Page not found</p>
    </div>
  )
}

export function App() {
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-bg-primary text-charcoal-100 antialiased">
        <AppLayout>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/documents" element={<DocumentsPage />} />
              <Route path="/analysis" element={<AnalysisPage />} />
              <Route path="/sam" element={<SAMPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </AppLayout>
      </div>
    </ErrorBoundary>
  )
}
