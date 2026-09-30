import { useColorScheme } from 'react-native';
import { useSettings } from '../store/useSettings';

export const lightColors = {
  bg: '#EDF0F3',
  surface: '#F8F9FB',
  well: '#DDE2E8',
  cellEmpty: '#D0D6DE',
  ink: '#1D2433',
  inkMuted: '#697386',
  accent: '#3F5FA8',
};

export const darkColors = {
  bg: '#161B24',
  surface: '#1F2531',
  well: '#1B212B',
  cellEmpty: '#28303D',
  ink: '#E7EAF0',
  inkMuted: '#8D96A8',
  accent: '#8FA7E0',
};

export const blockColors = [
  '#5B7DB1', // 0: Harbor
  '#7FA38A', // 1: Sage
  '#B07FA0', // 2: Heather
  '#D1A84B', // 3: Ochre
  '#9189C9', // 4: Lavender
  '#4E9C9A', // 5: Lagoon
];

export const blockColorsDark = [
  '#6687BC', // 0: Harbor (slightly lifted brightness)
  '#8BB097', // 1: Sage
  '#BD8DAE', // 2: Heather
  '#DCB45A', // 3: Ochre
  '#9F97D7', // 4: Lavender
  '#5AA7A5', // 5: Lagoon
];

export const colorblindGlyphs = ['dot', 'ring', 'bar', 'cross', 'triangle', 'diamond'];

export const blockDefinitions = [
  { index: 0, name: 'Harbor', color: '#5B7DB1', colorDark: '#6687BC', glyph: 'dot' },
  { index: 1, name: 'Sage', color: '#7FA38A', colorDark: '#8BB097', glyph: 'ring' },
  { index: 2, name: 'Heather', color: '#B07FA0', colorDark: '#BD8DAE', glyph: 'bar' },
  { index: 3, name: 'Ochre', color: '#D1A84B', colorDark: '#DCB45A', glyph: 'cross' },
  { index: 4, name: 'Lavender', color: '#9189C9', colorDark: '#9F97D7', glyph: 'triangle' },
  { index: 5, name: 'Lagoon', color: '#4E9C9A', colorDark: '#5AA7A5', glyph: 'diamond' },
];

export const spacing = [4, 8, 12, 16, 24, 32, 48];

export const spacingScale = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
};

export const radius = {
  board: 20,
  cells: 6,
  buttons: 14,
  sheets: 24,
};

export const typeScale = [12, 14, 16, 20, 28, 40, 56];

export const typography = {
  fonts: {
    display: 'Unbounded',
    body: 'Figtree',
  },
  weights: {
    display: [600, 700],
    body: [400, 500, 600],
  },
  scale: {
    caption: 12,
    footnote: 14,
    body: 16,
    title: 20,
    heading: 28,
    scoreGameOver: 40,
    scoreGame: 56,
  },
};

export const cellGap = 3;
export const boardMaxWidth = 420;

/**
 * Pure function resolving theme tokens given explicit themeSetting and systemScheme.
 *
 * @param {'system' | 'light' | 'dark'} [themeSetting='system']
 * @param {'light' | 'dark' | null} [systemScheme='light']
 */
export function resolveTheme(themeSetting = 'system', systemScheme = 'light') {
  const resolvedScheme =
    themeSetting === 'light' || themeSetting === 'dark'
      ? themeSetting
      : systemScheme === 'dark'
      ? 'dark'
      : 'light';

  const isDark = resolvedScheme === 'dark';
  const colors = isDark ? darkColors : lightColors;
  const blocks = isDark ? blockColorsDark : blockColors;

  return {
    isDark,
    colorScheme: resolvedScheme,
    colors,
    bg: colors.bg,
    surface: colors.surface,
    well: colors.well,
    cellEmpty: colors.cellEmpty,
    ink: colors.ink,
    inkMuted: colors.inkMuted,
    accent: colors.accent,
    blocks,
    blockColors,
    blockColorsDark,
    blockDefinitions,
    colorblindGlyphs,
    spacing,
    spacingScale,
    radius,
    typeScale,
    typography,
    cellGap,
    boardMaxWidth,
  };
}

/**
 * Returns active theme tokens based on system color scheme or useSettings override.
 */
export function useTheme() {
  const systemScheme = useColorScheme();
  const themeSetting = useSettings((state) => state.theme);
  return resolveTheme(themeSetting, systemScheme);
}
