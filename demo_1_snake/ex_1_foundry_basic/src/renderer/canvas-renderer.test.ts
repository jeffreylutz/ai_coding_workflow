import { describe, it, expect, beforeEach, vi } from 'vitest';
import { createCanvasRenderer } from './canvas-renderer';
import { GAME_CONFIG } from '../game/types';
import { COLORS } from './colors';
import type { GameSnapshot } from '../game/types';

function createMockContext(): Record<string, unknown> {
  return {
    fillStyle: '',
    strokeStyle: '',
    lineWidth: 0,
    textAlign: 'start',
    font: '',
    fillRect: vi.fn(),
    strokeRect: vi.fn(),
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
    fillText: vi.fn(),
    measureText: vi.fn(() => ({ width: 0 })),
    save: vi.fn(),
    restore: vi.fn(),
  };
}

function makeSnapshot(overrides: Partial<GameSnapshot> = {}): GameSnapshot {
  return {
    state: 'PLAYING',
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
    food: { x: 5, y: 5 },
    score: 0,
    highScore: 0,
    wallMode: 'death',
    tickInterval: 150,
    ...overrides,
  };
}

describe('createCanvasRenderer', () => {
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(createMockContext() as unknown as CanvasRenderingContext2D);
  });

  describe('canvas creation', () => {
    it('creates a canvas element', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      expect(canvas instanceof HTMLCanvasElement).toBe(true);
    });

    it('sets canvas width to GAME_CONFIG.CANVAS_WIDTH', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      expect(canvas.width).toBe(400);
    });

    it('sets canvas height to GAME_CONFIG.CANVAS_HEIGHT', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      expect(canvas.height).toBe(400);
    });

    it('sets canvas style.touchAction to none', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      expect(canvas.style.touchAction).toBe('none');
    });
  });

  describe('getCanvas', () => {
    it('returns the same canvas on repeated calls', () => {
      const renderer = createCanvasRenderer();
      const first = renderer.getCanvas();
      const second = renderer.getCanvas();
      expect(first).toBe(second);
    });
  });

  describe('getContainer', () => {
    it('returns an HTMLDivElement', () => {
      const renderer = createCanvasRenderer();
      const container = renderer.getContainer();
      expect(container instanceof HTMLDivElement).toBe(true);
    });

    it('contains the score bar as first child of the inner container', () => {
      const renderer = createCanvasRenderer();
      const inner = renderer.getContainer().firstElementChild as HTMLElement;
      expect(inner.children.length).toBe(2);
      expect(inner.children[0] instanceof HTMLDivElement).toBe(true);
    });

    it('contains the canvas as second child of the inner container', () => {
      const renderer = createCanvasRenderer();
      const inner = renderer.getContainer().firstElementChild as HTMLElement;
      expect(inner.children[1]).toBe(renderer.getCanvas());
    });

    it('returns the same container on repeated calls', () => {
      const renderer = createCanvasRenderer();
      expect(renderer.getContainer()).toBe(renderer.getContainer());
    });
  });

  describe('score bar', () => {
    it('updates score text after render', () => {
      const renderer = createCanvasRenderer();
      renderer.render(makeSnapshot({ score: 50, highScore: 200 }));
      const scoreBar = renderer.getContainer().firstElementChild!.children[0] as HTMLDivElement;
      expect(scoreBar.textContent).toContain('Score: 50');
      expect(scoreBar.textContent).toContain('High: 200');
    });
  });

  describe('render', () => {
    it('does not throw for PLAYING state snapshot', () => {
      const renderer = createCanvasRenderer();
      expect(() => renderer.render(makeSnapshot())).not.toThrow();
    });

    it('does not throw for MENU state snapshot', () => {
      const renderer = createCanvasRenderer();
      expect(() => renderer.render(makeSnapshot({ state: 'MENU', snake: [] }))).not.toThrow();
    });

    it('does not call fillRect with FOOD, SNAKE_BODY, or SNAKE_HEAD colors in MENU state', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d') as unknown as Record<string, unknown>;
      const fillStylesAtFillRect: string[] = [];
      (ctx.fillRect as ReturnType<typeof vi.fn>).mockImplementation(() => {
        fillStylesAtFillRect.push(ctx.fillStyle as string);
      });
      renderer.render(makeSnapshot({ state: 'MENU', snake: [], food: { x: 0, y: 0 } }));
      expect(fillStylesAtFillRect).not.toContain(COLORS.FOOD);
      expect(fillStylesAtFillRect).not.toContain(COLORS.SNAKE_BODY);
      expect(fillStylesAtFillRect).not.toContain(COLORS.SNAKE_HEAD);
    });

    it('does not throw for PAUSED state snapshot', () => {
      const renderer = createCanvasRenderer();
      expect(() => renderer.render(makeSnapshot({ state: 'PAUSED' }))).not.toThrow();
    });

    it('does not throw for GAME_OVER state snapshot', () => {
      const renderer = createCanvasRenderer();
      expect(() => renderer.render(makeSnapshot({ state: 'GAME_OVER', score: 50, highScore: 100 }))).not.toThrow();
    });

    it('does not throw for empty snake array', () => {
      const renderer = createCanvasRenderer();
      expect(() => renderer.render(makeSnapshot({ snake: [] }))).not.toThrow();
    });

    it('calls fillRect on the 2d context', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillRect');
      renderer.render(makeSnapshot());
      expect(spy).toHaveBeenCalled();
    });
  });

  describe('overlay text', () => {
    it('MENU overlay includes Space/Enter in start text', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'MENU', snake: [] }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Tap or Press Space/Enter to Start');
    });

    it('MENU overlay includes Snake Game title', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'MENU', snake: [] }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Snake Game');
    });

    it('MENU overlay includes high score display', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'MENU', snake: [], highScore: 42 }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('High Score: 42');
    });

    it('MENU overlay includes wall mode display', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'MENU', snake: [], wallMode: 'death' }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Wall Mode: death');
    });

    it('MENU overlay includes wall mode toggle instruction', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'MENU', snake: [] }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Double-Tap or Press W to Toggle Wall Mode');
    });

    it('PAUSED overlay includes Paused title and resume instruction text', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'PAUSED' }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Paused');
      expect(calls).toContainEqual('Tap or Press Escape to Resume');
    });

    it('GAME_OVER overlay includes Space/Enter in restart text', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'GAME_OVER', score: 10, highScore: 50 }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Tap or Press Space/Enter to Play Again');
    });

    it('GAME_OVER overlay includes Game Over title', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'GAME_OVER', score: 10, highScore: 50 }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Game Over');
    });

    it('GAME_OVER overlay includes score display', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'GAME_OVER', score: 10, highScore: 50 }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Score: 10');
    });

    it('GAME_OVER overlay includes high score display', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'GAME_OVER', score: 10, highScore: 50 }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('High Score: 50');
    });

    it('GAME_OVER overlay includes wall mode display', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'GAME_OVER', score: 10, highScore: 50, wallMode: 'wrap' }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Wall Mode: wrap');
    });

    it('GAME_OVER overlay includes wall mode toggle instruction', () => {
      const renderer = createCanvasRenderer();
      const canvas = renderer.getCanvas();
      const ctx = canvas.getContext('2d')!;
      const spy = vi.spyOn(ctx, 'fillText');
      renderer.render(makeSnapshot({ state: 'GAME_OVER', score: 10, highScore: 50 }));
      const calls = spy.mock.calls.map((c) => c[0]);
      expect(calls).toContainEqual('Double-Tap or Press W to Toggle Wall Mode');
    });
  });

  describe('resize', () => {
    // getContainer() returns the clip wrapper; the inner container holds the transform
    function getInner(renderer: ReturnType<typeof createCanvasRenderer>): HTMLElement {
      return renderer.getContainer().firstElementChild as HTMLElement;
    }

    it('applies scale transform when viewport < 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(400);
      expect(getInner(renderer).style.transform).toBe('scale(0.9)');
    });

    it('sets transformOrigin to top left when viewport < 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(400);
      expect(getInner(renderer).style.transformOrigin).toBe('top left');
    });

    it('sets clipWrapper width and overflow when viewport < 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(360);
      expect(renderer.getContainer().style.width).toBe('320px');
      expect(renderer.getContainer().style.overflow).toBe('hidden');
    });

    it('sets clipWrapper height when viewport < 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(360);
      expect(renderer.getContainer().style.height).toBe('337.6px');
    });

    it('removes transform when viewport >= 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(440);
      expect(getInner(renderer).style.transform).toBe('');
    });

    it('removes transformOrigin when viewport >= 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(440);
      expect(getInner(renderer).style.transformOrigin).toBe('');
    });

    it('clears clipWrapper width and overflow when viewport >= 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(300);
      renderer.resize(500);
      expect(renderer.getContainer().style.width).toBe('');
      expect(renderer.getContainer().style.overflow).toBe('');
    });

    it('clears clipWrapper height when viewport >= 440', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(300);
      renderer.resize(500);
      expect(renderer.getContainer().style.height).toBe('');
    });

    it('calculates correct scale for width 240', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(240);
      expect(getInner(renderer).style.transform).toBe('scale(0.5)');
    });

    it('resets transform after switching from narrow to wide', () => {
      const renderer = createCanvasRenderer();
      renderer.resize(300);
      renderer.resize(500);
      expect(getInner(renderer).style.transform).toBe('');
    });
  });
});
