# Plan: Implement Color Constants

## Analysis

- **Spec**: `openspec/specs/rendering/spec.md` — "Requirement: Color Constants" defines exactly 7 color values in a `COLORS` object exported from `src/renderer/colors.ts`.
- **Reference implementation**: `demo_1_snake/ex_1_foundry_basic/src/renderer/colors.ts` already implements this spec. It's a 9-line file exporting a single `as const` object.
- **Target project**: `demo_1_snake/ex_2_agtx_basic/` currently has no `src/` directory — this is the first source file.
- **No dependencies**: `colors.ts` is a standalone module with no imports. It is consumed by the renderer (`canvas-renderer.ts`) but has no upstream dependencies.

## Plan

### Step 1: Create `src/renderer/colors.ts`

Create the file at `demo_1_snake/ex_2_agtx_basic/src/renderer/colors.ts` with:

```typescript
export const COLORS = {
  BACKGROUND: '#1a1a2e',
  GRID_LINE: '#16213e',
  SNAKE_BODY: '#00ff41',
  SNAKE_HEAD: '#00cc33',
  FOOD: '#ff0040',
  TEXT: '#e0e0e0',
  OVERLAY_BG: 'rgba(0, 0, 0, 0.7)',
} as const;
```

**Why `as const`**: This narrows each value from `string` to its literal type (e.g., `'#1a1a2e'` instead of `string`), making the object deeply readonly at the type level. No runtime cost — purely a compile-time constraint.

### Step 2: Verify

- Confirm all 7 keys match the spec exactly (names and values).
- Confirm `as const` is present for immutability.

No test file is scoped for this task, but the reference test in `ex_1_foundry_basic/src/renderer/colors.test.ts` shows the expected assertions if tests are added later.

## Risks

- **Minimal risk**: This is a pure data file with no logic, no imports, and no side effects.
- **Directory creation**: `src/renderer/` doesn't exist yet — must create the directory path.
- **No `package.json` or `tsconfig.json`**: The project has no build tooling yet. This file will compile correctly once TypeScript is configured in a later task. It's valid standalone TypeScript.
