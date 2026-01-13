/**
 * Jest Configuration for Apatheia Labs
 *
 * Supports:
 * - TypeScript with SWC
 * - React Testing Library
 * - Module path aliases
 * - Coverage reporting
 */

/** @type {import('jest').Config} */
module.exports = {
  // Test environment
  testEnvironment: 'jsdom',

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

  // Module resolution
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    // Handle CSS imports (with CSS modules)
    '\\.css$': 'identity-obj-proxy',
  },

  // Transform TypeScript with SWC
  transform: {
    '^.+\\.(t|j)sx?$': [
      '@swc/jest',
      {
        jsc: {
          transform: {
            react: {
              runtime: 'automatic',
            },
          },
        },
      },
    ],
  },

  // Test file patterns
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],

  // Ignore patterns
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/dist/',
    '<rootDir>/src/__tests__/setup.ts',
    '<rootDir>/src/__tests__/utils.tsx',
  ],

  // Module path ignore (fixes Haste collision with src-tauri/target)
  modulePathIgnorePatterns: ['<rootDir>/src-tauri/target/'],

  // Coverage configuration
  collectCoverageFrom: [
    'src/**/*.{ts,tsx}',
    '!src/**/*.d.ts',
    '!src/__tests__/**',
    '!src/CONTRACT.ts',
    '!src/app/**', // Exclude old Next.js app directory
    '!src/pages/**', // Exclude pages from coverage (page components)
  ],

  coverageThreshold: {
    global: {
      branches: 40,
      functions: 35,
      lines: 40,
      statements: 40,
    },
  },

  // Reporters
  reporters: ['default'],

  // Timeouts
  testTimeout: 10000,

  // Verbose output
  verbose: true,

  // Clear mocks between tests
  clearMocks: true,

  // Restore mocks between tests
  restoreMocks: true,

  // Transform ES modules that Jest can't handle natively
  transformIgnorePatterns: ['node_modules/(?!(@react-pdf|react-pdf)/)'],
}
