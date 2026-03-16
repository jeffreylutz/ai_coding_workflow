# Plan: Implement Game Types

## Analysis

### Spec
The spec at `demo_1_snake/openspec/specs/game-types/spec.md` defines 8 exports:
1. `Direction` — union type: `'UP' | 'DOWN' | 'LEFT' | 'RIGHT'`
2. `GameState` — union type: `'MENU' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'`
3. `WallMode` — union type: `'death' | 'wrap'`
4. `Position` — interface: `{ x: number; y: number }`
5. `GameEvent` — discriminated union on `type` field with 6 variants (5 simple + `DIRECTION_CHANGE` with `direction: Direction`)
6. `GameSnapshot` — interface with 7 fields (`state`, `snake` as `readonly Position[]`, `food`, `score`, `highScore`, `wallMode`, `tickInterval`)
7. `GameChangeCallback` — function type: `(snapshot: GameSnapshot) => void`
8. `GAME_CONFIG` — frozen const object with 15 properties

### Reference Implementation
`demo_1_snake/ex_1_foundry_basic/src/game/types.ts` (46 lines) already implements this spec exactly. It serves as the reference for the ex_2 implementation.

### Target Location
`demo_1_snake/ex_2_agtx_basic/src/game/types.ts` — directory does not exist yet, needs creation.

### Constraints
- Zero imports
- No runtime logic beyond `const` declarations
- All values use `as const` for immutability
- Must compile under `strict: true`

## Plan

### Step 1: Create directory structure
Create `demo_1_snake/ex_2_agtx_basic/src/game/` directory.

### Step 2: Create `src/game/types.ts`
Write the file with all 8 exports in this order:
1. `Direction` type alias
2. `GameState` type alias
3. `WallMode` type alias
4. `Position` interface
5. `GameEvent` discriminated union type
6. `GameSnapshot` interface
7. `GameChangeCallback` type alias
8. `GAME_CONFIG` const object with `as const`

The implementation follows the reference in ex_1 exactly — the spec is unambiguous and the reference matches it perfectly.

### Step 3: Verify
- Confirm file has zero imports
- Confirm all 8 definitions are exported
- Confirm `GAME_CONFIG` has all 15 properties with correct values
- Confirm `as const` assertions are applied

## Risks

**Low risk overall** — this is a pure types/constants module with no logic.

- **Directory structure**: The ex_2 project has no `tsconfig.json` or `package.json` yet. The types file itself will be valid TypeScript, but cannot be independently compiled until a tsconfig is added in a later task. This is acceptable — the file has zero imports and is self-contained.
- **`as const` placement**: The spec requires immutability. The `as const` on the outer object makes all properties readonly and literal-typed. The nested `INITIAL_DIRECTION` and `INITIAL_HEAD_POSITION` need their own `as const` annotations if we want literal types at those levels too (the reference implementation does this for clarity, though the outer `as const` already covers them).
