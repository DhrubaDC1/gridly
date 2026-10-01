import React, { useState, useEffect } from 'react';
import { StyleSheet, View, Text } from 'react-native';
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
 * HoldSlot component rendering one held piece at 55% scale or a subtle empty state.
 * Supports drag & drop onto the board, and visual highlight when hovered by a tray piece.
 *
 * @param {Object} props
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
 * @param {(piece: any, row: number, col: number) => void} props.onPlace
 * @param {boolean} [props.canHold=true]
 * @param {import('react-native-reanimated').SharedValue<boolean>} [props.isHovered]
 * @param {boolean} [props.reduceMotion=false]
 * @param {Object} props.theme
 */
export default function HoldSlot({
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
  canHold = true,
  isHovered,
  reduceMotion = false,
  theme,
}) {
  const [isDraggingState, setIsDraggingState] = useState(false);

  const startX = useSharedValue(0);
  const startY = useSharedValue(0);
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const liftOffsetX = useSharedValue(0);
  const liftOffsetY = useSharedValue(0);
  const liftProgress = useSharedValue(0);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const scale = useSharedValue(0.55);
  const pieceOpacity = useSharedValue(1);
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

  useEffect(() => {
    if (piece) {
      translateX.value = 0;
      translateY.value = 0;
      translationX.value = 0;
      translationY.value = 0;
      scale.value = 0.55;
      pieceOpacity.value = 1;
      isDragging.value = false;
      liftProgress.value = 0;
    }
  }, [piece]);

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

  const handleDropSuccessJS = (p, row, col) => {
    isDragging.value = false;
    lastRow.value = -999;
    lastCol.value = -999;
    isValidPlacement.value = false;
    ghost.ghostOpacity.value = 0;

    setIsDraggingState(false);
    ghost.setActiveGhostPiece(null);
    onPlace(p, row, col);
  };

  const panGesture = Gesture.Pan()
    .enabled(Boolean(piece))
    .onBegin((event) => {
      'worklet';
      if (!piece) return;
      startX.value = event.x;
      startY.value = event.y;
      translationX.value = 0;
      translationY.value = 0;
      isDragging.value = true;
      lastRow.value = -999;
      lastCol.value = -999;
      isValidPlacement.value = false;

      // Floating offset relative to rest center: bottom edge sits 1 cell height above touch
      liftOffsetX.value = event.x - slotWidth / 2;
      liftOffsetY.value =
        event.y - cellSize - pieceHeight / 2 - slotHeight / 2;

      liftProgress.value = 0;
      liftProgress.value = withTiming(1.0, { duration: pickupDuration });

      runOnJS(handleDragBeginJS)(piece);
    })
    .onUpdate((event) => {
      'worklet';
      if (!piece || !isDragging.value) return;

      translationX.value = event.translationX;
      translationY.value = event.translationY;

      // Current piece position in slot coordinates
      const curX =
        liftOffsetX.value * liftProgress.value + event.translationX;
      const curY =
        liftOffsetY.value * liftProgress.value + event.translationY;

      const pieceSlotLeft = (slotWidth - pieceWidth) / 2 + curX;
      const pieceSlotTop = (slotHeight - pieceHeight) / 2 + curY;

      // Top-left of piece relative to board
      const pieceBoardLeft = slotBoardOffsetX.value + pieceSlotLeft;
      const pieceBoardTop = slotBoardOffsetY.value + pieceSlotTop;

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

      const curX =
        liftOffsetX.value * liftProgress.value + translationX.value;
      const curY =
        liftOffsetY.value * liftProgress.value + translationY.value;
      const curScale = 0.55 + 0.45 * liftProgress.value;

      translateX.value = curX;
      translateY.value = curY;
      scale.value = curScale;
      isDragging.value = false;

      if (isValidPlacement.value) {
        const step = cellSize + gap;
        const snapBoardLeft = padding + lastCol.value * step;
        const snapBoardTop = padding + lastRow.value * step;

        const targetSnapX =
          snapBoardLeft - slotBoardOffsetX.value - (slotWidth - pieceWidth) / 2;
        const targetSnapY =
          snapBoardTop - slotBoardOffsetY.value - (slotHeight - pieceHeight) / 2;

        ghost.ghostOpacity.value = withTiming(0, { duration: snapDuration });
        scale.value = withTiming(1.0, { duration: snapDuration });
        translateX.value = withTiming(targetSnapX, { duration: snapDuration });
        translateY.value = withTiming(
          targetSnapY,
          { duration: snapDuration },
          (finished) => {
            if (finished) {
              pieceOpacity.value = 0;
              runOnJS(handleDropSuccessJS)(
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
            runOnJS(handleDragEndJS)();
          }
        });
      }
    });

  const animatedPieceStyle = useAnimatedStyle(() => {
    let curX;
    let curY;
    let curScale;

    if (isDragging.value) {
      curX = liftOffsetX.value * liftProgress.value + translationX.value;
      curY = liftOffsetY.value * liftProgress.value + translationY.value;
      curScale = 0.55 + 0.45 * liftProgress.value;
    } else {
      curX = translateX.value;
      curY = translateY.value;
      curScale = scale.value;
    }

    return {
      opacity: pieceOpacity.value,
      transform: [
        { translateX: curX },
        { translateY: curY },
        { scale: curScale },
      ],
    };
  });

  const highlightAnimatedStyle = useAnimatedStyle(() => {
    const active = isHovered?.value ? 1 : 0;
    return {
      opacity: withTiming(active, { duration: reduceMotion ? 50 : 100 }),
    };
  });

  const slotOpacity = canHold || isDraggingState ? 1.0 : 0.45;
  const accessibilityLabel = !canHold
    ? 'Hold slot, locked'
    : piece
    ? 'Hold slot, contains piece'
    : 'Hold slot, empty';

  return (
    <GestureDetector gesture={panGesture}>
      <View
        accessibilityRole="button"
        accessibilityLabel={accessibilityLabel}
        style={[
          styles.slotWrapper,
          {
            width: slotWidth,
            height: slotHeight,
            opacity: slotOpacity,
            zIndex: isDraggingState ? 9999 : 1,
            elevation: isDraggingState ? 9999 : 1,
          },
        ]}
      >
        {/* Slot Background in theme well color */}
        <View
          style={[styles.slotBackground, { backgroundColor: theme.well }]}
        />

        {/* Hover Highlight Overlay */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.highlightOverlay,
            {
              borderColor: theme.accent,
              backgroundColor: theme.accent + '18',
            },
            highlightAnimatedStyle,
          ]}
        />

        {/* Empty state: subtle dashed border with "Hold" */}
        {!piece && (
          <View
            style={[
              styles.emptyStateContainer,
              { borderColor: theme.cellEmpty },
            ]}
          >
            <Text style={[styles.emptyStateText, { color: theme.inkMuted }]}>
              Hold
            </Text>
          </View>
        )}

        {/* Held piece displayed at 55% scale */}
        {piece && (
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
        )}
      </View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  slotWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'visible',
    borderRadius: 14,
  },
  slotBackground: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
  },
  highlightOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
    right: 0,
    bottom: 0,
    borderRadius: 14,
    borderWidth: 2,
    zIndex: 2,
  },
  emptyStateContainer: {
    width: '78%',
    height: '78%',
    borderRadius: 10,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyStateText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    letterSpacing: 0.2,
    opacity: 0.7,
  },
  pieceWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
});
