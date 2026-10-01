import {
  POINTS_PER_CELL,
  LINE_CLEAR_BASE_POINTS,
  EXTRA_LINE_POINTS,
  MONO_LINE_BONUS,
  COMBO_MULTIPLIER_STEP,
  PERFECT_CLEAR_BONUS,
  getLineClearScore,
  getComboMultiplier,
  calculateScore,
} from '../scoring';

describe('Scoring Engine (§5)', () => {
  describe('Tuning constants', () => {
    it('defines all required scoring constants', () => {
      expect(POINTS_PER_CELL).toBe(1);
      expect(LINE_CLEAR_BASE_POINTS).toEqual({
        1: 100,
        2: 300,
        3: 600,
        4: 1000,
      });
      expect(EXTRA_LINE_POINTS).toBe(500);
      expect(MONO_LINE_BONUS).toBe(500);
      expect(COMBO_MULTIPLIER_STEP).toBe(0.5);
      expect(PERFECT_CLEAR_BONUS).toBe(2000);
    });
  });

  describe('Placement scoring (+1 per cell)', () => {
    it('awards 0 points when 0 cells are placed and no clears', () => {
      const result = calculateScore({ cellsPlaced: 0 });
      expect(result.delta).toBe(0);
      expect(result.breakdown.cells).toBe(0);
    });

    it('awards +1 point per cell placed', () => {
      expect(calculateScore({ cellsPlaced: 1 }).delta).toBe(1);
      expect(calculateScore({ cellsPlaced: 4 }).delta).toBe(4);
      expect(calculateScore({ cellsPlaced: 9 }).delta).toBe(9);
    });
  });

  describe('Line clear points (L=1: 100, L=2: 300, L=3: 600, L=4: 1000, L>=5: 1000 + 500 * (L-4))', () => {
    it('calculates 0 for 0 lines', () => {
      expect(getLineClearScore(0)).toBe(0);
      expect(getLineClearScore(-1)).toBe(0);
    });

    it('calculates 100 for 1 line', () => {
      const result = calculateScore({ cellsPlaced: 4, linesCleared: 1 });
      expect(result.breakdown.lines).toBe(100);
      expect(result.delta).toBe(4 + 100);
    });

    it('calculates 300 for 2 lines', () => {
      const result = calculateScore({ cellsPlaced: 4, linesCleared: 2 });
      expect(result.breakdown.lines).toBe(300);
      expect(result.delta).toBe(4 + 300);
    });

    it('calculates 600 for 3 lines', () => {
      const result = calculateScore({ cellsPlaced: 4, linesCleared: 3 });
      expect(result.breakdown.lines).toBe(600);
      expect(result.delta).toBe(4 + 600);
    });

    it('calculates 1000 for 4 lines', () => {
      const result = calculateScore({ cellsPlaced: 4, linesCleared: 4 });
      expect(result.breakdown.lines).toBe(1000);
      expect(result.delta).toBe(4 + 1000);
    });

    it('calculates 1500 for 5 lines (1000 + 500 * 1)', () => {
      const result = calculateScore({ cellsPlaced: 5, linesCleared: 5 });
      expect(result.breakdown.lines).toBe(1500);
      expect(result.delta).toBe(5 + 1500);
    });

    it('calculates 2000 for 6 lines (1000 + 500 * 2)', () => {
      const result = calculateScore({ cellsPlaced: 5, linesCleared: 6 });
      expect(result.breakdown.lines).toBe(2000);
      expect(result.delta).toBe(5 + 2000);
    });

    it('calculates 3000 for 8 lines (1000 + 500 * 4)', () => {
      const result = calculateScore({ cellsPlaced: 5, linesCleared: 8 });
      expect(result.breakdown.lines).toBe(3000);
      expect(result.delta).toBe(5 + 3000);
    });
  });

  describe('Mono line bonus (+500 per mono line)', () => {
    it('awards +500 for 1 mono line', () => {
      const result = calculateScore({
        cellsPlaced: 4,
        linesCleared: 1,
        monoLines: 1,
      });
      expect(result.breakdown.mono).toBe(500);
      expect(result.breakdown.lines).toBe(100);
      expect(result.breakdown.clears).toBe(600);
      expect(result.delta).toBe(4 + 600);
    });

    it('awards +1000 for 2 mono lines', () => {
      const result = calculateScore({
        cellsPlaced: 4,
        linesCleared: 2,
        monoLines: 2,
      });
      expect(result.breakdown.mono).toBe(1000);
      expect(result.breakdown.lines).toBe(300);
      expect(result.breakdown.clears).toBe(1300);
      expect(result.delta).toBe(4 + 1300);
    });
  });

  describe('Combo multiplier math (1 + 0.5 * (combo - 1))', () => {
    it('gives multiplier 1 when combo is 0 or 1', () => {
      expect(getComboMultiplier(0)).toBe(1);
      expect(getComboMultiplier(1)).toBe(1);
      expect(getComboMultiplier(-1)).toBe(1);
    });

    it('gives multiplier 1.5 when combo is 2', () => {
      expect(getComboMultiplier(2)).toBe(1.5);
    });

    it('gives multiplier 2.0 when combo is 3', () => {
      expect(getComboMultiplier(3)).toBe(2.0);
    });

    it('gives multiplier 2.5 when combo is 4', () => {
      expect(getComboMultiplier(4)).toBe(2.5);
    });

    it('applies combo multiplier to line clear and mono bonus only', () => {
      // 4 cells placed, 2 lines cleared (300), 1 mono line (500), combo 3 (multiplier 2.0)
      // clears = (300 + 500) * 2.0 = 1600
      // cells = 4 (NOT multiplied by 2.0)
      // delta = 4 + 1600 = 1604
      const result = calculateScore({
        cellsPlaced: 4,
        linesCleared: 2,
        monoLines: 1,
        combo: 3,
      });
      expect(result.breakdown.cells).toBe(4);
      expect(result.breakdown.lines).toBe(300);
      expect(result.breakdown.mono).toBe(500);
      expect(result.breakdown.comboMultiplier).toBe(2.0);
      expect(result.breakdown.clears).toBe(1600);
      expect(result.delta).toBe(1604);
    });

    it('does not multiply placement score when no lines are cleared', () => {
      const result = calculateScore({
        cellsPlaced: 5,
        linesCleared: 0,
        combo: 4,
      });
      expect(result.breakdown.cells).toBe(5);
      expect(result.breakdown.clears).toBe(0);
      expect(result.delta).toBe(5);
    });
  });

  describe('Perfect Clear (+2000, not multiplied)', () => {
    it('awards +2000 points for a perfect clear with combo 1', () => {
      const result = calculateScore({
        cellsPlaced: 1,
        linesCleared: 1,
        combo: 1,
        perfectClear: true,
      });
      expect(result.breakdown.perfectClear).toBe(2000);
      expect(result.delta).toBe(1 + 100 + 2000);
    });

    it('does NOT multiply the +2000 perfect clear bonus by combo multiplier', () => {
      // combo 3 -> multiplier 2.0
      // line clear = 100 * 2.0 = 200
      // cells = 4
      // perfect clear = 2000 (NOT 4000)
      // total delta = 4 + 200 + 2000 = 2204
      const result = calculateScore({
        cellsPlaced: 4,
        linesCleared: 1,
        combo: 3,
        perfectClear: true,
      });
      expect(result.breakdown.comboMultiplier).toBe(2.0);
      expect(result.breakdown.clears).toBe(200);
      expect(result.breakdown.perfectClear).toBe(2000);
      expect(result.delta).toBe(2204);
    });

    it('works with multi-line clear, mono bonus, combo, and perfect clear', () => {
      // 4 cells placed, 2 lines (300), 2 mono (1000), combo 4 (multiplier 2.5), perfectClear true
      // clears = (300 + 1000) * 2.5 = 1300 * 2.5 = 3250
      // cells = 4
      // perfect clear = 2000
      // total delta = 4 + 3250 + 2000 = 5254
      const result = calculateScore({
        cellsPlaced: 4,
        linesCleared: 2,
        monoLines: 2,
        combo: 4,
        perfectClear: true,
      });
      expect(result.breakdown.clears).toBe(3250);
      expect(result.breakdown.perfectClear).toBe(2000);
      expect(result.delta).toBe(5254);
    });
  });

  describe('Default parameters', () => {
    it('safely handles empty input object', () => {
      const result = calculateScore();
      expect(result.delta).toBe(0);
      expect(result.breakdown).toEqual({
        cells: 0,
        lines: 0,
        mono: 0,
        comboMultiplier: 1,
        clears: 0,
        perfectClear: 0,
      });
    });
  });
});
