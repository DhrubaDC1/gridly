import React from 'react';
import {
  RoundedRect,
  Circle,
  Line,
  Path,
  Group,
} from '@shopify/react-native-skia';
import { colorblindGlyphs } from '../theme';
import { adjustBrightness } from '../boardLayout';

/**
 * Renders a colorblind accessibility glyph centered at (cx, cy).
 */
function ColorblindGlyph({ glyph, cx, cy, size }) {
  const gs = size * 0.32;
  const color = '#FFFFFF';

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
 * Pure Skia cell component.
 *
 * @param {Object} props
 * @param {number} props.x
 * @param {number} props.y
 * @param {number} props.size
 * @param {number} props.cellRadius
 * @param {number | string} props.color
 * @param {'normal' | 'gem' | 'lock'} [props.kind='normal']
 * @param {number} [props.hp=1]
 * @param {boolean} [props.colorblind=false]
 * @param {boolean} [props.ghost=false]
 * @param {Object} props.theme
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
  const colorIndex = typeof color === 'number' ? color : 0;
  const blockColor =
    typeof color === 'number'
      ? theme?.blocks?.[color] ?? theme?.blockColors?.[color] ?? '#5B7DB1'
      : color || '#5B7DB1';

  if (ghost) {
    return (
      <Group>
        <RoundedRect
          x={x}
          y={y}
          width={size}
          height={size}
          r={cellRadius}
          color={blockColor}
          style="stroke"
          strokeWidth={2}
        />
        <RoundedRect
          x={x}
          y={y}
          width={size}
          height={size}
          r={cellRadius}
          color={blockColor}
          opacity={0.25}
        />
      </Group>
    );
  }

  const darkerColor = adjustBrightness(blockColor, -25);
  const highlightColor = 'rgba(255, 255, 255, 0.35)';

  const bodyHeight = Math.max(1, size - 2);
  const cx = x + size / 2;
  const cy = y + bodyHeight / 2;

  // Diamond geometry for gem cells
  const gemD = size * 0.2;
  const gemPath = `M ${cx} ${cy - gemD} L ${cx + gemD} ${cy} L ${cx} ${
    cy + gemD
  } L ${cx - gemD} ${cy} Z`;
  const gemFacetPath = `M ${cx} ${cy - gemD} L ${cx} ${cy + gemD} M ${
    cx - gemD
  } ${cy} L ${cx + gemD} ${cy}`;

  // Border parameters for lock cells
  const lockBorderWidth = Math.max(2.5, size * 0.075);
  const lockInset = lockBorderWidth / 2 + 1;
  const lockColor = theme?.isDark ? '#E7EAF0' : '#1D2433';

  const innerInset = lockInset + lockBorderWidth + 2.5;
  const innerWidth = size - 2 * innerInset;
  const innerHeight = bodyHeight - 2 * innerInset;

  const glyphName = colorblindGlyphs[colorIndex % 6] || 'dot';

  return (
    <Group>
      {/* 2px darker bottom edge base */}

      <RoundedRect
        x={x}
        y={y}
        width={size}
        height={size}
        r={cellRadius}
        color={darkerColor}
      />

      {/* Main cell body fill */}
      <RoundedRect
        x={x}
        y={y}
        width={size}
        height={bodyHeight}
        r={cellRadius}
        color={blockColor}
      />

      {/* 1px lighter top-inner highlight */}
      <Line
        p1={{ x: x + cellRadius * 0.75, y: y + 1 }}
        p2={{ x: x + size - cellRadius * 0.75, y: y + 1 }}
        color={highlightColor}
        strokeWidth={1}
      />

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
            width={size - 2 * lockInset}
            height={bodyHeight - 2 * lockInset}
            r={Math.max(2, cellRadius - lockInset)}
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
              r={Math.max(1.5, cellRadius - innerInset)}
              color={lockColor}
              style="stroke"
              strokeWidth={Math.max(1.5, lockBorderWidth * 0.65)}
            />
          )}
        </Group>
      )}

      {/* Colorblind glyph drawn at 35% opacity */}
      {colorblind && kind !== 'gem' && (
        <Group opacity={0.35}>
          <ColorblindGlyph
            glyph={glyphName}
            cx={cx}
            cy={cy}
            size={size}
          />
        </Group>
      )}
    </Group>
  );
}
