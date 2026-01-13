import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { App } from './App'
import { Providers } from './components/providers'
import './styles/globals.css'

// Add font CSS variables to match Next.js font setup
const fontStyles = document.createElement('style')
fontStyles.textContent = `
  :root {
    --font-display: 'Playfair Display', serif;
    --font-sans: 'Inter', sans-serif;
    --font-mono: 'JetBrains Mono', monospace;
  }
`
document.head.appendChild(fontStyles)

const container = document.getElementById('root')
if (!container) {
  throw new Error('Root element not found')
}

const root = createRoot(container)
root.render(
  <StrictMode>
    <Providers>
      <HashRouter>
        <App />
      </HashRouter>
    </Providers>
  </StrictMode>
)
