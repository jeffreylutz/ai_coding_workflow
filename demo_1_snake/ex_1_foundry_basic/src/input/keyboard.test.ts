import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setupKeyboardInput } from './keyboard';
import type { GameEvent, GameSnapshot, WallMode } from '../game/types';

function makeSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    state: 'PLAYING',
    snake: [{ x: 10, y: 10 }],
    food: { x: 5, y: 5 },
    score: 0,
    highScore: 0,
    wallMode: 'death',
    tickInterval: 150,
    ...overrides,
  };
}

describe('setupKeyboardInput', () => {
  let mockTransition: ReturnType<typeof vi.fn<(e: GameEvent) => void>>;
  let mockGetSnapshot: ReturnType<typeof vi.fn<() => GameSnapshot>>;
  let mockSetWallMode: ReturnType<typeof vi.fn<(mode: WallMode) => void>>;
  let mockGameService: { transition: (e: GameEvent) => void; getSnapshot: () => GameSnapshot; setWallMode: (mode: WallMode) => void };

  beforeEach(() => {
    mockTransition = vi.fn<(e: GameEvent) => void>();
    mockGetSnapshot = vi.fn<() => GameSnapshot>().mockReturnValue(makeSnapshot());
    mockSetWallMode = vi.fn<(mode: WallMode) => void>();
    mockGameService = { transition: mockTransition, getSnapshot: mockGetSnapshot, setWallMode: mockSetWallMode };
  });

  describe('direction keys', () => {
    const cases: Array<{ key: string; direction: string }> = [
      { key: 'ArrowUp', direction: 'UP' },
      { key: 'ArrowDown', direction: 'DOWN' },
      { key: 'ArrowLeft', direction: 'LEFT' },
      { key: 'ArrowRight', direction: 'RIGHT' },
      { key: 'w', direction: 'UP' },
      { key: 's', direction: 'DOWN' },
      { key: 'a', direction: 'LEFT' },
      { key: 'd', direction: 'RIGHT' },
      { key: 'W', direction: 'UP' },
      { key: 'S', direction: 'DOWN' },
      { key: 'A', direction: 'LEFT' },
      { key: 'D', direction: 'RIGHT' },
    ];

    cases.forEach(({ key, direction }) => {
      it(`maps ${key} to ${direction}`, () => {
        const cleanup = setupKeyboardInput(mockGameService);
        document.dispatchEvent(new KeyboardEvent('keydown', { key }));
        expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction });
        cleanup();
      });
    });
  });

  describe('Space and Enter in MENU state', () => {
    it('Space triggers START', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'MENU' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(mockTransition).toHaveBeenCalledWith({ type: 'START' });
      cleanup();
    });

    it('Enter triggers START', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'MENU' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      expect(mockTransition).toHaveBeenCalledWith({ type: 'START' });
      cleanup();
    });
  });

  describe('Space and Enter in GAME_OVER state', () => {
    it('Space triggers RESTART', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'GAME_OVER' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' }));
      expect(mockTransition).toHaveBeenCalledWith({ type: 'RESTART' });
      cleanup();
    });
  });

  describe('Escape key', () => {
    it('pauses when PLAYING', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'PLAYING' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(mockTransition).toHaveBeenCalledWith({ type: 'PAUSE' });
      cleanup();
    });

    it('resumes when PAUSED', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'PAUSED' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(mockTransition).toHaveBeenCalledWith({ type: 'RESUME' });
      cleanup();
    });

    it('does nothing in MENU state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'MENU' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
      expect(mockTransition).not.toHaveBeenCalled();
      cleanup();
    });
  });

  describe('wall mode toggle in MENU state', () => {
    it('W toggles wall mode from death to wrap', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'MENU', wallMode: 'death' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
      expect(mockSetWallMode).toHaveBeenCalledWith('wrap');
      expect(mockTransition).not.toHaveBeenCalled();
      cleanup();
    });

    it('W toggles wall mode from wrap to death', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'MENU', wallMode: 'wrap' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      expect(mockSetWallMode).toHaveBeenCalledWith('death');
      expect(mockTransition).not.toHaveBeenCalled();
      cleanup();
    });

    it('W moves UP during PLAYING state, not toggle', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'PLAYING' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      expect(mockTransition).toHaveBeenCalledWith({ type: 'DIRECTION_CHANGE', direction: 'UP' });
      expect(mockSetWallMode).not.toHaveBeenCalled();
      cleanup();
    });
  });

  describe('wall mode toggle in GAME_OVER state', () => {
    it('W toggles wall mode from death to wrap in GAME_OVER', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'GAME_OVER', wallMode: 'death' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'W' }));
      expect(mockSetWallMode).toHaveBeenCalledWith('wrap');
      expect(mockTransition).not.toHaveBeenCalled();
      cleanup();
    });

    it('w toggles wall mode from wrap to death in GAME_OVER', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'GAME_OVER', wallMode: 'wrap' }));
      const cleanup = setupKeyboardInput(mockGameService);
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'w' }));
      expect(mockSetWallMode).toHaveBeenCalledWith('death');
      expect(mockTransition).not.toHaveBeenCalled();
      cleanup();
    });
  });

  describe('cleanup', () => {
    it('removes event listener after cleanup', () => {
      const cleanup = setupKeyboardInput(mockGameService);
      cleanup();
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp' }));
      expect(mockTransition).not.toHaveBeenCalled();
    });
  });

  describe('preventDefault', () => {
    it('calls preventDefault on game keys', () => {
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: 'ArrowUp', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      cleanup();
    });

    it('calls preventDefault for Space in MENU state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'MENU' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      cleanup();
    });

    it('calls preventDefault for Enter in GAME_OVER state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'GAME_OVER' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      cleanup();
    });

    it('does not call preventDefault for Space in PLAYING state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'PLAYING' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: ' ', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
      cleanup();
    });

    it('does not call preventDefault for Enter in PAUSED state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'PAUSED' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: 'Enter', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
      cleanup();
    });

    it('calls preventDefault for Escape in PLAYING state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'PLAYING' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      cleanup();
    });

    it('calls preventDefault for Escape in PAUSED state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'PAUSED' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).toHaveBeenCalled();
      cleanup();
    });

    it('does not call preventDefault for Escape in MENU state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'MENU' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
      cleanup();
    });

    it('does not call preventDefault for Escape in GAME_OVER state', () => {
      mockGetSnapshot.mockReturnValue(makeSnapshot({ state: 'GAME_OVER' }));
      const cleanup = setupKeyboardInput(mockGameService);
      const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true });
      const spy = vi.spyOn(event, 'preventDefault');
      document.dispatchEvent(event);
      expect(spy).not.toHaveBeenCalled();
      cleanup();
    });
  });
});
