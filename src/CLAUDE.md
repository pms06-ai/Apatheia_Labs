# Frontend (src/)

## Agent Roles

When working in `src/`, operate as **two distinct agents** depending on the files:

### TYPESCRIPT AGENT (CONTRACT.ts, lib/tauri/, lib/types/)

- Owns: Type definitions, Tauri command wrappers
- Does NOT touch: Rust code, React components, hooks
- CONTRACT.ts is the **SINGLE SOURCE OF TRUTH** for all types

### REACT AGENT (pages/, components/, hooks/)

- Owns: React components, pages, hooks
- Does NOT touch: CONTRACT.ts, lib/tauri/commands.ts
- NEVER makes direct invoke() calls — always uses typed wrappers
- Consumes types from CONTRACT.ts and commands from commands.ts

---

## Directory Map

| Directory     | Owner            | Purpose                 |
| ------------- | ---------------- | ----------------------- |
| `CONTRACT.ts` | TypeScript Agent | Shared type definitions |
| `lib/tauri/`  | TypeScript Agent | Tauri IPC wrappers      |
| `pages/`      | React Agent      | React Router pages      |
| `components/` | React Agent      | React components        |
| `hooks/`      | React Agent      | TanStack Query hooks    |

---

## CONTRACT.ts Rules

```typescript
// 1. Every Rust IPC struct → TypeScript interface
// Rust: pub struct Case { id: String, name: String }
export interface Case {
  id: string
  name: string
}

// 2. Enums match exactly (Rust PascalCase → TS snake_case for serde)
// Rust: pub enum Status { Active, Archived }
export type Status = 'active' | 'archived'

// 3. Option<T> → T | null
// Rust: description: Option<String>
description: string | null

// 4. Document the Rust origin
/** Rust: src-tauri/src/db/models.rs::Case */
export interface Case { ... }
```

## commands.ts Template

```typescript
import { invoke } from '@tauri-apps/api/core'
import { isDesktop } from './client'
import type { Case } from '@/CONTRACT'

/**
 * Tauri command: commands::cases::list_cases
 */
export async function listCases(): Promise<Case[]> {
  if (!isDesktop()) {
    throw new Error('listCases requires Tauri')
  }
  return invoke<Case[]>('list_cases')
}
```

## Hook Pattern (TanStack Query)

```typescript
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { listCases, createCase } from '@/lib/tauri/commands'
import type { Case } from '@/CONTRACT'

export function useCases() {
  const queryClient = useQueryClient()

  const query = useQuery({
    queryKey: ['cases'],
    queryFn: listCases,
  })

  const create = useMutation({
    mutationFn: createCase,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['cases'] }),
  })

  return {
    cases: query.data,
    isLoading: query.isLoading,
    createCase: create.mutate,
  }
}
```

## Environment Handling

```typescript
import { isDesktop } from '@/lib/tauri/client'

if (isDesktop()) {
  // Tauri commands
} else {
  // Fallback for web
}
```

## Verification

```bash
npx tsc --noEmit      # TypeScript compiles
npm run lint          # ESLint passes
npm run tauri dev     # End-to-end works
```

## Type Mapping Reference

| Rust              | TypeScript     |
| ----------------- | -------------- |
| `String`          | `string`       |
| `i32/i64/f32/f64` | `number`       |
| `bool`            | `boolean`      |
| `Option<T>`       | `T \| null`    |
| `Vec<T>`          | `T[]`          |
| `HashMap<K, V>`   | `Record<K, V>` |
| `DateTime<Utc>`   | `string` (ISO) |
