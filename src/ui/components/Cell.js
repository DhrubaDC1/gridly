import React, { useEffect, useRef } from 'react';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';
import {
  RoundedRect,
  Circle,
  Line,
  Path,
  Group,
  LinearGradient,
} from '@shopify/react-native-skia';
import { colorblindGlyphs, glazeFx, resolveTheme, mixColors } from '../theme';
import icons from '../icons';
import useReduceMotion from '../useReduceMotion';

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
 * Pure Skia cell component rendering glazed ceramic tiles, gems, and locks.
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
 * @param {number} [props.index] - Board cell index (0..63)
 * @param {(listener: (events: Array<Object>) => void) => () => void} [props.subscribe]
 * @param {boolean} [props.reduceMotion]
 * @param {import('react-native-reanimated').SharedValue<number>} [props.twinkle]
 * @param {import('react-native-reanimated').SharedValue<number>} [props.crackProgress]
 * @param {import('react-native-reanimated').SharedValue<number>} [props.shakeX]
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
  index,
  subscribe,
  reduceMotion: reduceMotionProp,
  twinkle,
  crackProgress: crackProgressProp,
  shakeX: shakeXProp,
}) {
  const hookReduceMotion = useReduceMotion();
  const reduceMotion =
    typeof reduceMotionProp === 'boolean' ? reduceMotionProp : hookReduceMotion;

  // Animation values for lock crack drawing and tile shake
  const internalCrackProgress = useSharedValue(1);
  const internalShakeX = useSharedValue(0);

  const crackProgress = crackProgressProp || internalCrackProgress;
  const shakeX = shakeXProp || internalShakeX;

  const tileTransform =
    typeof useDerivedValue === 'function'
      ? useDerivedValue(() => {
          const sx = typeof shakeX?.value === 'number' ? shakeX.value : 0;
          return [{ translateX: sx }];
        })
      : [{ translateX: typeof shakeX?.value === 'number' ? shakeX.value : 0 }];

  // Listen to engine events for lockCracked
  useEffect(() => {
    if (!subscribe || typeof index !== 'number') return;
    return subscribe((events) => {
      const isCracked = events.some(
        (e) => e.type === 'lockCracked' && e.index === index
      );
      if (isCracked) {
        if (reduceMotion) {
          internalCrackProgress.value = 1;
          internalShakeX.value = 0;
        } else {
          internalCrackProgress.value = 0;
          if (typeof withTiming === 'function') {
            internalCrackProgress.value = withTiming(1, {
              duration: 160,
              easing: Easing.linear,
            });
          } else {
            internalCrackProgress.value = 1;
          }
          if (typeof withSequence === 'function') {
            internalShakeX.value = withSequence(
              withTiming(-2, { duration: 30 }),
              withTiming(2, { duration: 30 }),
              withTiming(-2, { duration: 30 }),
              withTiming(0, { duration: 30 })
            );
          }
        }
      }
    });
  }, [subscribe, index, reduceMotion, internalCrackProgress, internalShakeX]);

  // Fallback for props-driven hp change (e.g. In unit tests without subscribe)
  const prevHpRef = useRef(hp);
  useEffect(() => {
    if (prevHpRef.current === 2 && hp === 1 && !subscribe) {
      if (reduceMotion) {
        internalCrackProgress.value = 1;
        internalShakeX.value = 0;
      } else {
        internalCrackProgress.value = 0;
        if (typeof withTiming === 'function') {
          internalCrackProgress.value = withTiming(1, {
            duration: 160,
            easing: Easing.linear,
          });
        } else {
          internalCrackProgress.value = 1;
        }
        if (typeof withSequence === 'function') {
          internalShakeX.value = withSequence(
            withTiming(-2, { duration: 30 }),
            withTiming(2, { duration: 30 }),
            withTiming(-2, { duration: 30 }),
            withTiming(0, { duration: 30 })
          );
        }
      }
    }
    prevHpRef.current = hp;
  }, [hp, subscribe, reduceMotion, internalCrackProgress, internalShakeX]);

  // Gem sparkle twinkle opacity (mapped 0.3 to 0.9; fixed at 0.6 with reduceMotion)
  const derivedTwinkleOpacity =
    typeof useDerivedValue === 'function'
      ? useDerivedValue(() => {
          if (reduceMotion || !twinkle) return 0.6;
          const val = typeof twinkle?.value === 'number' ? twinkle.value : 0;
          return 0.3 + 0.6 * val;
        })
      : 0.6;
  const sparkleOpacity = reduceMotion || !twinkle ? 0.6 : derivedTwinkleOpacity;

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
      lockBase: '#647FBC',
    };

  const glaze = isColorNumber
    ? activeGlaze
    : {
        base: color || activeGlaze.base,
        top: color || activeGlaze.top,
        edge: color || activeGlaze.edge,
        glyphInk: activeGlaze.glyphInk,
        lockBase: color ? mixColors(color, '#8A8F99', 0.5) : activeGlaze.lockBase,
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

  const isLockHp2 = kind === 'lock' && hp === 2;
  const isLockHp1 = kind === 'lock' && hp === 1;

  // Lock hp 2 tile base mixed toward grey using glaze.lockBase
  const tileBase = isLockHp2 ? glaze.lockBase || glaze.base : glaze.base;

  // Gem geometry: diamond of side s * 0.42 built from 4 facet triangles with 1px outline in glaze.edge
  const gemSide = s * 0.42;
  const gemD = gemSide / Math.SQRT2;
  const sx = cx + gemD * 0.5;
  const sy = cy - gemD * 0.5;
  const sparkleSize = s * 0.12;
  const sr = sparkleSize / 2;
  const sparklePath = `M ${sx} ${sy - sr} Q ${sx} ${sy} ${sx + sr} ${sy} Q ${sx} ${sy} ${sx} ${sy + sr} Q ${sx} ${sy} ${sx - sr} ${sy} Q ${sx} ${sy} ${sx} ${sy - sr} Z`;

  // Lock hp 2 geometry: inset frame and centered lock icon scaled to s * 0.45
  const lockSize = s * 0.45;
  const lockScale = lockSize / 24;
  const lockX = cx - lockSize / 2;
  const lockY = cy - lockSize / 2;
  const frameColor = activeTheme?.isDark ? '#E9ECF2' : '#FFFFFF';
  const frameOpacity = activeTheme?.isDark ? 0.9 : 0.85;

  // Lock hp 1 geometry: crack path
  const crackPath = `M ${x + 0.22 * s} ${y + 0.18 * s} L ${x + 0.48 * s} ${y + 0.46 * s} L ${x + 0.40 * s} ${y + 0.62 * s} L ${x + 0.78 * s} ${y + 0.84 * s} M ${x + 0.48 * s} ${y + 0.46 * s} L ${x + 0.70 * s} ${y + 0.36 * s}`;

  const glyphName = colorblindGlyphs[colorIndex % 6] || 'dot';

  return (
    <Group transform={tileTransform}>
      {/* 1. Rounded rect (x, y, s, s) filled with glaze.edge (the bottom lip) */}
      <RoundedRect
        x={x}
        y={y}
        width={s}
        height={s}
        r={r}
        color={glaze.edge}
      />

      {/* 2. Rounded rect (x, y, s, s - e) with a vertical linear gradient from glaze.top to tileBase */}
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
          colors={[glaze.top, tileBase]}
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

      {/* Gem: diamond of side s * 0.42 from four facet triangles with 1px outline + 4-point sparkle */}
      {kind === 'gem' && (
        <Group>
          {/* Top-left facet triangle */}
          <Path
            path={`M ${cx} ${cy} L ${cx} ${cy - gemD} L ${cx - gemD} ${cy} Z`}
            color="#FFFFFF"
            opacity={0.95}
          />
          {/* Top-right facet triangle */}
          <Path
            path={`M ${cx} ${cy} L ${cx} ${cy - gemD} L ${cx + gemD} ${cy} Z`}
            color="#FFFFFF"
            opacity={0.75}
          />
          {/* Bottom-right facet triangle */}
          <Path
            path={`M ${cx} ${cy} L ${cx + gemD} ${cy} L ${cx} ${cy + gemD} Z`}
            color="#FFFFFF"
            opacity={0.55}
          />
          {/* Bottom-left facet triangle */}
          <Path
            path={`M ${cx} ${cy} L ${cx - gemD} ${cy} L ${cx} ${cy + gemD} Z`}
            color="#FFFFFF"
            opacity={0.80}
          />
          {/* 1px outline in glaze.edge */}
          <Path
            path={`M ${cx} ${cy - gemD} L ${cx + gemD} ${cy} L ${cx} ${cy + gemD} L ${cx - gemD} ${cy} Z`}
            color={glaze.edge}
            style="stroke"
            strokeWidth={1}
            strokeCap="round"
            strokeJoin="round"
          />
          {/* 4-point sparkle at diamond's top right */}
          <Path
            path={sparklePath}
            color="#FFFFFF"
            opacity={sparkleOpacity}
          />
        </Group>
      )}

      {/* Lock hp 2: inset frame and centered lock icon */}
      {isLockHp2 && (
        <Group>
          <RoundedRect
            x={x + 2}
            y={y + 2}
            width={s - 4}
            height={faceHeight - 4}
            r={Math.max(2, r - 2)}
            color={frameColor}
            opacity={frameOpacity}
            style="stroke"
            strokeWidth={2.5}
          />
          <Group
            transform={[
              { translateX: lockX },
              { translateY: lockY },
              { scale: lockScale },
            ]}
          >
            {(icons.lock || []).map((p, idx) => (
              <Path
                key={`lock-path-${idx}`}
                path={p}
                color="#FFFFFF"
                opacity={0.9}
                style="stroke"
                strokeWidth={2}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Group>
        </Group>
      )}

      {/* Lock hp 1: crack path with animate-on end */}
      {isLockHp1 && (
        <Path
          path={crackPath}
          color="#FFFFFF"
          opacity={0.7}
          style="stroke"
          strokeWidth={1.5}
          strokeCap="round"
          strokeJoin="round"
          start={0}
          end={crackProgress}
        />
      )}

      {/* Colorblind glyph drawn in glaze.glyphInk */}
      {colorblind && kind !== 'gem' && !isLockHp2 && (
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
