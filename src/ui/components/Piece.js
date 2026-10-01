import React from 'react';
import { Canvas } from '@shopify/react-native-skia';
import { useTheme } from '../theme';
import { useSettings } from '../../store/useSettings';
import { DEFAULT_CELL_GAP, calculateCellRadius } from '../boardLayout';
import Cell from './Cell';

/**
 * Draws a piece from its cell coordinates at a given cell size with Skia.
 *
 * @param {Object} props
 * @param {Array<[number, number] | { r: number, c: number }>} props.cells
 * @param {number | string} props.color
 * @param {number} props.cellSize
 * @param {number} [props.gap=3]
 * @param {boolean} [props.colorblind]
 * @param {any} [props.style]
 */
export default function Piece({
  cells,
  color,
  cellSize,
  gap = DEFAULT_CELL_GAP,
  colorblind: colorblindProp,
  style,
}) {
  const theme = useTheme();
  const settingsColorblind = useSettings((state) => state.colorblind);
  const isColorblind =
    typeof colorblindProp === 'boolean' ? colorblindProp : settingsColorblind;

  if (!cells || cells.length === 0 || typeof cellSize !== 'number') {
    return null;
  }

  let minR = Infinity;
  let maxR = -Infinity;
  let minC = Infinity;
  let maxC = -Infinity;

  for (const cell of cells) {
    const r = Array.isArray(cell) ? cell[0] : cell.r;
    const c = Array.isArray(cell) ? cell[1] : cell.c;
    if (r < minR) minR = r;
    if (r > maxR) maxR = r;
    if (c < minC) minC = c;
    if (c > maxC) maxC = c;
  }

  const numRows = maxR - minR + 1;
  const numCols = maxC - minC + 1;
  const width = numCols * cellSize + (numCols - 1) * gap;
  const height = numRows * cellSize + (numRows - 1) * gap;
  const cellRadius = calculateCellRadius(cellSize);

  return (
    <Canvas style={[{ width, height }, style]}>
      {cells.map((cell, index) => {
        const rawR = Array.isArray(cell) ? cell[0] : cell.r;
        const rawC = Array.isArray(cell) ? cell[1] : cell.c;
        const r = rawR - minR;
        const c = rawC - minC;
        const x = c * (cellSize + gap);
        const y = r * (cellSize + gap);

        return (
          <Cell
            key={`piece-cell-${index}`}
            x={x}
            y={y}
            size={cellSize}
            cellRadius={cellRadius}
            color={color}
            kind={cell.kind || 'normal'}
            hp={cell.hp || 1}
            colorblind={isColorblind}
            theme={theme}
          />
        );
      })}
    </Canvas>
  );
}
