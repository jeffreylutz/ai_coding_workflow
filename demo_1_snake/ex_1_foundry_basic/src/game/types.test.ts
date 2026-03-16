import { describe, it, expect } from 'vitest';
import { GAME_CONFIG } from './types';

describe('GAME_CONFIG', () => {
  it('has correct grid dimensions', () => {
    expect(GAME_CONFIG.GRID_COLS).toBe(20);
    expect(GAME_CONFIG.GRID_ROWS).toBe(20);
    expect(GAME_CONFIG.CELL_SIZE).toBe(20);
  });

  it('has correct canvas dimensions', () => {
    expect(GAME_CONFIG.CANVAS_WIDTH).toBe(400);
    expect(GAME_CONFIG.CANVAS_HEIGHT).toBe(400);
  });

  it('canvas dimensions equal grid times cell size', () => {
    expect(GAME_CONFIG.CANVAS_WIDTH).toBe(GAME_CONFIG.GRID_COLS * GAME_CONFIG.CELL_SIZE);
    expect(GAME_CONFIG.CANVAS_HEIGHT).toBe(GAME_CONFIG.GRID_ROWS * GAME_CONFIG.CELL_SIZE);
  });

  it('has correct timing values', () => {
    expect(GAME_CONFIG.INITIAL_TICK_MS).toBe(150);
    expect(GAME_CONFIG.MIN_TICK_MS).toBe(60);
    expect(GAME_CONFIG.TICK_DECREASE_PER_FOOD).toBe(2);
  });

  it('has correct scoring values', () => {
    expect(GAME_CONFIG.POINTS_PER_FOOD).toBe(10);
  });

  it('has correct initial snake values', () => {
    expect(GAME_CONFIG.INITIAL_SNAKE_LENGTH).toBe(3);
    expect(GAME_CONFIG.INITIAL_DIRECTION).toBe('RIGHT');
    expect(GAME_CONFIG.INITIAL_HEAD_POSITION).toEqual({ x: 10, y: 10 });
  });

  it('has correct input values', () => {
    expect(GAME_CONFIG.MAX_INPUT_QUEUE_SIZE).toBe(2);
    expect(GAME_CONFIG.SWIPE_THRESHOLD_PX).toBe(30);
  });
});
