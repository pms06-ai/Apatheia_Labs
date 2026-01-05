# Phronesis Platform - Testing Guide

## Overview

This guide covers the testing infrastructure, patterns, and best practices for the Phronesis Forensic Case Intelligence Platform.

---

## Quick Start

```bash
# Run all tests
npm test

# Run tests in watch mode (development)
npm run test:watch

# Run tests with coverage
npm run test:coverage

# Run tests for CI/CD
npm run test:ci
```

---

## Test Structure

```
src/__tests__/
├── setup.ts              # Global test setup and mocks
├── utils.tsx             # Testing utilities and custom render
├── engines/              # Engine unit tests
│   └── engines.test.ts
├── api/                  # API route tests
│   └── api.test.ts
├── components/           # React component tests
│   └── components.test.tsx
├── hooks/                # Custom hook tests
│   └── hooks.test.ts
└── lib/                  # Utility library tests
    └── lib.test.ts
```

---

## Testing Patterns

### 1. Engine Testing

Engines are tested by mocking the AI services and verifying the analysis logic:

```typescript
import { omissionEngine } from '@/lib/engines/omission'
import { createMockDocument } from '../setup'

describe('Omission Detection Engine', () => {
  beforeEach(() => {
    // Mock AI response
    (analyzeWithGemini as jest.Mock).mockResolvedValue({
      omissions: [
        { type: 'COMPLETE_OMISSION', severity: 'critical' }
      ],
      biasScore: 75,
    })
  })

  it('should detect complete omissions', async () => {
    const sourceDoc = createMockDocument({ doc_type: 'police_bundle' })
    const reportDoc = createMockDocument({ doc_type: 'social_work_assessment' })

    const result = await omissionEngine.detectOmissions(sourceDoc, reportDoc, 'case-123')

    expect(result.findings).toHaveLength(1)
    expect(result.findings[0].type).toBe('COMPLETE_OMISSION')
  })
})
```

### 2. API Route Testing

API routes are tested by creating mock requests and verifying responses:

```typescript
import { NextRequest } from 'next/server'
import { POST } from '@/app/api/engines/[engineId]/run/route'

describe('Engine Execution API', () => {
  it('should validate required fields', async () => {
    const request = new NextRequest('http://localhost/api/engines/omission/run', {
      method: 'POST',
      body: JSON.stringify({ /* missing fields */ }),
    })

    const response = await POST(request, { params: { engineId: 'omission' } })
    
    expect(response.status).toBe(400)
  })
})
```

### 3. Component Testing

Components are tested using React Testing Library:

```typescript
import { render, screen, userEvent } from '../utils'
import { FindingCard } from '@/components/analysis/finding-card'

describe('FindingCard', () => {
  it('renders finding with severity badge', async () => {
    const finding = createMockFinding({ severity: 'critical' })
    
    render(<FindingCard finding={finding} />)

    expect(screen.getByText(finding.title)).toBeInTheDocument()
    expect(screen.getByTestId('severity-badge')).toHaveTextContent('critical')
  })

  it('handles click interaction', async () => {
    const onClick = jest.fn()
    const { user } = render(<FindingCard finding={finding} onClick={onClick} />)
    
    await user.click(screen.getByRole('button'))
    
    expect(onClick).toHaveBeenCalled()
  })
})
```

### 4. Hook Testing

Custom hooks are tested using `@testing-library/react`:

```typescript
import { renderHook, waitFor } from '@testing-library/react'
import { useFindings } from '@/hooks/use-api'

describe('useFindings', () => {
  it('fetches findings for a case', async () => {
    const { result } = renderHook(() => useFindings('case-123'))

    await waitFor(() => {
      expect(result.current.isSuccess).toBe(true)
    })

    expect(result.current.data).toBeDefined()
  })
})
```

---

## Mock Utilities

### Mock Documents

```typescript
import { createMockDocument } from '../setup'

const doc = createMockDocument({
  id: 'custom-id',
  filename: 'expert-report.pdf',
  doc_type: 'expert_report',
})
```

### Mock Cases

```typescript
import { createMockCase } from '../setup'

const case = createMockCase({
  reference: 'PE23C50095',
  case_type: 'family_court',
})
```

### Mock Findings

```typescript
import { createMockFinding } from '../setup'

const finding = createMockFinding({
  engine: 'omission',
  severity: 'critical',
  title: 'NFA Decision Omitted',
})
```

### Mock API Response

```typescript
import { mockApiResponse } from '../utils'

global.fetch = mockApiResponse({ success: true, data: [...] })
```

---

## Coverage Requirements

Minimum thresholds (defined in `jest.config.ts`):

| Metric     | Threshold |
|------------|-----------|
| Branches   | 50%       |
| Functions  | 50%       |
| Lines      | 50%       |
| Statements | 50%       |

### Viewing Coverage

```bash
npm run test:coverage

# Coverage report generated at:
# - coverage/lcov-report/index.html (HTML report)
# - coverage/test-report.html (Test results)
```

---

## Mocking External Services

### AI Services (Groq, Gemini)

```typescript
jest.mock('@/lib/groq', () => ({
  analyzeWithGroq: jest.fn().mockResolvedValue({
    result: 'mock analysis',
  }),
}))

jest.mock('@/lib/gemini', () => ({
  analyzeWithGemini: jest.fn().mockResolvedValue({
    result: 'mock analysis',
  }),
}))
```

### Supabase

```typescript
jest.mock('@/lib/supabase', () => ({
  createClient: () => mockSupabaseClient,
  createAdminClient: () => mockSupabaseClient,
}))
```

### Next.js Navigation

```typescript
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
  }),
  usePathname: () => '/test',
}))
```

---

## Writing Good Tests

### Do's

✅ **Test behavior, not implementation**
```typescript
// Good: Tests what the user sees
expect(screen.getByText('Finding saved')).toBeInTheDocument()

// Bad: Tests internal state
expect(component.state.isSaved).toBe(true)
```

✅ **Use meaningful test names**
```typescript
// Good
it('should display error message when upload fails')

// Bad
it('test error')
```

✅ **Arrange-Act-Assert pattern**
```typescript
it('should filter findings by severity', async () => {
  // Arrange
  const findings = [critical, high, medium]
  render(<FindingsList findings={findings} />)

  // Act
  await user.click(screen.getByRole('button', { name: 'Critical only' }))

  // Assert
  expect(screen.getAllByTestId('finding')).toHaveLength(1)
})
```

### Don'ts

❌ **Don't test implementation details**
```typescript
// Bad: Testing internal method
expect(component.filterFindings).toHaveBeenCalled()
```

❌ **Don't use snapshot tests for dynamic content**
```typescript
// Bad: Will break on any change
expect(container).toMatchSnapshot()
```

❌ **Don't ignore async operations**
```typescript
// Bad: May have race conditions
render(<AsyncComponent />)
expect(screen.getByText('Loaded')).toBeInTheDocument()

// Good: Wait for async
await waitFor(() => {
  expect(screen.getByText('Loaded')).toBeInTheDocument()
})
```

---

## CI/CD Integration

Tests run automatically on:
- Pull requests
- Pushes to `main` and `develop`

### GitHub Actions Workflow

```yaml
- name: Run Tests
  run: npm run test:ci
  env:
    CI: true

- name: Upload Coverage
  uses: codecov/codecov-action@v4
  with:
    files: ./coverage/lcov.info
```

---

## Debugging Tests

### Interactive Mode

```bash
npm run test:watch
```

Then press:
- `p` to filter by filename
- `t` to filter by test name
- `f` to run only failed tests

### Verbose Output

```bash
npm test -- --verbose
```

### Debug Specific Test

```bash
npm test -- --testNamePattern="should detect omissions"
```

### VSCode Integration

Add to `.vscode/launch.json`:

```json
{
  "type": "node",
  "request": "launch",
  "name": "Debug Jest Tests",
  "program": "${workspaceFolder}/node_modules/.bin/jest",
  "args": ["--runInBand", "--watchAll=false"],
  "console": "integratedTerminal"
}
```

---

## Troubleshooting

### Tests timing out

Increase timeout in test file:
```typescript
jest.setTimeout(30000) // 30 seconds
```

### Mock not working

Ensure mocks are in `beforeEach`:
```typescript
beforeEach(() => {
  jest.clearAllMocks()
  (myMock as jest.Mock).mockResolvedValue(...)
})
```

### Async state not updated

Use `waitFor`:
```typescript
await waitFor(() => {
  expect(result.current.data).toBeDefined()
})
```

---

## Resources

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)
- [Testing Library Queries](https://testing-library.com/docs/queries/about)
- [User Event](https://testing-library.com/docs/user-event/intro)
