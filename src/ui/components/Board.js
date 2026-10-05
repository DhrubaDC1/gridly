import React, {
  useState,
  useEffect,
  useCallback,
  useMemo,
  useRef,
} from 'react';
import {
  Canvas,
  RoundedRect,
  Group,
  Line,
  Path,
  Circle,
  Shadow,
  Picture,
  createPicture,
  Skia,
} from '@shopify/react-native-skia';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
import { STAGGER_MS_PER_CELL, CLEAR_DURATION_MS } from '../../game/clearWave';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';
import { useSettings } from '../../store/useSettings';
import {
  BOARD_RADIUS,
  TOTAL_BOARD_CELLS,
  getDefaultBoardSize,
  getBoardMetrics,
  getCellPosition,
  getSocketLines,
} from '../boardLayout';
import Cell from './Cell';

// Clear wave timing (§10): 50ms glint, then 220ms shrink; shards outlive the cell.
const FLASH_MS = 50;
const SHARD_MS = 420;
const BEAM_MS = 320;
const SHARD_SPREAD = [-0.75, -0.25, 0.25, 0.75];
const SHARD_SPEED = [1.5, 2.1, 1.9, 1.4];

/**
 * Individual clearing cell: glint flash and pop, ease-in shrink, then glaze
 * shards that burst away from the placement center.
 */
function ClearingCell({
  cell,
  center,
  waveTime,
  reduceMotion,
  cellSize,
  cellRadius,
  padding,
  gap,
  theme,
  isColorblind,
  twinkle,
}) {
  const { x, y } = getCellPosition(cell.index, cellSize, padding, gap);
  const cx = x + cellSize / 2;
  const cy = y + cellSize / 2;

  const distance =
    typeof cell.distance === 'number'
      ? cell.distance
      : Math.max(
          Math.abs(cell.row - center.row),
          Math.abs(cell.col - center.col)
        );

  const delay = reduceMotion ? 0 : distance * STAGGER_MS_PER_CELL;
  const flashMs = reduceMotion ? FLASH_MS / 2 : FLASH_MS;
  const shrinkMs = reduceMotion ? CLEAR_DURATION_MS / 2 : CLEAR_DURATION_MS;

  // Shards fly away from where the piece landed (the clear center itself spins out evenly).
  const baseAngle =
    cell.row === center.row && cell.col === center.col
      ? cell.index * 1.3
      : Math.atan2(cell.row - center.row, cell.col - center.col);
  const shardSize = cellSize * 0.26;
  const gravity = cellSize * 1.4;
  const shardColor =
    cell.kind === 'gem'
      ? theme.star
      : (theme.glaze?.[cell.color]?.top ?? '#FFFFFF');

  const opacity = useDerivedValue(() => {
    const e = waveTime.value - delay - flashMs;
    if (e <= 0) return 1;
    if (e >= shrinkMs) return 0;
    return 1 - Math.max(0, e / shrinkMs - 0.3) / 0.7;
  });

  const transform = useDerivedValue(() => {
    if (reduceMotion) return [{ scale: 1 }];
    const e = waveTime.value - delay;
    if (e <= 0) return [{ scale: 1 }];
    if (e < flashMs) return [{ scale: 1 + 0.12 * (e / flashMs) }];
    const t = Math.min((e - flashMs) / shrinkMs, 1);
    return [{ scale: 1.12 * (1 - t * t) }];
  });

  const flashOpacity = useDerivedValue(() => {
    const e = waveTime.value - delay;
    if (e <= 0) return 0;
    if (e < flashMs) return 0.7 * (e / flashMs);
    return 0.7 * Math.max(0, 1 - (e - flashMs) / shrinkMs);
  });

  const shards = useDerivedValue(() => {
    const path = Skia.Path.Make();
    if (reduceMotion) return path;
    const e = waveTime.value - delay - flashMs;
    if (e <= 0 || e >= SHARD_MS) return path;
    const t = e / SHARD_MS;
    const travel = 1 - (1 - t) * (1 - t);
    const size = shardSize * (1 - t);
    for (let i = 0; i < SHARD_SPREAD.length; i++) {
      const angle = baseAngle + SHARD_SPREAD[i];
      const dist = cellSize * SHARD_SPEED[i] * travel;
      const px = cx + Math.cos(angle) * dist;
      const py = cy + Math.sin(angle) * dist + gravity * t * t;
      path.addRRect(
        Skia.RRectXY(
          Skia.XYWHRect(px - size / 2, py - size / 2, size, size),
          size * 0.3,
          size * 0.3
        )
      );
    }
    return path;
  });

  return (
    <Group>
      <Group origin={{ x: cx, y: cy }} transform={transform} opacity={opacity}>
        <Cell
          x={x}
          y={y}
          size={cellSize}
          cellRadius={cellRadius}
          color={cell.color}
          kind={cell.kind}
          hp={cell.hp}
          colorblind={isColorblind}
          theme={theme}
          twinkle={twinkle}
          reduceMotion={reduceMotion}
        />
        <RoundedRect
          x={x}
          y={y}
          width={cellSize}
          height={cellSize}
          r={cellRadius}
          color="#FFFFFF"
          opacity={flashOpacity}
        />
      </Group>
      <Path path={shards} color={shardColor} />
    </Group>
  );
}

/**
 * Light beam along a cleared row or column that flares and collapses to a seam.
 */
function LineBeam({ rect, horizontal, waveTime, reduceMotion }) {
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;

  const opacity = useDerivedValue(() => {
    const e = waveTime.value;
    if (e >= BEAM_MS) return 0;
    if (e < 60) return 0.35 * (e / 60);
    return 0.35 * (1 - (e - 60) / (BEAM_MS - 60));
  });

  const transform = useDerivedValue(() => {
    if (reduceMotion) return [{ scale: 1 }];
    const t = Math.min(waveTime.value / BEAM_MS, 1);
    const k = 1 - 0.85 * t * t;
    return horizontal ? [{ scaleY: k }] : [{ scaleX: k }];
  });

  return (
    <Group origin={{ x: cx, y: cy }} transform={transform} opacity={opacity}>
      <RoundedRect {...rect} r={rect.height / 2} color="#FFFFFF" />
    </Group>
  );
}

/**
 * Skia clear wave overlay layer: beams, ring, then the staggered cells.
 */
function ClearingWaveOverlay({
  clearing,
  board,
  boardSize,
  cellSize,
  cellRadius,
  padding,
  gap,
  theme,
  isColorblind,
  twinkle,
  reduceMotion,
  onComplete,
}) {
  const waveTime = useSharedValue(0);

  const center = clearing.centerCell || clearing.center || { row: 3, col: 3 };
  let maxDist = 0;
  for (let i = 0; i < clearing.cells.length; i++) {
    const c = clearing.cells[i];
    const dist =
      typeof c.distance === 'number'
        ? c.distance
        : Math.max(Math.abs(c.row - center.row), Math.abs(c.col - center.col));
    if (dist > maxDist) maxDist = dist;
  }

  const maxDelay = reduceMotion ? 0 : maxDist * STAGGER_MS_PER_CELL;
  const ringDuration = maxDelay + CLEAR_DURATION_MS;
  const totalDuration = reduceMotion
    ? FLASH_MS / 2 + CLEAR_DURATION_MS / 2
    : maxDelay + FLASH_MS + Math.max(CLEAR_DURATION_MS, SHARD_MS);

  // Ref so parent re-renders (e.g. Blitz timer ticks) never restart the wave.
  const onCompleteRef = useRef(onComplete);
  onCompleteRef.current = onComplete;
  const finish = useCallback(() => onCompleteRef.current?.(), []);

  useEffect(() => {
    waveTime.value = 0;
    waveTime.value = withTiming(
      totalDuration,
      { duration: totalDuration, easing: Easing.linear },
      (finished) => {
        if (finished) {
          runOnJS(finish)();
        }
      }
    );
  }, [clearing, totalDuration, finish, waveTime]);

  const origin = getCellPosition(
    center.row * 8 + center.col,
    cellSize,
    padding,
    gap
  );
  const ringX = origin.x + cellSize / 2;
  const ringY = origin.y + cellSize / 2;
  const diagonal = boardSize * Math.SQRT2;

  const ringRadius = useDerivedValue(() => {
    const t = Math.min(waveTime.value / ringDuration, 1);
    return diagonal * (1 - (1 - t) * (1 - t));
  });
  const ringOpacity = useDerivedValue(() => {
    const t = Math.min(waveTime.value / ringDuration, 1);
    return 0.35 * (1 - t);
  });

  const clip = useMemo(
    () =>
      Skia.RRectXY(
        Skia.XYWHRect(0, 0, boardSize, boardSize),
        BOARD_RADIUS,
        BOARD_RADIUS
      ),
    [boardSize]
  );

  const span = boardSize - padding * 2;
  const beams = [
    ...(clearing.rows || []).map((r) => ({
      key: `row-${r}`,
      horizontal: true,
      rect: {
        x: padding,
        y: getCellPosition(r * 8, cellSize, padding, gap).y,
        width: span,
        height: cellSize,
      },
    })),
    ...(clearing.cols || []).map((c) => ({
      key: `col-${c}`,
      horizontal: false,
      rect: {
        x: getCellPosition(c, cellSize, padding, gap).x,
        y: padding,
        width: cellSize,
        height: span,
      },
    })),
  ];

  return (
    <Group clip={clip}>
      {clearing.cells
        .filter(
          (cell) =>
            !(board && board[cell.index] && board[cell.index].kind === 'lock')
        )
        .map((cell) => (
          <ClearingCell
            key={`clearing-${cell.index}`}
            cell={cell}
            center={center}
            waveTime={waveTime}
            reduceMotion={reduceMotion}
            cellSize={cellSize}
            cellRadius={cellRadius}
            padding={padding}
            gap={gap}
            theme={theme}
            isColorblind={isColorblind}
            twinkle={twinkle}
          />
        ))}
      {beams.map((b) => (
        <LineBeam
          key={b.key}
          rect={b.rect}
          horizontal={b.horizontal}
          waveTime={waveTime}
          reduceMotion={reduceMotion}
        />
      ))}
      {!reduceMotion && (
        <Circle
          cx={ringX}
          cy={ringY}
          r={ringRadius}
          color="#FFFFFF"
          opacity={ringOpacity}
          style="stroke"
          strokeWidth={3}
        />
      )}
    </Group>
  );
}

/**
 * Skia 8x8 Board renderer with clear wave and perfect clear pulse support.
 *
 * @param {Object} props
 * @param {(Array<{ color: number, kind?: 'normal' | 'gem' | 'lock', hp?: number } | null>)} [props.board]
 * @param {number} [props.size]
 * @param {boolean} [props.colorblind]
 * @param {Object | null} [props.clearing] - Clearing description for clear wave.
 * @param {(listener: (events: Array<Object>) => void) => () => void} [props.subscribe] - Controller events stream.
 * @param {boolean} [props.perfectClear] - Direct perfect clear pulse trigger.
 * @param {() => void} [props.onClearingComplete] - Called when clear wave finishes.
 * @param {any} [props.style]
 */
export default function Board({
  board,
  size,
  colorblind: colorblindProp,
  clearing,
  subscribe,
  perfectClear,
  onClearingComplete,
  style,
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const settingsColorblind = useSettings((state) => state.colorblind);
  const isColorblind =
    typeof colorblindProp === 'boolean' ? colorblindProp : settingsColorblind;

  const boardSize = typeof size === 'number' ? size : getDefaultBoardSize();
  const { cellSize, cellRadius, padding, gap } = getBoardMetrics(boardSize);

  // Clear wave overlay state
  const [activeClearing, setActiveClearing] = useState(null);

  useEffect(() => {
    if (clearing && clearing.cells && clearing.cells.length > 0) {
      setActiveClearing(clearing);
    }
  }, [clearing]);

  // Board shake on clears: a nudge for one line, a real jolt for big clears.
  const shake = useSharedValue(1);
  const shakeAmp = useSharedValue(0);

  useEffect(() => {
    if (!activeClearing || reduceMotion) return;
    const lines = activeClearing.linesCount ?? 1;
    shakeAmp.value = Math.min(1.5 + (lines - 1) * 1.5, 6);
    shake.value = 0;
    shake.value = withTiming(1, { duration: 320, easing: Easing.linear });
  }, [activeClearing, reduceMotion, shake, shakeAmp]);

  const shakeStyle = useAnimatedStyle(() => {
    const t = shake.value;
    const a = t >= 1 ? 0 : shakeAmp.value * (1 - t) * (1 - t);
    return {
      transform: [
        { translateX: Math.sin(t * Math.PI * 7) * a },
        { translateY: Math.cos(t * Math.PI * 5) * a * 0.6 },
      ],
    };
  });

  const handleClearingComplete = useCallback(() => {
    setActiveClearing(null);
    onClearingComplete?.();
  }, [onClearingComplete]);

  // Perfect clear soft pulse overlay
  const pulseOpacity = useSharedValue(0);

  // Board-level shared value for gem sparkle twinkle
  const twinkle = useSharedValue(0);

  useEffect(() => {
    if (reduceMotion) {
      twinkle.value = 0.5;
      return;
    }
    twinkle.value = 0;
    const anim =
      typeof withRepeat === 'function'
        ? withRepeat(withTiming(1, { duration: 1200 }), -1, true)
        : withTiming(1, { duration: 1200 });
    twinkle.value = anim;
  }, [reduceMotion, twinkle]);

  const triggerPulse = useCallback(() => {
    if (reduceMotion) return;
    pulseOpacity.value = 0;
    pulseOpacity.value = withSequence(
      withTiming(0.25, { duration: 250, easing: Easing.out(Easing.quad) }),
      withTiming(0, { duration: 250, easing: Easing.in(Easing.quad) })
    );
  }, [reduceMotion, pulseOpacity]);

  useEffect(() => {
    if (!subscribe) return;
    return subscribe((events) => {
      if (events.some((e) => e.type === 'perfectClear')) {
        triggerPulse();
      }
    });
  }, [subscribe, triggerPulse]);

  useEffect(() => {
    if (perfectClear) {
      triggerPulse();
    }
  }, [perfectClear, triggerPulse]);

  // Record the well and all 64 sockets once with Skia's createPicture,
  // memoized on board size and dark mode.
  //
  // NOTE on Skia version compatibility:
  // In @shopify/react-native-skia (v2.13.1), createPicture takes an imperative SkCanvas callback.
  // Child declarative image filters like <Shadow inner /> on <RoundedRect> are processed by the Skia
  // JSX reconciler rather than imperative canvas calls (imperative Skia does not expose MakeInnerShadow).
  // If createPicture is unavailable, throws, or does not behave in this Skia version, we fall back to
  // plain declarative Skia nodes as required by task T09.
  const boardPicture = useMemo(() => {
    if (typeof createPicture !== 'function') {
      return null;
    }
    try {
      const pic = createPicture(
        (canvas) => {
          if (!canvas || typeof canvas.drawRRect !== 'function' || !Skia) {
            return;
          }

          // 1. Rounded rectangle well (radius 20)
          const wellPaint = Skia.Paint();
          wellPaint.setColor(Skia.Color(theme.well));
          canvas.drawRRect(
            Skia.RRectXY(
              Skia.XYWHRect(0, 0, boardSize, boardSize),
              BOARD_RADIUS,
              BOARD_RADIUS
            ),
            wellPaint
          );

          // 2. 64 sockets
          const cellPaint = Skia.Paint();
          cellPaint.setColor(Skia.Color(theme.cellEmpty));

          const topPaint = Skia.Paint();
          topPaint.setColor(Skia.Color(theme.socketTop));
          topPaint.setStrokeWidth(1);

          const botPaint = Skia.Paint();
          botPaint.setColor(Skia.Color(theme.socketBottom));
          botPaint.setStrokeWidth(1);

          for (let i = 0; i < TOTAL_BOARD_CELLS; i++) {
            const { x, y } = getCellPosition(i, cellSize, padding, gap);
            canvas.drawRRect(
              Skia.RRectXY(
                Skia.XYWHRect(x, y, cellSize, cellSize),
                cellRadius,
                cellRadius
              ),
              cellPaint
            );
            const { topLine, bottomLine } = getSocketLines(
              x,
              y,
              cellSize,
              cellRadius
            );
            canvas.drawLine(
              topLine.p1.x,
              topLine.p1.y,
              topLine.p2.x,
              topLine.p2.y,
              topPaint
            );
            canvas.drawLine(
              bottomLine.p1.x,
              bottomLine.p1.y,
              bottomLine.p2.x,
              bottomLine.p2.y,
              botPaint
            );
          }
        },
        { x: 0, y: 0, width: boardSize, height: boardSize }
      );
      return pic || null;
    } catch (_err) {
      return null;
    }
  }, [
    boardSize,
    theme.isDark,
    cellSize,
    cellRadius,
    padding,
    gap,
    theme.well,
    theme.cellEmpty,
    theme.socketTop,
    theme.socketBottom,
  ]);

  return (
    <Animated.View style={shakeStyle}>
      <Canvas style={[{ width: boardSize, height: boardSize }, style]}>
        {/* 1. Well and 64 sockets (single Picture when recorded, otherwise plain nodes fallback) */}
        {boardPicture ? (
          <Picture picture={boardPicture} />
        ) : (
          <Group>
            {/* Well: rounded rect (radius 20) with inner Shadow */}
            <RoundedRect
              x={0}
              y={0}
              width={boardSize}
              height={boardSize}
              r={BOARD_RADIUS}
              color={theme.well}
            >
              <Shadow dx={0} dy={1.5} blur={3} color={theme.wellShadow} inner />
            </RoundedRect>

            {/* 64 sockets: empty cell fill + 1px top socketTop + 1px bottom socketBottom */}
            {Array.from({ length: TOTAL_BOARD_CELLS }).map((_, index) => {
              const { x, y } = getCellPosition(index, cellSize, padding, gap);
              const { topLine, bottomLine } = getSocketLines(
                x,
                y,
                cellSize,
                cellRadius
              );
              return (
                <Group key={`socket-${index}`}>
                  <RoundedRect
                    x={x}
                    y={y}
                    width={cellSize}
                    height={cellSize}
                    r={cellRadius}
                    color={theme.cellEmpty}
                  />
                  <Line
                    p1={topLine.p1}
                    p2={topLine.p2}
                    color={theme.socketTop}
                    strokeWidth={1}
                  />
                  <Line
                    p1={bottomLine.p1}
                    p2={bottomLine.p2}
                    color={theme.socketBottom}
                    strokeWidth={1}
                  />
                </Group>
              );
            })}
          </Group>
        )}

        {/* 3. Filled cells */}
        {board &&
          board.map((cell, index) => {
            if (!cell) return null;
            const { x, y } = getCellPosition(index, cellSize, padding, gap);
            return (
              <Cell
                key={`cell-${index}`}
                index={index}
                x={x}
                y={y}
                size={cellSize}
                cellRadius={cellRadius}
                color={cell.color}
                kind={cell.kind}
                hp={cell.hp}
                colorblind={isColorblind}
                theme={theme}
                twinkle={twinkle}
                reduceMotion={reduceMotion}
                subscribe={subscribe}
              />
            );
          })}

        {/* 4. Clear wave overlay layer */}
        {activeClearing && (
          <ClearingWaveOverlay
            clearing={activeClearing}
            board={board}
            boardSize={boardSize}
            cellSize={cellSize}
            cellRadius={cellRadius}
            padding={padding}
            gap={gap}
            theme={theme}
            isColorblind={isColorblind}
            twinkle={twinkle}
            reduceMotion={reduceMotion}
            onComplete={handleClearingComplete}
          />
        )}

        {/* 5. Perfect clear soft pulse overlay */}
        <RoundedRect
          x={0}
          y={0}
          width={boardSize}
          height={boardSize}
          r={BOARD_RADIUS}
          color="#FFFFFF"
          opacity={pulseOpacity}
        />
      </Canvas>
    </Animated.View>
  );
}
