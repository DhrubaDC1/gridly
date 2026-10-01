import { getHighlightStat, pickHighlightStat } from '../statsHighlight';
import { getHighlightStat as getHighlightStatAlias } from '../highlightStat';

describe('statsHighlight helper', () => {
  describe('priority 1: perfect clears if above 0', () => {
    test('returns "Perfect clears: 2" when perfectClears is 2', () => {
      const stats = {
        perfectClears: 2,
        bestCombo: 5,
        linesCleared: 10,
      };
      expect(getHighlightStat(stats)).toBe('Perfect clears: 2');
      expect(pickHighlightStat(stats)).toBe('Perfect clears: 2');
      expect(getHighlightStatAlias(stats)).toBe('Perfect clears: 2');
    });

    test('returns "Perfect clears: 1" when perfectClears is 1 even with high combo and lines', () => {
      const stats = {
        perfectClears: 1,
        bestCombo: 8,
        linesCleared: 30,
      };
      expect(getHighlightStat(stats)).toBe('Perfect clears: 1');
    });
  });

  describe('priority 2: otherwise best combo if 2 or higher', () => {
    test('returns "Best combo this game: x6" when bestCombo is 6 and perfectClears is 0', () => {
      const stats = {
        perfectClears: 0,
        bestCombo: 6,
        linesCleared: 14,
      };
      expect(getHighlightStat(stats)).toBe('Best combo this game: x6');
      expect(pickHighlightStat(stats)).toBe('Best combo this game: x6');
    });

    test('returns "Best combo this game: x2" when bestCombo is exactly 2', () => {
      const stats = {
        perfectClears: 0,
        bestCombo: 2,
        linesCleared: 4,
      };
      expect(getHighlightStat(stats)).toBe('Best combo this game: x2');
    });

    test('does not use combo if bestCombo is 1', () => {
      const stats = {
        perfectClears: 0,
        bestCombo: 1,
        linesCleared: 7,
      };
      expect(getHighlightStat(stats)).toBe('Lines cleared: 7');
    });
  });

  describe('priority 3: otherwise lines cleared', () => {
    test('returns "Lines cleared: 14" when linesCleared is 14', () => {
      const stats = {
        perfectClears: 0,
        bestCombo: 0,
        linesCleared: 14,
      };
      expect(getHighlightStat(stats)).toBe('Lines cleared: 14');
      expect(pickHighlightStat(stats)).toBe('Lines cleared: 14');
    });

    test('returns "Lines cleared: 0" when linesCleared is 0', () => {
      const stats = {
        perfectClears: 0,
        bestCombo: 0,
        linesCleared: 0,
      };
      expect(getHighlightStat(stats)).toBe('Lines cleared: 0');
    });
  });

  describe('edge cases and fallbacks', () => {
    test('returns "Lines cleared: 0" for empty object', () => {
      expect(getHighlightStat({})).toBe('Lines cleared: 0');
    });

    test('returns "Lines cleared: 0" for null or undefined', () => {
      expect(getHighlightStat(null)).toBe('Lines cleared: 0');
      expect(getHighlightStat(undefined)).toBe('Lines cleared: 0');
    });

    test('ignores non-numeric or negative values safely', () => {
      expect(getHighlightStat({ perfectClears: -1, bestCombo: -2, linesCleared: 5 })).toBe(
        'Lines cleared: 5'
      );
      expect(getHighlightStat({ perfectClears: '2', bestCombo: null })).toBe('Lines cleared: 0');
    });
  });
});
