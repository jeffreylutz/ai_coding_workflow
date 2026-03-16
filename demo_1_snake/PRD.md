# Snake Game — Product Requirements Document

**Version:** 1.0
**Status:** Draft
**Last Updated:** 2026-03-14
**Project:** snake-game
**Tech Stack:** TypeScript, Vite, HTML5 Canvas, localStorage

## 1. Overview

The Snake Game is a browser-based implementation of the classic arcade game, built as a static web application. It uses HTML5 Canvas for rendering the game board and snake, TypeScript for all game logic and state management, and Vite for bundling and development. All data persistence — including authentication, high scores, and user settings — is handled client-side via localStorage, with no server-side components.

## 2. Goals and Non-Goals

### 2.1 Goals

- Deliver a fully playable, polished Snake game in the browser
- Support keyboard (Arrow keys + WASD) and touch/swipe controls
- Provide per-user high score tracking via localStorage
- Achieve smooth 60fps rendering using HTML5 Canvas
- Integrate with existing client-side authentication system
- Work on modern desktop and mobile browsers without installation

### 2.2 Non-Goals

- Server-side game state or leaderboard
- Multiplayer or real-time networking
- Audio/sound effects (deferred to future release)
- Offline/PWA support
- Custom themes or skins

## 3. User Stories

### US-01: Play Snake Game

As a player, I want to control a snake on a grid to eat food and grow, so that I can enjoy a classic arcade experience.

**Acceptance Criteria:**
- Snake moves continuously in the current direction at a tick-based interval
- Arrow keys and WASD change the snake's direction
- Snake cannot reverse direction (e.g., pressing left while moving right is ignored)
- Food appears at a random unoccupied cell on the grid
- Snake grows by one segment upon eating food
- Score increases by 10 points per food eaten

### US-02: Game Over and Restart

As a player, I want the game to end when I collide with myself, and to see my score with an option to play again, so that I can try to beat my score.

**Acceptance Criteria:**
- Game ends immediately when the snake's head occupies the same cell as any body segment
- Game over screen shows final score and high score
- A "Play Again" button resets the game and starts a new round
- High score is updated if the current score exceeds it

### US-03: Wall Collision Mode

As a player, I want to choose between wall-death and wall-wrap modes, so that I can customize difficulty.

**Acceptance Criteria:**
- Default mode is wall-death (game ends on wall collision)
- Player can toggle to wall-wrap mode (snake appears on opposite side)
- Setting is persisted in localStorage per user
- Setting is accessible from the menu screen

### US-04: Pause and Resume

As a player, I want to pause and resume the game, so that I can take breaks without losing progress.

**Acceptance Criteria:**
- Pressing Escape or tapping a pause button pauses the game
- A "Paused" overlay is displayed while paused
- Pressing Escape again or tapping the overlay resumes the game
- The game loop fully stops during pause (no state changes)

### US-05: Increasing Difficulty

As a player, I want the game to get faster as I score more, so that the challenge increases over time.

**Acceptance Criteria:**
- Starting tick interval is 150ms
- Tick interval decreases by 2ms per food eaten
- Minimum tick interval is 60ms (never goes below this)

### US-06: Mobile Controls

As a mobile player, I want to use swipe gestures to control the snake, so that I can play on a touchscreen.

**Acceptance Criteria:**
- Swipe up/down/left/right changes direction
- Minimum swipe distance is 30px to avoid accidental input
- Swipe detection does not interfere with page scrolling when the game is not active

### US-07: High Score Tracking

As a player, I want my high score saved and displayed, so that I can track my best performance.

**Acceptance Criteria:**
- High score is stored in localStorage with key format `snake_highscore_{userId}`
- High score is displayed alongside current score during gameplay
- High score is shown on the game over screen
- High score persists across browser sessions

### US-08: Authentication Integration

As a user, I want the game to require login before playing, so that my scores are tied to my account.

**Acceptance Criteria:**
- Game UI is hidden until the user is authenticated via the existing auth system
- The `initAuth` function in `src/auth/auth-ui.ts` controls visibility of `#app`
- User's `id` field from the `User` interface is used for localStorage keys
- Logout button remains visible and functional during gameplay

## 4. Functional Requirements

| ID | Requirement | Priority | Category | Notes |
|----|-------------|----------|----------|-------|
| FR-01 | Snake moves on a 2D grid in 4 directions (up, down, left, right) | Must-have | Core Gameplay | One cell per tick |
| FR-02 | Food spawns at a random unoccupied cell | Must-have | Core Gameplay | One food item at a time |
| FR-03 | Snake grows by one segment when eating food | Must-have | Core Gameplay | — |
| FR-04 | Game ends on self-collision (head hits body) | Must-have | Core Gameplay | — |
| FR-05 | Wall collision mode: death (default) or wrap (toggleable) | Should-have | Core Gameplay | Persisted per user in localStorage |
| FR-06 | Score increases by 10 points per food eaten | Must-have | Scoring | — |
| FR-07 | High score persisted per user in localStorage | Must-have | Scoring | Key: `snake_highscore_{userId}` |
| FR-08 | Speed increases as score grows (150ms start, -2ms per food, 60ms min) | Must-have | Difficulty | — |
| FR-09 | Keyboard controls: Arrow keys + WASD for direction | Must-have | Controls | — |
| FR-10 | Keyboard controls: Space/Enter to start/restart, Escape to pause | Must-have | Controls | — |
| FR-11 | Touch/swipe controls for mobile (30px threshold) | Should-have | Controls | Swipe up/down/left/right |
| FR-12 | Game states: MENU, PLAYING, PAUSED, GAME_OVER | Must-have | State Management | — |
| FR-13 | Canvas-based rendering using HTML5 Canvas 2D API | Must-have | Rendering | — |
| FR-14 | 60fps render loop via requestAnimationFrame | Must-have | Performance | Separate from game tick |
| FR-15 | Responsive layout with CSS transform scaling on small screens | Should-have | UI | Scale when viewport < canvas + 40px |
| FR-16 | Auth integration: game hidden until authenticated | Must-have | Auth | Uses existing `initAuth` system |
| FR-17 | Settings persisted per user in localStorage | Should-have | Data | Key: `snake_settings_{userId}` |

## 5. Game States and Transitions

```
MENU --[Start button / Space / Enter]--> PLAYING
PLAYING --[Escape / Pause button]--> PAUSED
PLAYING --[Self-collision or wall-death collision]--> GAME_OVER
PAUSED --[Escape / Resume button]--> PLAYING
GAME_OVER --[Play Again button / Space / Enter]--> PLAYING
```

- `MENU`: Initial state after authentication. Displays start button, high score, and wall-mode toggle. No game loop running.
- `PLAYING`: Active game loop. Snake moves, food is consumed, score updates. Input changes direction or triggers pause.
- `PAUSED`: Game loop stopped. "Paused" overlay visible. Only unpause input is processed.
- `GAME_OVER`: Game loop stopped. Shows final score, high score, and "Play Again" button.

## 6. Technical Specifications

### 6.1 Grid and Rendering

- Default grid size: 20 columns x 20 rows
- Cell size: 20px x 20px
- Canvas dimensions: 400px x 400px (20 * 20)
- Render method: HTML5 Canvas 2D context (`getContext('2d')`)
- Render loop: `requestAnimationFrame` at 60fps
- Game tick: independent interval (starts at 150ms, decreases with score)

### 6.2 Color Palette

- Background: `#1a1a2e`
- Snake body: `#00ff41`
- Snake head: `#00cc33` (slightly darker than body for visual distinction)
- Food: `#ff0040`
- Grid lines: `#16213e`
- Text/UI: `#e0e0e0`
- Overlay background: `rgba(0, 0, 0, 0.7)`

### 6.3 Data Storage Keys

- High score: `snake_highscore_{userId}` (value: integer as string)
- Settings: `snake_settings_{userId}` (value: JSON string with fields `wallMode: "death" | "wrap"`)

### 6.4 Browser Compatibility

- Chrome 90+
- Firefox 90+
- Safari 15+
- Edge 90+
- Desktop and mobile browsers
- ES2020 target (matches tsconfig.json)

## 7. Non-Functional Requirements

- Performance: 60fps rendering with no frame drops during normal gameplay
- Latency: input-to-visual-response within one frame (16.7ms)
- Bundle size: total JavaScript bundle under 50KB gzipped (no external runtime dependencies)
- Accessibility: game controls documented on the menu screen; pause functionality available via keyboard and touch
- Security: no external network requests during gameplay; all data stored client-side in localStorage
- Reliability: game state is deterministic — same inputs produce same outputs

## 8. Out of Scope

- Audio/sound effects (deferred to future release)
- Server-side leaderboard or backend
- Multiplayer or networked gameplay
- PWA / offline support
- Custom themes, skins, or visual customization
- Level design or obstacles
- Power-ups or special items

## 9. Success Metrics

- Game is fully playable from start to game-over with no crashes or visual glitches
- All 17 functional requirements (FR-01 through FR-17) are implemented and testable
- Game renders at 60fps on a mid-range device (2020 smartphone or equivalent)
- Touch controls work reliably on iOS Safari and Android Chrome
- High scores persist correctly across browser sessions per user

## 10. Dependencies and Integration Points

- `src/auth/index.ts`: exports `authService` (for getting current user) and `initAuth` (for controlling app visibility)
- `src/auth/types.ts`: exports `User` interface with `id: string` used for localStorage key scoping
- `src/auth/auth-service.ts`: provides `getState()` method returning `AuthState` (contains `currentUser: User | null`)
- `src/main.ts`: entry point that calls `initAuth(appContainer)` — game initialization must happen after auth confirms the user is authenticated
- `localStorage`: used for high scores (`snake_highscore_{userId}`) and settings (`snake_settings_{userId}`)
- No external APIs or network services

## 11. Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-03-14 | Builder | Initial PRD |
