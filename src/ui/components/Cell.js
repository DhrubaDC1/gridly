import React from 'react';
import {
  RoundedRect,
  Circle,
  Line,
  Path,
  Group,
  LinearGradient,
} from '@shopify/react-native-skia';
import { colorblindGlyphs, glazeFx, resolveTheme } from '../theme';

/**
 * Renders a colorblind accessibility glyph centered at (cx, cy).
 *
 * @param {Object} props
 * @param {string} props.glyph
 * @param {number} props.cx
 * @param {number} props.cy
 * @param {number} props.size
 * @param {string} props.color
 */
function ColorblindGlyph({ glyph, cx, cy, size, color }) {
  const gs = size * 0.32;

  if (glyph === 'dot') {
    return <Circle cx={cx} cy={cy} r={gs * 0.35} color={color} />;
  }

  if (glyph === 'ring') {
    return (
      <Circle
        cx={cx}
        cy={cy}
        r={gs * 0.38}
        color={color}
        style="stroke"
        strokeWidth={2.2}
      />
    );
  }

  if (glyph === 'bar') {
    return (
      <RoundedRect
        x={cx - gs * 0.45}
        y={cy - gs * 0.15}
        width={gs * 0.9}
        height={gs * 0.3}
        r={gs * 0.15}
        color={color}
      />
    );
  }

  if (glyph === 'cross') {
    return (
      <>
        <Line
          p1={{ x: cx - gs * 0.42, y: cy }}
          p2={{ x: cx + gs * 0.42, y: cy }}
          color={color}
          strokeWidth={2.2}
        />
        <Line
          p1={{ x: cx, y: cy - gs * 0.42 }}
          p2={{ x: cx, y: cy + gs * 0.42 }}
          color={color}
          strokeWidth={2.2}
        />
      </>
    );
  }

  if (glyph === 'triangle') {
    const tr = gs * 0.45;
    const triPath = `M ${cx} ${cy - tr} L ${cx + tr * 0.866} ${
      cy + tr * 0.5
    } L ${cx - tr * 0.866} ${cy + tr * 0.5} Z`;
    return <Path path={triPath} color={color} />;
  }

  if (glyph === 'diamond') {
    const dr = gs * 0.42;
    const diaPath = `M ${cx} ${cy - dr} L ${cx + dr} ${cy} L ${cx} ${
      cy + dr
    } L ${cx - dr} ${cy} Z`;
    return (
      <Path
        path={diaPath}
        color={color}
        style="stroke"
        strokeWidth={2.2}
      />
    );
  }

  return null;
}

/**
 * Pure Skia cell component rendering glazed ceramic tiles.
 *
 * @param {Object} props
 * @param {number} props.x
 * @param {number} props.y
 * @param {number} props.size
 * @param {number} [props.cellRadius]
 * @param {number | string} props.color
 * @param {'normal' | 'gem' | 'lock'} [props.kind='normal']
 * @param {number} [props.hp=1]
 * @param {boolean} [props.colorblind=false]
 * @param {boolean} [props.ghost=false]
 * @param {Object} [props.theme]
 */
export default function Cell({
  x,
  y,
  size,
  cellRadius,
  color,
  kind = 'normal',
  hp = 1,
  colorblind = false,
  ghost = false,
  theme,
}) {
  const activeTheme = theme || resolveTheme();
  const isColorNumber = typeof color === 'number';
  const colorIndex = isColorNumber ? ((color % 6) + 6) % 6 : 0;
  const activeGlaze =
    activeTheme?.glaze?.[colorIndex] ??
    resolveTheme().glaze[colorIndex] ?? {
      base: '#3D6FE0',
      top: '#5A88F0',
      edge: '#2448A8',
      glyphInk: 'rgba(255,255,255,0.55)',
    };

  const glaze = isColorNumber
    ? activeGlaze
    : {
        base: color || activeGlaze.base,
        top: color || activeGlaze.top,
        edge: color || activeGlaze.edge,
        glyphInk: activeGlaze.glyphInk,
      };

  const fx = activeTheme?.glazeFx || glazeFx;

  const s = size;
  const e = Math.max(2, Math.round(s * 0.06));
  const r = typeof cellRadius === 'number' ? cellRadius : s * 0.16;

  // The ghost is the glaze base at 0.28 opacity plus a 2px stroke in glaze.top at 0.8 opacity,
  // with no sheen or glint.
  if (ghost) {
    return (
      <Group>
        <RoundedRect
          x={x}
          y={y}
          width={s}
          height={s}
          r={r}
          color={glaze.base}
          opacity={0.28}
        />
        <RoundedRect
          x={x}
          y={y}
          width={s}
          height={s}
          r={r}
          color={glaze.top}
          style="stroke"
          strokeWidth={2}
          opacity={0.8}
        />
      </Group>
    );
  }

  const faceHeight = s - e;
  const cx = x + s / 2;
  const cy = y + faceHeight / 2;
  const showSheenAndGlint = s >= 14;

  // Diamond geometry for gem cells
  const gemD = s * 0.2;
  const gemPath = `M ${cx} ${cy - gemD} L ${cx + gemD} ${cy} L ${cx} ${
    cy + gemD
  } L ${cx - gemD} ${cy} Z`;
  const gemFacetPath = `M ${cx} ${cy - gemD} L ${cx} ${cy + gemD} M ${
    cx - gemD
  } ${cy} L ${cx + gemD} ${cy}`;

  // Border parameters for lock cells
  const lockBorderWidth = Math.max(2.5, s * 0.075);
  const lockInset = lockBorderWidth / 2 + 1;
  const lockColor = theme?.ink ?? (theme?.isDark ? '#ECEFF5' : '#1B1F2A');

  const innerInset = lockInset + lockBorderWidth + 2.5;
  const innerWidth = s - 2 * innerInset;
  const innerHeight = faceHeight - 2 * innerInset;

  const glyphName = colorblindGlyphs[colorIndex % 6] || 'dot';

  return (
    <Group>
      {/* 1. Rounded rect (x, y, s, s) filled with glaze.edge (the bottom lip) */}
      <RoundedRect
        x={x}
        y={y}
        width={s}
        height={s}
        r={r}
        color={glaze.edge}
      />

      {/* 2. Rounded rect (x, y, s, s - e) with a vertical linear gradient from glaze.top to glaze.base */}
      <RoundedRect
        x={x}
        y={y}
        width={s}
        height={faceHeight}
        r={r}
      >
        <LinearGradient
          start={{ x, y }}
          end={{ x, y: y + faceHeight }}
          colors={[glaze.top, glaze.base]}
        />
      </RoundedRect>

      {/* 3. Sheen rounded rect at (x + 2, y + 2) sized (s - 4) by ((s - e) * 0.45), radius r - 2 */}
      {showSheenAndGlint && (
        <RoundedRect
          x={x + 2}
          y={y + 2}
          width={s - 4}
          height={faceHeight * 0.45}
          r={Math.max(0, r - 2)}
        >
          <LinearGradient
            start={{ x: x + 2, y: y + 2 }}
            end={{ x: x + 2, y: y + 2 + faceHeight * 0.45 }}
            colors={[fx.sheenFrom, fx.sheenTo]}
          />
        </RoundedRect>
      )}

      {/* 4. Glint rounded rect at (x + s * 0.14, y + s * 0.12) sized (s * 0.22) by (s * 0.07), radius s * 0.035 in glazeFx.glint */}
      {showSheenAndGlint && (
        <RoundedRect
          x={x + s * 0.14}
          y={y + s * 0.12}
          width={s * 0.22}
          height={s * 0.07}
          r={s * 0.035}
          color={fx.glint}
        />
      )}

      {/* Gem cell decoration: small diamond with facets */}
      {kind === 'gem' && (
        <Group>
          <Path path={gemPath} color="#FFFFFF" />
          <Path
            path={gemFacetPath}
            color="rgba(0, 0, 0, 0.18)"
            style="stroke"
            strokeWidth={1}
          />
        </Group>
      )}

      {/* Lock cell decoration: thick border and second ring for hp: 2 */}
      {kind === 'lock' && (
        <Group>
          <RoundedRect
            x={x + lockInset}
            y={y + lockInset}
            width={s - 2 * lockInset}
            height={faceHeight - 2 * lockInset}
            r={Math.max(2, r - lockInset)}
            color={lockColor}
            style="stroke"
            strokeWidth={lockBorderWidth}
          />
          {hp === 2 && innerWidth > 4 && innerHeight > 4 && (
            <RoundedRect
              x={x + innerInset}
              y={y + innerInset}
              width={innerWidth}
              height={innerHeight}
              r={Math.max(1.5, r - innerInset)}
              color={lockColor}
              style="stroke"
              strokeWidth={Math.max(1.5, lockBorderWidth * 0.65)}
            />
          )}
        </Group>
      )}

      {/* Colorblind glyph drawn in glaze.glyphInk */}
      {colorblind && kind !== 'gem' && (
        <ColorblindGlyph
          glyph={glyphName}
          cx={cx}
          cy={cy}
          size={s}
          color={glaze.glyphInk}
        />
      )}
    </Group>
  );
}
