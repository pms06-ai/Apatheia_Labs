/**
 * TEST UTILITIES
 *
 * Custom render function and utilities for testing React components
 * with all necessary providers and mocks.
 */

import React, { type ReactElement, type ReactNode } from 'react'
import { render, type RenderOptions, type RenderResult } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import userEvent from '@testing-library/user-event'

// ============================================
// QUERY CLIENT FOR TESTS
// ============================================

function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        staleTime: 0,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  })
}

// ============================================
// PROVIDERS WRAPPER
// ============================================

interface AllProvidersProps {
  children: ReactNode
}

function AllProviders({ children }: AllProvidersProps) {
  const queryClient = createTestQueryClient()

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
}

// ============================================
// CUSTOM RENDER
// ============================================

interface CustomRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  queryClient?: QueryClient
}

function customRender(
  ui: ReactElement,
  options?: CustomRenderOptions
): RenderResult & { user: ReturnType<typeof userEvent.setup> } {
  const user = userEvent.setup()

  return {
    user,
    ...render(ui, {
      wrapper: AllProviders,
      ...options,
    }),
  }
}

// ============================================
// TESTING HELPERS
// ============================================

/**
 * Wait for loading state to resolve
 */
export async function waitForLoadingToFinish(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0))
}

/**
 * Create a mock API response
 */
export function mockApiResponse<T>(data: T, options: { delay?: number; error?: boolean } = {}) {
  return jest.fn().mockImplementation(() => {
    const response = options.error
      ? Promise.reject(new Error('API Error'))
      : Promise.resolve({
          ok: !options.error,
          json: () => Promise.resolve(data),
        })

    if (options.delay) {
      return new Promise(resolve => setTimeout(() => resolve(response), options.delay))
    }
    return response
  })
}

/**
 * Mock next/navigation router
 */
export function createMockRouter(overrides = {}) {
  return {
    push: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    prefetch: jest.fn(),
    ...overrides,
  }
}

/**
 * Assert that console.error was not called
 */
export function expectNoConsoleErrors() {
  expect(console.error).not.toHaveBeenCalled()
}

/**
 * Helper to simulate file upload
 */
export function createMockFile(name: string, size: number, type: string): File {
  const file = new File(['x'.repeat(size)], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

/**
 * Helper to simulate drag and drop
 */
export function createDragEvent(type: string, files: File[]) {
  return {
    dataTransfer: {
      files,
      items: files.map(file => ({
        kind: 'file',
        type: file.type,
        getAsFile: () => file,
      })),
      types: ['Files'],
    },
  }
}

// ============================================
// SNAPSHOT HELPERS
// ============================================

/**
 * Remove dynamic values from component for stable snapshots
 */
export function stabilizeForSnapshot(html: string): string {
  return (
    html
      // Remove UUIDs
      .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')
      // Remove timestamps
      .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
      // Remove dynamic IDs
      .replace(/id="[^"]*"/g, 'id="STABLE_ID"')
  )
}

// ============================================
// ACCESSIBILITY HELPERS
// ============================================

/**
 * Check for basic accessibility issues
 */
export function checkBasicA11y(container: HTMLElement) {
  // Check for images without alt text
  const imagesWithoutAlt = container.querySelectorAll('img:not([alt])')
  expect(imagesWithoutAlt.length).toBe(0)

  // Check for buttons without accessible names
  const buttonsWithoutNames = container.querySelectorAll('button:not([aria-label]):empty')
  expect(buttonsWithoutNames.length).toBe(0)

  // Check for form inputs without labels
  const inputsWithoutLabels = container.querySelectorAll('input:not([aria-label]):not([id])')
  expect(inputsWithoutLabels.length).toBe(0)
}

// ============================================
// RE-EXPORTS
// ============================================

export * from '@testing-library/react'
export { userEvent }
export { customRender as render }

// Re-export a typed expect that includes jest-dom matchers
// This is necessary because the global expect is augmented by jest-dom
export { expect } from '@jest/globals'
