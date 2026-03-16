import { describe, it, expect } from 'vitest';
import { COLORS } from './colors';

describe('COLORS', () => {
  it('has correct BACKGROUND color', () => {
    expect(COLORS.BACKGROUND).toBe('#1a1a2e');
  });

  it('has correct GRID_LINE color', () => {
    expect(COLORS.GRID_LINE).toBe('#16213e');
  });

  it('has correct SNAKE_BODY color', () => {
    expect(COLORS.SNAKE_BODY).toBe('#00ff41');
  });

  it('has correct SNAKE_HEAD color', () => {
    expect(COLORS.SNAKE_HEAD).toBe('#00cc33');
  });

  it('has correct FOOD color', () => {
    expect(COLORS.FOOD).toBe('#ff0040');
  });

  it('has correct TEXT color', () => {
    expect(COLORS.TEXT).toBe('#e0e0e0');
  });

  it('has correct OVERLAY_BG color', () => {
    expect(COLORS.OVERLAY_BG).toBe('rgba(0, 0, 0, 0.7)');
  });

  it('has exactly 7 color keys', () => {
    expect(Object.keys(COLORS)).toHaveLength(7);
  });
});
