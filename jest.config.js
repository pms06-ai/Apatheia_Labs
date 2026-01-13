/**
 * Jest Configuration for Apatheia Labs
 * 
 * Supports:
 * - TypeScript with SWC
 * - React Testing Library
 * - Module path aliases
 * - Coverage reporting
 */

const nextJest = require('next/jest')

const createJestConfig = nextJest({
    // Provide the path to your Next.js app to load next.config.js and .env files
    dir: './',
})

/** @type {import('jest').Config} */
const config = {
    // Test environment
    testEnvironment: 'jsdom',

    // Setup files
    setupFilesAfterEnv: ['<rootDir>/src/__tests__/setup.ts'],

    // Module resolution
    moduleNameMapper: {
        '^@/(.*)$': '<rootDir>/src/$1',
    },

    // Test file patterns
    testMatch: [
        '**/__tests__/**/*.test.ts',
        '**/__tests__/**/*.test.tsx',
    ],

    // Ignore patterns
    testPathIgnorePatterns: [
        '<rootDir>/node_modules/',
        '<rootDir>/.next/',
        '<rootDir>/src/__tests__/setup.ts',
        '<rootDir>/src/__tests__/utils.tsx',
    ],

    // Module path ignore (fixes Haste collision with src-tauri/target)
    modulePathIgnorePatterns: [
        '<rootDir>/src-tauri/target/',
    ],

    // Coverage configuration
    collectCoverageFrom: [
        'src/**/*.{ts,tsx}',
        '!src/**/*.d.ts',
        '!src/__tests__/**',
        '!src/CONTRACT.ts',
    ],

    coverageThreshold: {
        global: {
            branches: 80,
            functions: 80,
            lines: 80,
            statements: 80,
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
    transformIgnorePatterns: [
        'node_modules/(?!(@react-pdf|react-pdf)/)',
    ],
}

module.exports = createJestConfig(config)
