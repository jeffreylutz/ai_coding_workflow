import type { Direction, GameState, WallMode, Position, GameEvent, GameSnapshot, GameChangeCallback } from './types';
import { GAME_CONFIG } from './types';

export function createGameService(userId: string) {
  let state: GameState = 'MENU';
  let snake: Position[] = [];
  let food: Position = { x: 0, y: 0 };
  let score: number = 0;
  let highScore: number = loadHighScore(userId);
  let wallMode: WallMode = loadWallMode(userId);
  let tickInterval: number = GAME_CONFIG.INITIAL_TICK_MS;
  let direction: Direction = GAME_CONFIG.INITIAL_DIRECTION;
  let inputQueue: Direction[] = [];
  let listeners: GameChangeCallback[] = [];
  let animationFrameId: number | null = null;
  let lastTickTime: number = 0;

  function loadHighScore(uid: string): number {
    try {
      const raw = localStorage.getItem('snake_highscore_' + uid);
      if (raw === null) return 0;
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  }

  function saveHighScore(uid: string, value: number): void {
    try {
      localStorage.setItem('snake_highscore_' + uid, String(value));
    } catch (e) {
      console.warn('Failed to save high score', e);
    }
  }

  function loadWallMode(uid: string): WallMode {
    try {
      const raw = localStorage.getItem('snake_settings_' + uid);
      if (raw === null) return 'death';
      const parsed = JSON.parse(raw);
      if (parsed.wallMode === 'death' || parsed.wallMode === 'wrap') {
        return parsed.wallMode;
      }
      return 'death';
    } catch {
      return 'death';
    }
  }

  function saveWallMode(uid: string, mode: WallMode): void {
    try {
      localStorage.setItem('snake_settings_' + uid, JSON.stringify({ wallMode: mode }));
    } catch (e) {
      console.warn('Failed to save wall mode', e);
    }
  }

  function notifyListeners(): void {
    const snapshot = getSnapshot();
    for (const listener of listeners) {
      listener(snapshot);
    }
  }

  function isOpposite(a: Direction, b: Direction): boolean {
    return (
      (a === 'UP' && b === 'DOWN') ||
      (a === 'DOWN' && b === 'UP') ||
      (a === 'LEFT' && b === 'RIGHT') ||
      (a === 'RIGHT' && b === 'LEFT')
    );
  }

  function spawnFood(): Position {
    const occupied = new Set(snake.map(p => p.x + ',' + p.y));
    const available: Position[] = [];
    for (let x = 0; x < GAME_CONFIG.GRID_COLS; x++) {
      for (let y = 0; y < GAME_CONFIG.GRID_ROWS; y++) {
        if (!occupied.has(x + ',' + y)) {
          available.push({ x, y });
        }
      }
    }
    if (available.length === 0) {
      transition({ type: 'COLLISION' });
      return food;
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  function resetGame(): void {
    snake = Array.from({ length: GAME_CONFIG.INITIAL_SNAKE_LENGTH }, (_, i) => ({
      x: GAME_CONFIG.INITIAL_HEAD_POSITION.x - i,
      y: GAME_CONFIG.INITIAL_HEAD_POSITION.y,
    }));
    score = 0;
    tickInterval = GAME_CONFIG.INITIAL_TICK_MS;
    direction = GAME_CONFIG.INITIAL_DIRECTION;
    inputQueue = [];
    food = spawnFood();
  }

  function startLoop(): void {
    lastTickTime = performance.now();
    function loop(timestamp: number): void {
      const elapsed = timestamp - lastTickTime;
      if (elapsed >= tickInterval) {
        tick();
        lastTickTime = timestamp;
      }
      // If tick() triggered a COLLISION transition, stopLoop() was called during
      // tick(), setting animationFrameId to null. The COLLISION branch already
      // called notifyListeners(), so only notify and reschedule if still running.
      if (animationFrameId !== null) {
        notifyListeners();
        animationFrameId = requestAnimationFrame(loop);
      }
    }
    animationFrameId = requestAnimationFrame(loop);
  }

  function stopLoop(): void {
    if (animationFrameId !== null) {
      cancelAnimationFrame(animationFrameId);
      animationFrameId = null;
    }
  }

  function transition(event: GameEvent): void {
    if (state === 'MENU' && event.type === 'START') {
      resetGame();
      state = 'PLAYING';
      startLoop();
    } else if (state === 'PLAYING' && event.type === 'PAUSE') {
      stopLoop();
      state = 'PAUSED';
      notifyListeners();
    } else if (state === 'PLAYING' && event.type === 'COLLISION') {
      stopLoop();
      if (score > highScore) {
        highScore = score;
        saveHighScore(userId, highScore);
      }
      state = 'GAME_OVER';
      notifyListeners();
    } else if (state === 'PLAYING' && event.type === 'DIRECTION_CHANGE') {
      if (inputQueue.length < GAME_CONFIG.MAX_INPUT_QUEUE_SIZE) {
        inputQueue.push(event.direction);
      }
    } else if (state === 'PAUSED' && event.type === 'RESUME') {
      state = 'PLAYING';
      startLoop();
    } else if (state === 'GAME_OVER' && event.type === 'RESTART') {
      resetGame();
      state = 'PLAYING';
      startLoop();
    }
  }

  function tick(): void {
    for (let i = 0; i < GAME_CONFIG.MAX_INPUT_QUEUE_SIZE; i++) {
      const queued = inputQueue.shift();
      if (queued !== undefined && !isOpposite(queued, direction)) {
        direction = queued;
      }
    }

    const head = snake[0];
    const newHead: Position = { x: head.x, y: head.y };

    switch (direction) {
      case 'UP': newHead.y -= 1; break;
      case 'DOWN': newHead.y += 1; break;
      case 'LEFT': newHead.x -= 1; break;
      case 'RIGHT': newHead.x += 1; break;
    }

    if (wallMode === 'death') {
      if (newHead.x < 0 || newHead.x >= GAME_CONFIG.GRID_COLS || newHead.y < 0 || newHead.y >= GAME_CONFIG.GRID_ROWS) {
        transition({ type: 'COLLISION' });
        return;
      }
    } else if (wallMode === 'wrap') {
      if (newHead.x < 0) newHead.x = GAME_CONFIG.GRID_COLS - 1;
      if (newHead.x >= GAME_CONFIG.GRID_COLS) newHead.x = 0;
      if (newHead.y < 0) newHead.y = GAME_CONFIG.GRID_ROWS - 1;
      if (newHead.y >= GAME_CONFIG.GRID_ROWS) newHead.y = 0;
    }

    for (let i = 0; i < snake.length - 1; i++) {
      if (snake[i].x === newHead.x && snake[i].y === newHead.y) {
        transition({ type: 'COLLISION' });
        return;
      }
    }

    snake.unshift(newHead);

    if (newHead.x === food.x && newHead.y === food.y) {
      score += GAME_CONFIG.POINTS_PER_FOOD;
      tickInterval = Math.max(tickInterval - GAME_CONFIG.TICK_DECREASE_PER_FOOD, GAME_CONFIG.MIN_TICK_MS);
      food = spawnFood();
    } else {
      snake.pop();
    }
  }

  function getSnapshot(): GameSnapshot {
    return {
      state,
      snake: snake.map(p => ({ x: p.x, y: p.y })),
      food: { ...food },
      score,
      highScore,
      wallMode,
      tickInterval,
    };
  }

  function onGameChange(callback: GameChangeCallback): () => void {
    listeners.push(callback);
    return () => {
      listeners = listeners.filter(l => l !== callback);
    };
  }

  function setWallMode(mode: WallMode): void {
    wallMode = mode;
    saveWallMode(userId, mode);
    notifyListeners();
  }

  function destroy(): void {
    stopLoop();
    listeners = [];
  }

  return { transition, tick, getSnapshot, onGameChange, setWallMode, destroy };
}
