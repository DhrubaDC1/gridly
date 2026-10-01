import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import Piece from './Piece';
import { getPieceDimensions } from '../boardLayout';
import { canPlace } from '../../engine/board';

/**
 * Single Tray Slot displaying one piece at 55% scale with drag & drop handling.
 *
 * @param {Object} props
 * @param {number} props.slotIndex
 * @param {{ color: number, cells: Array<[number, number]> } | null} props.piece
 * @param {number} props.slotWidth
 * @param {number} props.slotHeight
 * @param {number} props.cellSize
 * @param {number} props.gap
 * @param {number} props.padding
 * @param {React.MutableRefObject<Array<any>>} props.boardRef
 * @param {import('react-native-reanimated').SharedValue<number>} props.slotBoardOffsetX
 * @param {import('react-native-reanimated').SharedValue<number>} props.slotBoardOffsetY
 * @param {Object} props.ghost
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostX
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostY
 * @param {import('react-native-reanimated').SharedValue<number>} props.ghost.ghostOpacity
 * @param {(piece: any) => void} props.ghost.setActiveGhostPiece
 * @param {(slotIndex: number, piece: any, row: number, col: number) => void} props.onPlace
 * @param {boolean} props.reduceMotion
 * @param {Object} props.theme
 */
export default function TraySlot({
  slotIndex,
  piece,
  slotWidth,
  slotHeight,
  cellSize,
  gap,
  padding,
  boardRef,
  slotBoardOffsetX,
  slotBoardOffsetY,
  ghost,
  onPlace,
  reduceMotion,
  theme,
}) {
  const [isDraggingState, setIsDraggingState] = useState(false);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.55);
  const isDragging = useSharedValue(false);
  const lastRow = useSharedValue(-999);
  const lastCol = useSharedValue(-999);
  const isValidPlacement = useSharedValue(false);

  const pickupDuration = reduceMotion ? 60 : 120;
  const snapDuration = reduceMotion ? 45 : 90;
  const returnDuration = reduceMotion ? 110 : 220;

  const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(
    piece,
    cellSize,
    gap
  );

  const checkPlacementJS = (row, col) => {
    if (!piece) return;
    const valid = canPlace(boardRef.current, piece, row, col);
    isValidPlacement.value = valid;
    if (valid) {
      const step = cellSize + gap;
      ghost.ghostX.value = padding + col * step;
      ghost.ghostY.value = padding + row * step;
      ghost.ghostOpacity.value = 0.35;
    } else {
      ghost.ghostOpacity.value = 0;
    }
  };

  const handleDragBeginJS = (p) => {
    setIsDraggingState(true);
    ghost.setActiveGhostPiece(p);
  };

  const handleDragEndJS = () => {
    setIsDraggingState(false);
    ghost.setActiveGhostPiece(null);
  };

  const handleDropSuccessJS = (slotIdx, p, row, col) => {
    translateX.value = 0;
    translateY.value = 0;
    scale.value = 0.55;
    isDragging.value = false;
    lastRow.value = -999;
    lastCol.value = -999;
    isValidPlacement.value = false;
    ghost.ghostOpacity.value = 0;

    setIsDraggingState(false);
    ghost.setActiveGhostPiece(null);
    onPlace(slotIdx, p, row, col);
  };

  const panGesture = Gesture.Pan()
    .onBegin((event) => {
      'worklet';
      if (!piece) return;
      startX.value = event.x;
      startY.value = event.y;
      isDragging.value = true;
      lastRow.value = -999;
      lastCol.value = -999;
      isValidPlacement.value = false;

      // On pickup: bottom edge sits 1 cell height above touch point
      const targetTranslateX = event.x - slotWidth / 2;
      const targetTranslateY =
        event.y - cellSize - pieceHeight / 2 - slotHeight / 2;

      scale.value = withTiming(1.0, { duration: pickupDuration });
      translateX.value = withTiming(targetTranslateX, {
        duration: pickupDuration,
      });
      translateY.value = withTiming(targetTranslateY, {
        duration: pickupDuration,
      });

      runOnJS(handleDragBeginJS)(piece);
    })
    .onUpdate((event) => {
      'worklet';
      if (!piece || !isDragging.value) return;

      const touchX = startX.value + event.translationX;
      const touchY = startY.value + event.translationY;

      // Follow touch
      translateX.value = touchX - slotWidth / 2;
      translateY.value = touchY - cellSize - pieceHeight / 2 - slotHeight / 2;

      // Top-left of piece relative to board
      const pieceBoardLeft =
        slotBoardOffsetX.value + (touchX - pieceWidth / 2);
      const pieceBoardTop =
        slotBoardOffsetY.value + (touchY - cellSize - pieceHeight);

      const step = cellSize + gap;
      const col = Math.round((pieceBoardLeft - padding) / step);
      const row = Math.round((pieceBoardTop - padding) / step);

      if (row !== lastRow.value || col !== lastCol.value) {
        lastRow.value = row;
        lastCol.value = col;
        runOnJS(checkPlacementJS)(row, col);
      }
    })
    .onEnd(() => {
      'worklet';
      if (!piece || !isDragging.value) return;

      if (isValidPlacement.value) {
        const step = cellSize + gap;
        const snapBoardLeft = padding + lastCol.value * step;
        const snapBoardTop = padding + lastRow.value * step;

        const targetCenterX =
          snapBoardLeft - slotBoardOffsetX.value + pieceWidth / 2;
        const targetCenterY =
          snapBoardTop - slotBoardOffsetY.value + pieceHeight / 2;

        const targetSnapX = targetCenterX - slotWidth / 2;
        const targetSnapY = targetCenterY - slotHeight / 2;

        ghost.ghostOpacity.value = withTiming(0, { duration: snapDuration });
        translateX.value = withTiming(targetSnapX, { duration: snapDuration });
        translateY.value = withTiming(
          targetSnapY,
          { duration: snapDuration },
          (finished) => {
            if (finished) {
              runOnJS(handleDropSuccessJS)(
                slotIndex,
                piece,
                lastRow.value,
                lastCol.value
              );
            }
          }
        );
      } else {
        ghost.ghostOpacity.value = 0;
        translateX.value = withTiming(0, { duration: returnDuration });
        translateY.value = withTiming(0, { duration: returnDuration });
        scale.value = withTiming(0.55, { duration: returnDuration }, (finished) => {
          if (finished) {
            isDragging.value = false;
            runOnJS(handleDragEndJS)();
          }
        });
      }
    });

  const animatedPieceStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  return (
    <View
      style={[
        styles.slotWrapper,
        {
          width: slotWidth,
          height: slotHeight,
          zIndex: isDraggingState ? 9999 : 1,
          elevation: isDraggingState ? 9999 : 1,
        },
      ]}
    >
      <View
        style={[styles.slotBackground, { backgroundColor: theme.surface }]}
      />
      {piece && (
        <GestureDetector gesture={panGesture}>
          <Animated.View
            style={[
              styles.pieceWrapper,
              { width: pieceWidth, height: pieceHeight },
              animatedPieceStyle,
            ]}
          >
            <Piece
              cells={piece.cells}
              color={piece.color}
              cellSize={cellSize}
              gap={gap}
            />
          </Animated.View>
        </GestureDetector>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  slotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
  },
  slotBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  pieceWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
