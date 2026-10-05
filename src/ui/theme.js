import { useColorScheme } from 'react-native';
import { useSettings } from '../store/useSettings';

export const lightColors = {
  bg: '#F4F1EC', // porcelain
  bgDeep: '#EAE5DC', // bottom of background gradient
  spotlight: '#FBF9F5', // radial light pool behind board
  surface: '#FFFFFF', // cards, sheets
  surfaceSunken: '#E9E4DB', // tray sockets, chips, segmented track
  line: '#E0D9CD', // hairlines
  well: '#CFC6B6', // board tray (stone)
  wellShadow: 'rgba(60,45,25,0.22)',
  cellEmpty: '#DCD5C8', // socket
  socketTop: '#C9C0B0', // 1px inner top (deboss)
  socketBottom: '#E8E2D7', // 1px inner bottom lip
  ink: '#1B1F2A', // 14.6:1 on bg
  inkMuted: '#5C6372', // 5.35:1 on bg, 6.03 on surface, 4.76 on surfaceSunken
  accent: '#3751C8', // 5.87:1 on bg
  accentInk: '#3751C8', // accent as text/outline on bg
  onAccent: '#FFFFFF', // 6.62:1 on accent
  accentSoft: '#DFE3F6',
  danger: '#C8372D', // 4.61:1 on bg
  success: '#1E8A5F',
  star: '#F2B33D',
  starEmpty: '#D6CFC2',
  scrim: 'rgba(14,18,24,0.55)',
};

export const darkColors = {
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
  ink: '#ECEFF5', // 16.3:1
  inkMuted: '#97A1B4', // 7.22:1 on bg, 6.57 on surface
  accent: '#3751C8', // fills only: 2.84:1 on bg, too low for text
  accentInk: '#8797DE', // accent as text/outline on bg, 6.72:1
  onAccent: '#FFFFFF', // 6.62:1 on accent
  accentSoft: '#1F294E',
  danger: '#FF7A6E', // 7.39:1
  success: '#4CD39A',
  star: '#FFC452',
  starEmpty: '#2A303C',
  scrim: 'rgba(0,0,0,0.6)',
};

// base / top (gradient start) / edge (bottom bevel, >=3:1 vs light cellEmpty) / glyph ink
export const glazes = [
  { name: 'Cobalt', glyph: 'dot', light: { base: '#3D6FE0', top: '#5A88F0', edge: '#2448A8' }, dark: { base: '#5B8AF0', top: '#7BA3FF', edge: '#3360C8' }, glyphInk: 'rgba(255,255,255,0.55)' },
  { name: 'Jade', glyph: 'ring', light: { base: '#2FA87A', top: '#4DC294', edge: '#1B7655' }, dark: { base: '#3DC08E', top: '#5FD7A6', edge: '#23885F' }, glyphInk: 'rgba(14,18,24,0.45)' },
  { name: 'Persimmon', glyph: 'bar', light: { base: '#F06A4D', top: '#FF8A6E', edge: '#B4402A' }, dark: { base: '#FF7D5E', top: '#FF9C82', edge: '#C24A31' }, glyphInk: 'rgba(255,255,255,0.55)' },
  { name: 'Saffron', glyph: 'cross', light: { base: '#F2B33D', top: '#FFCB62', edge: '#96660F' }, dark: { base: '#FFC452', top: '#FFD67E', edge: '#B07A1C' }, glyphInk: 'rgba(14,18,24,0.45)' },
  { name: 'Iris', glyph: 'triangle', light: { base: '#8B6CF0', top: '#A48BFA', edge: '#5A40C0' }, dark: { base: '#A08AF7', top: '#B8A6FF', edge: '#6B50D6' }, glyphInk: 'rgba(255,255,255,0.55)' },
  { name: 'Lagoon', glyph: 'diamond', light: { base: '#1FB0C2', top: '#45C8D7', edge: '#137F8D' }, dark: { base: '#33C4D6', top: '#5FD8E6', edge: '#188F9E' }, glyphInk: 'rgba(14,18,24,0.45)' },
];

export const glazeFx = {
  sheenFrom: 'rgba(255,255,255,0.22)',
  sheenTo: 'rgba(255,255,255,0)',
  glint: 'rgba(255,255,255,0.55)',
  flash: '#FFFFFF',
};

/**
 * Mix two hex colors by ratio (0 to 1).
 * Default 0.5 mixes evenly.
 *
 * @param {string} hex1
 * @param {string} hex2
 * @param {number} [ratio=0.5]
 * @returns {string}
 */
export function mixColors(hex1, hex2, ratio = 0.5) {
  const c1 = parseInt(hex1.replace('#', ''), 16);
  const c2 = parseInt(hex2.replace('#', ''), 16);
  const r = Math.round(((c1 >> 16) & 0xff) * (1 - ratio) + ((c2 >> 16) & 0xff) * ratio);
  const g = Math.round(((c1 >> 8) & 0xff) * (1 - ratio) + ((c2 >> 8) & 0xff) * ratio);
  const b = Math.round((c1 & 0xff) * (1 - ratio) + (c2 & 0xff) * ratio);
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`;
}

export const blockColors = glazes.map((g) => g.light.base);
export const blockColorsDark = glazes.map((g) => g.dark.base);

export const colorblindGlyphs = glazes.map((g) => g.glyph);

export const blockDefinitions = glazes.map((g, index) => ({
  index,
  name: g.name,
  color: g.light.base,
  colorDark: g.dark.base,
  glyph: g.glyph,
}));

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

/**
 * Computes cell radius proportionally: cellSize * 0.16
 *
 * @param {number} cellSize
 * @returns {number}
 */
export function cellRadius(cellSize) {
  return (cellSize ?? 44) * 0.16;
}

export const getCellRadius = cellRadius;
export const cell = cellRadius;

export const radius = {
  board: 20,
  cell: cellRadius,
  button: 14,
  card: 18,
  sheet: 24,
  chip: 999,
  // Plural aliases for backward compatibility
  buttons: 14,
  cards: 18,
  sheets: 24,
  chips: 999,
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

  const glaze = glazes.map((g) => {
    const schemeGlaze = g[resolvedScheme];
    return {
      name: g.name,
      glyph: g.glyph,
      base: schemeGlaze.base,
      top: schemeGlaze.top,
      edge: schemeGlaze.edge,
      glyphInk: g.glyphInk,
      lockBase: mixColors(schemeGlaze.base, '#8A8F99', 0.5),
    };
  });

  return {
    isDark,
    colorScheme: resolvedScheme,
    colors,
    ...colors,
    // Explicit token aliases guaranteeing backward-compat
    bg: colors.bg,
    surface: colors.surface,
    well: colors.well,
    cellEmpty: colors.cellEmpty,
    ink: colors.ink,
    inkMuted: colors.inkMuted,
    accent: colors.accent,
    onAccent: colors.onAccent,
    blocks,
    glaze,
    glazes,
    glazeFx,
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
