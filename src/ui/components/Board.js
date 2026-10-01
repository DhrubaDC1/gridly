import React, { useState, useEffect, useCallback } from 'react';
import { Canvas, RoundedRect, Group } from '@shopify/react-native-skia';
import {
  useSharedValue,
  useDerivedValue,
  withTiming,
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
      />
    </Group>
  );
}

/**
 * Skia clear wave overlay layer.
 */
function ClearingWaveOverlay({
  clearing,
  cellSize,
  cellRadius,
  padding,
  gap,
  theme,
  isColorblind,
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
      {clearing.cells.map((cell) => (
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

  return (
    <Canvas style={[{ width: boardSize, height: boardSize }, style]}>
      {/* 1. Rounded rectangle well (radius 20) */}
      <RoundedRect
        x={0}
        y={0}
        width={boardSize}
        height={boardSize}
        r={BOARD_RADIUS}
        color={theme.well}
      />

      {/* 2. 64 empty cell slots */}
      {Array.from({ length: TOTAL_BOARD_CELLS }).map((_, index) => {
        const { x, y } = getCellPosition(index, cellSize, padding, gap);
        return (
          <RoundedRect
            key={`slot-${index}`}
            x={x}
            y={y}
            width={cellSize}
            height={cellSize}
            r={cellRadius}
            color={theme.cellEmpty}
          />
        );
      })}

      {/* 3. Filled cells */}
      {board &&
        board.map((cell, index) => {
          if (!cell) return null;
          const { x, y } = getCellPosition(index, cellSize, padding, gap);
          return (
            <Cell
              key={`cell-${index}`}
              x={x}
              y={y}
              size={cellSize}
              cellRadius={cellRadius}
              color={cell.color}
              kind={cell.kind}
              hp={cell.hp}
              colorblind={isColorblind}
              theme={theme}
            />
          );
        })}

      {/* 4. Clear wave overlay layer */}
      {activeClearing && (
        <ClearingWaveOverlay
          clearing={activeClearing}
          cellSize={cellSize}
          cellRadius={cellRadius}
          padding={padding}
          gap={gap}
          theme={theme}
          isColorblind={isColorblind}
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
