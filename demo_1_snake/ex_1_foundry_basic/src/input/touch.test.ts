import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupTouchInput } from './touch';
import type { GameEvent, GameSnapshot, WallMode } from '../game/types';
import { GAME_CONFIG } from '../game/types';

function simulateSwipe(
  canvas: HTMLCanvasElement,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
): void {
  const touchStartEvent = Object.assign(new Event('touchstart', { cancelable: true }), {
    touches: [{ clientX: startX, clientY: startY }],
    preventDefault: vi.fn(),
  });
  const touchEndEvent = Object.assign(new Event('touchend', { cancelable: true }), {
    changedTouches: [{ clientX: endX, clientY: endY }],
    preventDefault: vi.fn(),
  });
  canvas.dispatchEvent(touchStartEvent);
  canvas.dispatchEvent(touchEndEvent);
}

describe('setupTouchInput', () => {
  let mockTransition: ReturnType<typeof vi.fn<(e: GameEvent) => void>>;
  let mockGetSnapshot: ReturnType<typeof vi.fn<() => GameSnapshot>>;
  let mockSetWallMode: ReturnType<typeof vi.fn<(mode: WallMode) => void>>;
  let mockGameService: { transition: (e: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void };
  let mockCanvas: HTMLCanvasElement;

  beforeEach(() => {
    mockTransition = vi.fn<(e: GameEvent) => void>();
    mockGetSnapshot = vi.fn<() => GameSnapshot>().mockReturnValue({
      state: 'PLAYING',
      snake: [{ x: 10, y: 10 }],
      food: { x: 5, y: 5 },
      score: 0,
      highScore: 0,
      wallMode: 'death',
      tickInterval: 150,
    });
    mockSetWallMode = vi.fn<(mode: WallMode) => void>();
    mockGameService = { transition: mockTransition, getSnapshot: mockGetSnapshot, setWallMode: mockSetWallMode };
    mockCanvas = document.createElement('canvas');
  });

  describe('swipe directions', () => {
    it('detects swipe right', () => {
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 100 + GAME_CONFIG.SWIPE_THRESHOLD_PX + 1, 100);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'RIGHT' });
    });

    it('detects swipe left', () => {
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 100 - GAME_CONFIG.SWIPE_THRESHOLD_PX - 1, 100);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'LEFT' });
    });

    it('detects swipe down', () => {
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 100, 100 + GAME_CONFIG.SWIPE_THRESHOLD_PX + 1);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'DOWN' });
    });

    it('detects swipe up', () => {
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 100, 100 - GAME_CONFIG.SWIPE_THRESHOLD_PX - 1);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'UP' });
    });
  });

  describe('swipe below threshold', () => {
    it('treats small swipes as taps (fires state-appropriate event)', () => {
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 110, 110);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'PAUSE' });
      expect(mockTransition).not.toHaveBeenCalledWith(
        expect.objectContaining({ type: 'DIRECTION_CHANGE' })
      );
    });
  });

  describe('diagonal swipe uses dominant axis', () => {
    it('horizontal dominant maps to RIGHT', () => {
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 150, 130);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'RIGHT' });
    });

    it('vertical dominant maps to DOWN', () => {
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 130, 150);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'DOWN' });
    });
  });

  describe('tap gestures (below swipe threshold)', () => {
    it('tap in MENU state fires START', () => {
      vi.useFakeTimers();
      mockGetSnapshot.mockReturnValue({
        state: 'MENU',
        snake: [],
        food: { x: 0, y: 0 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      vi.advanceTimersByTime(301);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'START' });
      vi.useRealTimers();
    });

    it('tap in PLAYING state fires PAUSE', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'PLAYING',
        snake: [{ x: 10, y: 10 }],
        food: { x: 5, y: 5 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'PAUSE' });
    });

    it('tap in PAUSED state fires RESUME', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'PAUSED',
        snake: [{ x: 10, y: 10 }],
        food: { x: 5, y: 5 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'RESUME' });
    });

    it('tap in GAME_OVER state fires RESTART after double-tap delay', () => {
      vi.useFakeTimers();
      mockGetSnapshot.mockReturnValue({
        state: 'GAME_OVER',
        snake: [{ x: 10, y: 10 }],
        food: { x: 5, y: 5 },
        score: 50,
        highScore: 100,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockTransition).not.toHaveBeenCalled();
      vi.advanceTimersByTime(300);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'RESTART' });
      vi.useRealTimers();
    });

    it('swipe above threshold still sends DIRECTION_CHANGE, not tap', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'PLAYING',
        snake: [{ x: 10, y: 10 }],
        food: { x: 5, y: 5 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 100 + GAME_CONFIG.SWIPE_THRESHOLD_PX + 1, 100);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'RIGHT' });
      expect(mockTransition).not.toHaveBeenCalledWith({ type: 'PAUSE' });
    });
  });

  describe('double-tap wall mode toggle', () => {
    it('double-tap in MENU state toggles wall mode from death to wrap', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'MENU',
        snake: [],
        food: { x: 0, y: 0 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockSetWallMode).toHaveBeenCalledWith('wrap');
      expect(mockTransition).not.toHaveBeenCalled();
    });

    it('double-tap in MENU state toggles wall mode from wrap to death', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'MENU',
        snake: [],
        food: { x: 0, y: 0 },
        score: 0,
        highScore: 0,
        wallMode: 'wrap',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockSetWallMode).toHaveBeenCalledWith('death');
      expect(mockTransition).not.toHaveBeenCalled();
    });

    it('double-tap in GAME_OVER state toggles wall mode from death to wrap', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'GAME_OVER',
        snake: [{ x: 10, y: 10 }],
        food: { x: 5, y: 5 },
        score: 50,
        highScore: 100,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockSetWallMode).toHaveBeenCalledWith('wrap');
      expect(mockTransition).not.toHaveBeenCalled();
    });

    it('double-tap in GAME_OVER state toggles wall mode from wrap to death', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'GAME_OVER',
        snake: [{ x: 10, y: 10 }],
        food: { x: 5, y: 5 },
        score: 50,
        highScore: 100,
        wallMode: 'wrap',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockSetWallMode).toHaveBeenCalledWith('death');
      expect(mockTransition).not.toHaveBeenCalled();
    });

    it('single tap in MENU state fires START (not setWallMode)', () => {
      vi.useFakeTimers();
      mockGetSnapshot.mockReturnValue({
        state: 'MENU',
        snake: [],
        food: { x: 0, y: 0 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      vi.advanceTimersByTime(301);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'START' });
      expect(mockSetWallMode).not.toHaveBeenCalled();
      vi.useRealTimers();
    });

    it('double-tap in PLAYING state does NOT toggle wall mode (two PAUSE events)', () => {
      mockGetSnapshot.mockReturnValue({
        state: 'PLAYING',
        snake: [{ x: 10, y: 10 }],
        food: { x: 5, y: 5 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockSetWallMode).not.toHaveBeenCalled();
      expect(mockTransition).toHaveBeenCalledTimes(2);
      expect(mockTransition).toHaveBeenCalledWith({ type: 'PAUSE' });
    });
  });

  describe('cleanup', () => {
    it('removes touch listeners after cleanup', () => {
      const cleanup = setupTouchInput(mockGameService, mockCanvas);
      cleanup();
      simulateSwipe(mockCanvas, 100, 100, 200, 100);
      expect(mockTransition).not.toHaveBeenCalled();
    });

    it('cleanup clears pending single-tap timer so stale transition does not fire', () => {
      vi.useFakeTimers();
      mockGetSnapshot.mockReturnValue({
        state: 'MENU',
        snake: [],
        food: { x: 0, y: 0 },
        score: 0,
        highScore: 0,
        wallMode: 'death',
        tickInterval: 150,
      });
      const cleanup = setupTouchInput(mockGameService, mockCanvas);
      simulateSwipe(mockCanvas, 100, 100, 105, 105);
      expect(mockTransition).not.toHaveBeenCalled();
      cleanup();
      vi.advanceTimersByTime(301);
      expect(mockTransition).not.toHaveBeenCalled();
      vi.useRealTimers();
    });
  });
});
