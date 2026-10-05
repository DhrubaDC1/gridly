import {
  lightColors,
  darkColors,
  glazes,
  glazeFx,
  blockColors,
  blockColorsDark,
  spacing,
  radius,
  cellRadius,
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
        bg: '#F4F1EC',
        bgDeep: '#EAE5DC',
        spotlight: '#FBF9F5',
        surface: '#FFFFFF',
        surfaceSunken: '#E9E4DB',
        line: '#E0D9CD',
        well: '#CFC6B6',
        wellShadow: 'rgba(60,45,25,0.22)',
        cellEmpty: '#DCD5C8',
        socketTop: '#C9C0B0',
        socketBottom: '#E8E2D7',
        ink: '#1B1F2A',
        inkMuted: '#5C6372',
        accent: '#3751C8',
        accentInk: '#3751C8',
        onAccent: '#FFFFFF',
        accentSoft: '#DFE3F6',
        danger: '#C8372D',
        success: '#1E8A5F',
        star: '#F2B33D',
        starEmpty: '#D6CFC2',
        scrim: 'rgba(14,18,24,0.55)',
      });
    });

    it('contains exact dark color tokens from §9', () => {
      expect(darkColors).toEqual({
        bg: '#0E1218',
        bgDeep: '#0A0D12',
        spotlight: '#161C26',
        surface: '#171C25',
        surfaceSunken: '#12161D',
        line: '#232A36',
        well: '#0A0D12',
        wellShadow: 'rgba(0,0,0,0.5)',
        cellEmpty: '#1A1F29',
        socketTop: '#12161D',
        socketBottom: '#222834',
        ink: '#ECEFF5',
        inkMuted: '#97A1B4',
        accent: '#3751C8',
        accentInk: '#8797DE',
        onAccent: '#FFFFFF',
        accentSoft: '#1F294E',
        danger: '#FF7A6E',
        success: '#4CD39A',
        star: '#FFC452',
        starEmpty: '#2A303C',
        scrim: 'rgba(0,0,0,0.6)',
      });
    });

    it('contains 6 block colors in order from §9', () => {
      expect(blockColors).toEqual([
        '#3D6FE0', // Cobalt
        '#2FA87A', // Jade
        '#F06A4D', // Persimmon
        '#F2B33D', // Saffron
        '#8B6CF0', // Iris
        '#1FB0C2', // Lagoon
      ]);
      expect(blockColorsDark).toEqual([
        '#5B8AF0',
        '#3DC08E',
        '#FF7D5E',
        '#FFC452',
        '#A08AF7',
        '#33C4D6',
      ]);
    });

    it('contains spacing scale, radius values, and type scale from §9', () => {
      expect(spacing).toEqual([4, 8, 12, 16, 24, 32, 48]);
      expect(radius).toEqual({
        board: 20,
        cell: expect.any(Function),
        button: 14,
        card: 18,
        sheet: 24,
        chip: 999,
        buttons: 14,
        cards: 18,
        sheets: 24,
        chips: 999,
      });
      expect(cellRadius(44)).toBeCloseTo(7.04);
      expect(cellRadius(22)).toBeCloseTo(3.52);
      expect(typeScale).toEqual([12, 14, 16, 20, 28, 40, 56]);
    });

    it('contains glazes and glazeFx from §6.1', () => {
      expect(glazes).toHaveLength(6);
      expect(glazes.map((g) => g.name)).toEqual([
        'Cobalt',
        'Jade',
        'Persimmon',
        'Saffron',
        'Iris',
        'Lagoon',
      ]);
      expect(glazes.map((g) => g.glyph)).toEqual([
        'dot',
        'ring',
        'bar',
        'cross',
        'triangle',
        'diamond',
      ]);
      expect(glazeFx).toEqual({
        sheenFrom: 'rgba(255,255,255,0.22)',
        sheenTo: 'rgba(255,255,255,0)',
        glint: 'rgba(255,255,255,0.55)',
        flash: '#FFFFFF',
      });
    });
  });

  describe('Theme resolution logic', () => {
    it('uses system color scheme when theme setting is system', () => {
      const lightTheme = resolveTheme('system', 'light');
      expect(lightTheme.isDark).toBe(false);
      expect(lightTheme.bg).toBe(lightColors.bg);
      expect(lightTheme.surface).toBe(lightColors.surface);
      expect(lightTheme.onAccent).toBe(lightColors.onAccent);

      const darkTheme = resolveTheme('system', 'dark');
      expect(darkTheme.isDark).toBe(true);
      expect(darkTheme.bg).toBe(darkColors.bg);
      expect(darkTheme.surface).toBe(darkColors.surface);
      expect(darkTheme.onAccent).toBe(darkColors.onAccent);
    });

    it('overrides system scheme when theme setting is explicitly light or dark', () => {
      const explicitLight = resolveTheme('light', 'dark');
      expect(explicitLight.isDark).toBe(false);
      expect(explicitLight.bg).toBe(lightColors.bg);
      expect(explicitLight.onAccent).toBe('#FFFFFF');

      const explicitDark = resolveTheme('dark', 'light');
      expect(explicitDark.isDark).toBe(true);
      expect(explicitDark.bg).toBe(darkColors.bg);
      expect(explicitDark.onAccent).toBe('#FFFFFF');
    });

    it('exposes all tokens, blocks as base colors, and glaze with lockBase', () => {
      const lightTheme = resolveTheme('light');
      expect(lightTheme.bgDeep).toBe(lightColors.bgDeep);
      expect(lightTheme.spotlight).toBe(lightColors.spotlight);
      expect(lightTheme.surfaceSunken).toBe(lightColors.surfaceSunken);
      expect(lightTheme.wellShadow).toBe(lightColors.wellShadow);
      expect(lightTheme.socketTop).toBe(lightColors.socketTop);
      expect(lightTheme.socketBottom).toBe(lightColors.socketBottom);
      expect(lightTheme.accentSoft).toBe(lightColors.accentSoft);
      expect(lightTheme.danger).toBe(lightColors.danger);
      expect(lightTheme.success).toBe(lightColors.success);
      expect(lightTheme.star).toBe(lightColors.star);
      expect(lightTheme.starEmpty).toBe(lightColors.starEmpty);
      expect(lightTheme.scrim).toBe(lightColors.scrim);

      // blocks equal base colors
      expect(lightTheme.blocks).toEqual(glazes.map((g) => g.light.base));
      expect(lightTheme.blocks).toEqual([
        '#3D6FE0',
        '#2FA87A',
        '#F06A4D',
        '#F2B33D',
        '#8B6CF0',
        '#1FB0C2',
      ]);

      // glaze array with lockBase mixed 50% toward #8A8F99
      expect(lightTheme.glaze).toHaveLength(6);
      expect(lightTheme.glaze[0]).toEqual({
        name: 'Cobalt',
        glyph: 'dot',
        base: '#3D6FE0',
        top: '#5A88F0',
        edge: '#2448A8',
        glyphInk: 'rgba(255,255,255,0.55)',
        lockBase: '#647FBD',
      });

      const darkTheme = resolveTheme('dark');
      expect(darkTheme.blocks).toEqual(glazes.map((g) => g.dark.base));
      expect(darkTheme.glaze[0]).toEqual({
        name: 'Cobalt',
        glyph: 'dot',
        base: '#5B8AF0',
        top: '#7BA3FF',
        edge: '#3360C8',
        glyphInk: 'rgba(255,255,255,0.55)',
        lockBase: '#738DC5',
      });
    });
  });

  describe('useSettings store (§7)', () => {
    it('matches initial settings shape', () => {
      expect(useSettings.getState()).toMatchObject(DEFAULT_SETTINGS);
      expect(DEFAULT_SETTINGS).toEqual({
        sound: true,
        haptics: true,
        music: true,
        musicVolume: 0.6,
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
