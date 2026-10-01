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
 * @param {number} [props.trayWidth]
 * @param {number} [props.slotWidth]
 * @param {number} [props.slotHeight]
 * @param {number} [props.gap]
 * @param {Array<any>} props.board
 * @param {{ x: number, y: number, width: number, height: number } | null} props.boardLayout
 * @param {Array<import('react-native-reanimated').SharedValue<number>>} [props.slotOffsetXs]
 * @param {import('react-native-reanimated').SharedValue<number>} [props.slotOffsetY]
 * @param {Array<import('react-native-reanimated').SharedValue<number>>} [props.slotHoldOffsetXs]
 * @param {import('react-native-reanimated').SharedValue<number>} [props.slotHoldOffsetY]
 * @param {number} [props.holdWidth]
 * @param {number} [props.holdHeight]
 * @param {boolean} [props.canHold=true]
 * @param {import('react-native-reanimated').SharedValue<boolean>} [props.isHoldHovered]
 * @param {Object} props.ghost
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostX
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostY
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostOpacity
 * @param {(piece: any) => void} props.ghost.setActiveGhostPiece
 * @param {(slotIndex: number, piece: any, row: number, col: number) => void} props.onPlace
 * @param {(slotIndex: number, piece: any) => void} [props.onHold]
 * @param {(layout: { x: number, y: number, width: number, height: number }) => void} [props.onTrayLayout]
 * @param {any} [props.style]
 */
export default function Tray({
  pieces,
  boardSize,
  trayWidth: propTrayWidth,
  slotWidth: propSlotWidth,
  slotHeight: propSlotHeight,
  gap: propGap,
  board,
  boardLayout,
  slotOffsetXs: propSlotOffsetXs,
  slotOffsetY: propSlotOffsetY,
  slotHoldOffsetXs,
  slotHoldOffsetY,
  holdWidth,
  holdHeight,
  canHold = true,
  isHoldHovered,
  ghost,
  onPlace,
  onHold,
  onTrayLayout,
  style,
}) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const metrics = getBoardMetrics(boardSize);
  const boardRef = useRef(board);
  boardRef.current = board;

  const gap = propGap ?? TRAY_GAP;
  const slotWidth = propSlotWidth ?? (boardSize - 2 * gap) / 3;
  const slotHeight = propSlotHeight ?? TRAY_SLOT_HEIGHT;
  const trayWidth = propTrayWidth ?? (3 * slotWidth + 2 * gap);

  const trayLayoutRef = useRef(null);

  // Internal fallback shared values for slot-to-board offsets
  const internalSlot0OffsetX = useSharedValue(0);
  const internalSlot1OffsetX = useSharedValue(slotWidth + gap);
  const internalSlot2OffsetX = useSharedValue(2 * (slotWidth + gap));
  const internalSlotOffsetY = useSharedValue(boardSize + 24);

  const slotOffsetXs =
    propSlotOffsetXs ?? [
      internalSlot0OffsetX,
      internalSlot1OffsetX,
      internalSlot2OffsetX,
    ];
  const slotOffsetY = propSlotOffsetY ?? internalSlotOffsetY;

  useEffect(() => {
    if (!propSlotOffsetXs && boardLayout && trayLayoutRef.current) {
      const bLayout = boardLayout;
      const tLayout = trayLayoutRef.current;
      slotOffsetY.value = tLayout.y - bLayout.y;
      for (let i = 0; i < 3; i++) {
        const slotX = tLayout.x + i * (slotWidth + gap);
        slotOffsetXs[i].value = slotX - bLayout.x;
      }
    }
  }, [boardLayout, slotWidth, gap, propSlotOffsetXs]);

  const handleLayout = (e) => {
    const layout = e.nativeEvent.layout;
    trayLayoutRef.current = layout;
    if (!propSlotOffsetXs && boardLayout) {
      slotOffsetY.value = layout.y - boardLayout.y;
      for (let i = 0; i < 3; i++) {
        const slotX = layout.x + i * (slotWidth + gap);
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
        { width: trayWidth, gap },
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
          slotHoldOffsetX={slotHoldOffsetXs?.[index]}
          slotHoldOffsetY={slotHoldOffsetY}
          holdWidth={holdWidth}
          holdHeight={holdHeight}
          canHold={canHold}
          isHoldHovered={isHoldHovered}
          ghost={ghost}
          onPlace={onPlace}
          onHold={onHold}
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
    overflow: 'visible',
  },
});
