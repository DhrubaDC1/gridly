import React from 'react';
import { Canvas, RoundedRect } from '@shopify/react-native-skia';
import { useTheme } from '../theme';
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
 * Static Skia 8x8 Board renderer.
 *
 * @param {Object} props
 * @param {(Array<{ color: number, kind?: 'normal' | 'gem' | 'lock', hp?: number } | null>)} [props.board]
 * @param {number} [props.size]
 * @param {boolean} [props.colorblind]
 * @param {any} [props.style]
 */
export default function Board({
  board,
  size,
  colorblind: colorblindProp,
  style,
}) {
  const theme = useTheme();
  const settingsColorblind = useSettings((state) => state.colorblind);
  const isColorblind =
    typeof colorblindProp === 'boolean' ? colorblindProp : settingsColorblind;

  const boardSize = typeof size === 'number' ? size : getDefaultBoardSize();
  const { cellSize, cellRadius, padding, gap } = getBoardMetrics(boardSize);

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
    </Canvas>
  );
}
