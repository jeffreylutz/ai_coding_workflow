# Snake Game Product Requirements Research

## 1. Core Gameplay Mechanics

### Snake Movement

The snake moves on a 2D grid, advancing one cell per game tick in the current direction (up, down, left, or right). The player can change direction using input controls, but the snake cannot reverse into itself — if the snake is moving right, pressing left is ignored; if moving up, pressing down is ignored. Direction changes take effect on the next tick.

### Food Spawning

Exactly one food item exists on the grid at any time. When the snake's head occupies the same cell as the food, the food is consumed:

- The snake grows by one segment (the tail does not advance on that tick).
- A new food item spawns at a random cell that is not currently occupied by any segment of the snake.

If the entire grid is filled by the snake (win condition), no food spawns and the game can display a victory message.

### Collision Detection

Two collision scenarios end the game:

1. **Self-collision**: The game ends immediately if the snake's head moves into a cell occupied by any of its body segments.
2. **Wall collision** — two configurable modes:
   - **Wall death (default)**: The game ends if the snake's head moves beyond the grid boundary.
   - **Wall wrap**: The snake wraps to the opposite side of the grid (e.g., moving right past column 19 places the head at column 0 on the same row). This mode does not trigger game over on wall contact.

The user can toggle between wall death and wall wrap modes from the menu or a settings control.

### Scoring

- Each food eaten awards **10 points**.
- The current score resets to 0 at the start of each game.
- The **high score** is tracked per user and persisted in localStorage. If the current score exceeds the stored high score at game over, the high score is updated.

### Speed / Difficulty

The snake's speed increases as the player's score grows:

- **Starting tick interval**: 150ms (the snake moves once every 150ms).
- **Minimum tick interval**: 60ms (the snake never moves faster than once every 60ms).
- **Speed increase rate**: The tick interval decreases by 2ms for each food eaten.
- At 45 food items eaten, the interval reaches the minimum (150 - 45*2 = 60ms) and stays there.

### Grid Dimensions

- **Default grid size**: 20 columns x 20 rows (400 cells total).
- **Cell size**: 20px x 20px.
- **Canvas size**: 400px x 400px (20 columns * 20px, 20 rows * 20px).

The snake starts at the center of the grid (column 10, row 10) moving to the right, with an initial length of 3 segments.

## 2. User Controls

### Keyboard Controls

| Key(s) | Action |
|--------|--------|
| Arrow Up / W | Change direction to up |
| Arrow Down / S | Change direction to down |
| Arrow Left / A | Change direction to left |
| Arrow Right / D | Change direction to right |
| Space / Enter | Start game (from menu) or restart (from game over) |
| Escape | Toggle pause/resume |

Direction inputs are buffered so that rapid key presses within a single tick are queued (up to 2 inputs) rather than lost.

### Touch / Swipe Controls

On touch devices, swipe gestures control direction:

- **Swipe up**: Change direction to up.
- **Swipe down**: Change direction to down.
- **Swipe left**: Change direction to left.
- **Swipe right**: Change direction to right.
- **Minimum swipe threshold**: 30px — swipes shorter than 30px are ignored to prevent accidental input.
- Swipe detection uses `touchstart` and `touchend` events, calculating the delta between start and end positions. The dominant axis (largest absolute delta) determines the direction.

### Pause / Resume

- Pressing **Escape** or tapping a **pause button** toggles the game between `PLAYING` and `PAUSED` states.
- While paused, the game loop stops and a semi-transparent "Paused" overlay is displayed over the canvas.
- Pausing is only available in the `PLAYING` state. Pressing Escape in other states has no effect.

## 3. Game States

The game operates as a finite state machine with four states:

```
MENU --> PLAYING --> GAME_OVER
            ^  \         |
            |   v        |
            | PAUSED     |
            |            |
            +------------+
```

### State Definitions

**MENU**
- The initial state after the user logs in.
- Displays the game title, the start button, high score, and wall mode toggle.
- Transitions to `PLAYING` when the user presses Space, Enter, or clicks the start button.

**PLAYING**
- The active game loop is running. The snake moves, food can be eaten, collisions are checked.
- Transitions to `PAUSED` when the user presses Escape or taps the pause button.
- Transitions to `GAME_OVER` when a collision (self or wall, depending on mode) is detected.

**PAUSED**
- The game loop is suspended. A semi-transparent overlay with "Paused" text is shown over the canvas.
- The score display remains visible.
- Transitions back to `PLAYING` when the user presses Escape or taps the pause button again.

**GAME_OVER**
- Displayed when a collision ends the game.
- Shows the final score, the high score (updated if beaten), and a "Play Again" button.
- Transitions to `PLAYING` (new game) when the user presses Space, Enter, or clicks "Play Again."

## 4. Visual Design Requirements

### Canvas Rendering

- The game board is rendered using an HTML5 `<canvas>` element with the 2D rendering context.
- Canvas dimensions: 400px x 400px (20 columns * 20px cell size, 20 rows * 20px cell size).
- The canvas is cleared and redrawn each frame using `requestAnimationFrame`.

### Color Scheme

| Element | Color | Hex Code |
|---------|-------|----------|
| Background | Dark navy | #1a1a2e |
| Grid lines | Subtle dark blue | #16213e |
| Snake body | Bright green | #00ff41 |
| Snake head | Lighter green | #39ff14 |
| Food | Red-pink | #ff0040 |
| Score text | White | #ffffff |
| Overlay background | Semi-transparent black | rgba(0, 0, 0, 0.7) |
| Overlay text | White | #ffffff |

### Score Display

- Current score and high score are displayed above (or below) the canvas in a styled HTML element.
- Format: `Score: 120 | High Score: 350`
- Font: monospace, 16px, color #ffffff.

### Game Over Screen

- A semi-transparent overlay (rgba(0, 0, 0, 0.7)) covers the canvas.
- Centered text displays:
  - "Game Over" in 32px bold font.
  - "Score: {score}" in 20px font.
  - "High Score: {highScore}" in 20px font.
  - A styled "Play Again" button.

### Responsive Layout

- The canvas and UI are centered horizontally and vertically on the page.
- On small screens where the viewport width is less than the canvas width + 40px (i.e., < 440px), the canvas is scaled down using `CSS transform: scale()` to fit within the viewport with 20px padding on each side.
- The scale factor is calculated as: `(viewportWidth - 40) / canvasWidth`.
- The layout recalculates on window resize.

## 5. Audio (Optional/Future)

> **Out of scope for MVP.** This section documents potential future audio features.

- **Eat sound**: A short, satisfying blip or chime when the snake eats food.
- **Game over sound**: A low-pitched buzz or descending tone on collision.
- **Background music**: Optional ambient chiptune or lo-fi loop during gameplay, toggleable.
- **Implementation note**: Future audio should use the Web Audio API for low-latency playback. Audio assets should be small (<50KB each) to maintain fast load times.

## 6. Performance Requirements

### Rendering

- Target **60fps** rendering using `requestAnimationFrame` for the render loop.
- The render loop is decoupled from the game tick — rendering happens every frame (~16.6ms), while the game state updates at the tick interval (150ms to 60ms).

### Game Loop Architecture

- The game tick (state update) runs on an accumulator-based model or via `setInterval`, independent of the frame rate.
- Each frame, the renderer draws the current game state. The tick logic advances the snake, checks collisions, and updates score.
- This separation ensures smooth animation regardless of tick speed.

### Dependencies

- **Zero external runtime dependencies** — all game logic runs in the browser with no network requests during gameplay.
- Build-time dependencies (Vite, TypeScript, Vitest) are development-only and do not affect runtime performance.

## 7. Data Persistence

### High Scores

- High scores are stored in **localStorage**.
- Key format: `snake_highscore_{userId}` where `userId` comes from the auth system's `User.id`.
- Value: a JSON number representing the highest score achieved.
- High score is read on game start and updated (if beaten) at game over.

### Game Settings

- User preferences such as wall collision mode are stored in localStorage.
- Key format: `snake_settings_{userId}`.
- Value: a JSON object, e.g., `{ "wallMode": "death" }` or `{ "wallMode": "wrap" }`.
- Settings are read on game start and applied immediately.

### No Server-Side Storage

- All persistence is client-side via localStorage. There are no API calls, no databases, and no server-side state.

## 8. Browser Compatibility

### Target Browsers

- **Chrome** 90+
- **Firefox** 90+
- **Safari** 15+
- **Edge** 90+

### Platform Support

- Must work on both **desktop** and **mobile** browsers.
- Touch controls (swipe) must function on iOS Safari and Android Chrome.

### Language Features

- Uses **ES2020** features, consistent with the project's `tsconfig.json` target.
- Key ES2020 features used: optional chaining (`?.`), nullish coalescing (`??`), `Promise.allSettled`, `BigInt` (if needed).

### APIs Used

- **Canvas 2D API**: Universally supported in all target browsers.
- **localStorage API**: Universally supported.
- **Touch Events API**: Supported in all target mobile browsers.
- **requestAnimationFrame**: Supported in all target browsers.

## 9. Integration with Existing Systems

### Authentication System (Task 1.2)

- The game UI is hidden until the user is authenticated. The `initAuth()` function in `src/auth/auth-ui.ts` manages the visibility of the `#app` container.
- When a user logs in, the `#app` container becomes visible, and the game can initialize.
- The game reads the currently authenticated user via the auth module to obtain `User.id` for scoping high scores and settings.

### User-Scoped Data

- High scores are keyed per user: `snake_highscore_{User.id}`.
- Settings are keyed per user: `snake_settings_{User.id}`.
- Switching users (logout + login as another user) should show that user's high score and settings.

### Logout Integration

- The logout button rendered by the auth system remains visible during gameplay (positioned outside the game canvas area).
- On logout, the game should stop (transition to an inactive state) and the `#app` container is hidden by the auth system. No special cleanup is needed from the game — the auth system handles UI visibility.

## 10. Functional Requirements Summary Table

| ID | Requirement | Priority | Notes |
|----|-------------|----------|-------|
| FR-01 | Snake moves on a grid in 4 directions | Must-have | Arrow keys + WASD |
| FR-02 | Food spawns at random unoccupied cell | Must-have | One food at a time |
| FR-03 | Snake grows by one segment on eating food | Must-have | Tail does not advance on eat tick |
| FR-04 | Game ends on self-collision | Must-have | Head collides with any body segment |
| FR-05 | Wall collision mode: death or wrap | Should-have | Default to wall death, user can toggle |
| FR-06 | Score tracking (10 points per food) | Must-have | Resets each game |
| FR-07 | High score persistence per user | Must-have | localStorage, keyed by User.id |
| FR-08 | Speed increases with score | Must-have | Start 150ms, min 60ms, -2ms per food |
| FR-09 | Keyboard controls (arrows + WASD) | Must-have | Direction input buffering (up to 2) |
| FR-10 | Touch/swipe controls for mobile | Should-have | 30px swipe threshold |
| FR-11 | Pause/resume functionality | Must-have | Escape key + pause button |
| FR-12 | Game state management (menu, playing, paused, game over) | Must-have | Finite state machine |
| FR-13 | Canvas-based rendering at 400x400px | Must-have | HTML5 Canvas 2D, 20x20 grid, 20px cells |
| FR-14 | Responsive layout with CSS scaling | Should-have | Scale down when viewport < 440px |
| FR-15 | 60fps rendering via requestAnimationFrame | Must-have | Decoupled from game tick |
| FR-16 | Auth system integration | Must-have | Game hidden until authenticated |
| FR-17 | Audio effects | Nice-to-have | Out of scope for MVP |
| FR-18 | Dark color scheme | Should-have | Navy background (#1a1a2e), green snake (#00ff41) |
| FR-19 | Game over overlay with score display | Must-have | Shows final score, high score, play again |
| FR-20 | Zero runtime dependencies | Must-have | No network requests during gameplay |
