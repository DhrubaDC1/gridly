import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Canvas,
  RoundedRect,
  Group,
  Line,
  Shadow,
  Picture,
  createPicture,
  Skia,
} from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
  withRepeat,
  withSequence,
  runOnJS,
  Easing,
} from 'react-native-reanimated';
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

/**
 * Individual clearing cell animated in the clear wave.
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

  const delay = reduceMotion ? 0 : distance * 18;
  const duration = reduceMotion ? 110 : 220;

  const opacity = useDerivedValue(() => {
    const elapsed = waveTime.value - delay;
    if (elapsed <= 0) return 1;
    if (elapsed >= duration) return 0;
    return 1 - elapsed / duration;
  });

  const scale = useDerivedValue(() => {
    if (reduceMotion) return 1;
    const elapsed = waveTime.value - delay;
    if (elapsed <= 0) return 1;
    if (elapsed >= duration) return 0;
    return 1 - elapsed / duration;
  });

  const transform = useDerivedValue(() => [{ scale: scale.value }]);

  return (
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
    </Group>
  );
}

/**
 * Skia clear wave overlay layer.
 */
function ClearingWaveOverlay({
  clearing,
  board,
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
        : Math.max(
            Math.abs(c.row - center.row),
            Math.abs(c.col - center.col)
          );
    if (dist > maxDist) maxDist = dist;
  }

  const duration = reduceMotion ? 110 : 220;
  const maxDelay = reduceMotion ? 0 : maxDist * 18;
  const totalDuration = maxDelay + duration;

  useEffect(() => {
    waveTime.value = 0;
    waveTime.value = withTiming(
      totalDuration,
      { duration: totalDuration, easing: Easing.linear },
      (finished) => {
        if (finished && onComplete) {
          runOnJS(onComplete)();
        }
      }
    );
  }, [clearing, totalDuration, onComplete, waveTime]);

  return (
    <Group>
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
  );
}
