import React, { useRef, useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSharedValue } from 'react-native-reanimated';
import { useTheme } from '../theme';
import { getBoardMetrics } from '../boardLayout';
import useReduceMotion from '../useReduceMotion';
import TraySlot from './TraySlot';

const TRAY_SLOT_HEIGHT = 96;
const TRAY_GAP = 10;

/**
 * Tray component rendering 3 piece slots at 55% scale with drag & drop handling.
 *
 * @param {Object} props
 * @param {Array<{ color: number, cells: Array<[number, number]> } | null>} props.pieces
 * @param {number} props.boardSize
 * @param {Array<any>} props.board
 * @param {{ x: number, y: number, width: number, height: number } | null} props.boardLayout
 * @param {Object} props.ghost
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostX
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostY
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostOpacity
 * @param {(piece: any) => void} props.ghost.setActiveGhostPiece
 * @param {(slotIndex: number, piece: any, row: number, col: number) => void} props.onPlace
 * @param {(layout: { x: number, y: number, width: number, height: number }) => void} [props.onTrayLayout]
 * @param {any} [props.style]
 */
export default function Tray({
  pieces,
  boardSize,
  board,
  boardLayout,
  ghost,
  onPlace,
  onTrayLayout,
  style,
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const metrics = getBoardMetrics(boardSize);
  const boardRef = useRef(board);
  boardRef.current = board;

  const slotWidth = (boardSize - 2 * TRAY_GAP) / 3;
  const slotHeight = TRAY_SLOT_HEIGHT;

  const trayLayoutRef = useRef(null);

  // Shared values for slot-to-board offsets
  const slot0OffsetX = useSharedValue(0);
  const slot1OffsetX = useSharedValue(slotWidth + TRAY_GAP);
  const slot2OffsetX = useSharedValue(2 * (slotWidth + TRAY_GAP));
  const slotOffsetY = useSharedValue(boardSize + 24);

  const slotOffsetXs = [slot0OffsetX, slot1OffsetX, slot2OffsetX];

  useEffect(() => {
    if (boardLayout && trayLayoutRef.current) {
      const bLayout = boardLayout;
      const tLayout = trayLayoutRef.current;
      slotOffsetY.value = tLayout.y - bLayout.y;
      for (let i = 0; i < 3; i++) {
        const slotX = tLayout.x + i * (slotWidth + TRAY_GAP);
        slotOffsetXs[i].value = slotX - bLayout.x;
      }
    }
  }, [boardLayout, slotWidth]);

  const handleLayout = (e) => {
    const layout = e.nativeEvent.layout;
    trayLayoutRef.current = layout;
    if (boardLayout) {
      slotOffsetY.value = layout.y - boardLayout.y;
      for (let i = 0; i < 3; i++) {
        const slotX = layout.x + i * (slotWidth + TRAY_GAP);
        slotOffsetXs[i].value = slotX - boardLayout.x;
      }
    }
    onTrayLayout?.(layout);
  };

  const safePieces = Array.isArray(pieces) ? pieces : [null, null, null];

  return (
    <View
      onLayout={handleLayout}
      style={[
        styles.trayContainer,
        { width: boardSize },
        style,
      ]}
    >
      {safePieces.slice(0, 3).map((piece, index) => (
        <TraySlot
          key={`tray-slot-${index}`}
          slotIndex={index}
          piece={piece}
          slotWidth={slotWidth}
          slotHeight={slotHeight}
          cellSize={metrics.cellSize}
          gap={metrics.gap}
          padding={metrics.padding}
          boardRef={boardRef}
          slotBoardOffsetX={slotOffsetXs[index]}
          slotBoardOffsetY={slotOffsetY}
          ghost={ghost}
          onPlace={onPlace}
          reduceMotion={reduceMotion}
          theme={theme}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  trayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: TRAY_GAP,
    marginTop: 8,
    overflow: 'visible',
  },
});
