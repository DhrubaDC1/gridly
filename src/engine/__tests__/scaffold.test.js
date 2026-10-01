import {
  lightColors,
  darkColors,
  blockColors,
  blockColorsDark,
  spacing,
  radius,
  typeScale,
  resolveTheme,
} from '../../ui/theme';
import { useProgress, INITIAL_STATS, INITIAL_PROGRESS } from '../../store/useProgress';
import { useSettings, DEFAULT_SETTINGS } from '../../store/useSettings';

describe('Phase 0 - Scaffold & Theme', () => {
  beforeEach(() => {
    useSettings.getState().resetSettings();
    useProgress.getState().resetProgress();
  });

  describe('Theme tokens (§9)', () => {
    it('contains exact light color tokens from §9', () => {
      expect(lightColors).toEqual({
        bg: '#EDF0F3',
        surface: '#F8F9FB',
        well: '#DDE2E8',
        cellEmpty: '#D0D6DE',
        ink: '#1D2433',
        inkMuted: '#697386',
        accent: '#3F5FA8',
      });
    });

    it('contains exact dark color tokens from §9', () => {
      expect(darkColors).toEqual({
        bg: '#161B24',
        surface: '#1F2531',
        well: '#1B212B',
        cellEmpty: '#28303D',
        ink: '#E7EAF0',
        inkMuted: '#8D96A8',
        accent: '#8FA7E0',
      });
    });

    it('contains 6 block colors in order from §9', () => {
      expect(blockColors).toEqual([
        '#5B7DB1', // Harbor
        '#7FA38A', // Sage
        '#B07FA0', // Heather
        '#D1A84B', // Ochre
        '#9189C9', // Lavender
        '#4E9C9A', // Lagoon
      ]);
      expect(blockColorsDark).toHaveLength(6);
    });

    it('contains spacing scale, radius values, and type scale from §9', () => {
      expect(spacing).toEqual([4, 8, 12, 16, 24, 32, 48]);
      expect(radius).toEqual({
        board: 20,
        cells: 6,
        buttons: 14,
        sheets: 24,
      });
      expect(typeScale).toEqual([12, 14, 16, 20, 28, 40, 56]);
    });
  });

  describe('Theme resolution logic', () => {
    it('uses system color scheme when theme setting is system', () => {
      const lightTheme = resolveTheme('system', 'light');
      expect(lightTheme.isDark).toBe(false);
      expect(lightTheme.bg).toBe(lightColors.bg);
      expect(lightTheme.surface).toBe(lightColors.surface);

      const darkTheme = resolveTheme('system', 'dark');
      expect(darkTheme.isDark).toBe(true);
      expect(darkTheme.bg).toBe(darkColors.bg);
      expect(darkTheme.surface).toBe(darkColors.surface);
    });

    it('overrides system scheme when theme setting is explicitly light or dark', () => {
      const explicitLight = resolveTheme('light', 'dark');
      expect(explicitLight.isDark).toBe(false);
      expect(explicitLight.bg).toBe(lightColors.bg);

      const explicitDark = resolveTheme('dark', 'light');
      expect(explicitDark.isDark).toBe(true);
      expect(explicitDark.bg).toBe(darkColors.bg);
    });
  });

  describe('useSettings store (§7)', () => {
    it('matches initial settings shape', () => {
      expect(useSettings.getState()).toMatchObject(DEFAULT_SETTINGS);
      expect(DEFAULT_SETTINGS).toEqual({
        sound: true,
        haptics: true,
        theme: 'system',
        colorblind: false,
        reduceMotion: 'system',
        seenOnboarding: false,
      });
    });

    it('allows updating settings', () => {
      const { setSound, setHaptics, setTheme, setColorblind, setReduceMotion } =
        useSettings.getState();

      setSound(false);
      setHaptics(false);
      setTheme('dark');
      setColorblind(true);
      setReduceMotion('on');

      expect(useSettings.getState()).toMatchObject({
        sound: false,
        haptics: false,
        theme: 'dark',
        colorblind: true,
        reduceMotion: 'on',
      });
    });
  });

  describe('useProgress store (§7)', () => {
    it('matches useProgress initial shape with sensible zeroes', () => {
      const state = useProgress.getState();
      expect(state.version).toBe(1);
      expect(state.achievements).toEqual({});
      expect(state.adventure).toEqual({
        unlocked: 1,
        stars: {},
        best: {},
      });
      expect(state.inProgress).toEqual({
        classic: null,
      });

      expect(state.stats).toEqual({
        gamesPlayed: {
          classic: 0,
          blitz: 0,
          adventure: 0,
        },
        bestScore: {
          classic: 0,
          blitz: 0,
          adventure: 0,
        },
        totalLinesCleared: 0,
        bestCombo: 0,
        perfectClears: 0,
        monoLines: 0,
        totalPiecesPlaced: 0,
        holdsUsed: 0,
        totalPlayTime: 0,
        currentStreak: 0,
        bestStreak: 0,
        lastPlayedDay: null,
      });
    });

    it('allows updating stats, achievements, adventure, and inProgress', () => {
      const {
        updateStats,
        unlockAchievement,
        setAdventureProgress,
        setInProgress,
        clearInProgress,
      } = useProgress.getState();

      updateStats({ totalLinesCleared: 10, bestCombo: 4 });
      expect(useProgress.getState().stats.totalLinesCleared).toBe(10);
      expect(useProgress.getState().stats.bestCombo).toBe(4);

      unlockAchievement('first_clear', '2026-10-01T12:00:00Z');
      expect(useProgress.getState().achievements).toEqual({
        first_clear: '2026-10-01T12:00:00Z',
      });

      setAdventureProgress({ unlocked: 2, levelId: 1, stars: 3, score: 2500 });
      expect(useProgress.getState().adventure).toEqual({
        unlocked: 2,
        stars: { 1: 3 },
        best: { 1: 2500 },
      });

      setInProgress('classic', { score: 120 });
      expect(useProgress.getState().inProgress.classic).toEqual({ score: 120 });

      clearInProgress('classic');
      expect(useProgress.getState().inProgress.classic).toBeNull();
    });
  });
});
