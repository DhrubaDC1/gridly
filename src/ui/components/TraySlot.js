import React, { useMemo, useRef, useEffect } from 'react';
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
 * @param {import('react-native-reanimated').SharedValue<number>} [props.slotHoldOffsetX]
 * @param {import('react-native-reanimated').SharedValue<number>} [props.slotHoldOffsetY]
 * @param {number} [props.holdWidth]
 * @param {number} [props.holdHeight]
 * @param {boolean} [props.canHold=true]
 * @param {import('react-native-reanimated').SharedValue<boolean>} [props.isHoldHovered]
 * @param {(slotIndex: number, piece: any, row: number, col: number) => void} props.onPlace
 * @param {(slotIndex: number, piece: any) => void} [props.onHold]
 * @param {boolean} props.reduceMotion
 * @param {Object} props.theme
 */
function TraySlot({
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
  slotHoldOffsetX,
  slotHoldOffsetY,
  holdWidth,
  holdHeight,
  canHold = true,
  isHoldHovered,
  ghost,
  onPlace,
  onHold,
  reduceMotion,
  theme,
}) {
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
  const isOverHoldSlot = useSharedValue(false);

  const pickupDuration = reduceMotion ? 60 : 120;
  const snapDuration = reduceMotion ? 45 : 90;
  const returnDuration = reduceMotion ? 110 : 220;

  const { width: pieceWidth, height: pieceHeight } = getPieceDimensions(
    piece,
    cellSize,
    gap
  );

  const pieceKey = piece ? `${piece.id}-${piece.color}` : null;
  const prevPieceKeyRef = useRef(pieceKey);

  // When piece in this slot changes (e.g. refill or empty after place), reset animation values cleanly
  useEffect(() => {
    if (prevPieceKeyRef.current !== pieceKey) {
      prevPieceKeyRef.current = pieceKey;
      if (!isDragging.value) {
        translateX.value = 0;
        translateY.value = 0;
        translationX.value = 0;
        translationY.value = 0;
        scale.value = 0.55;
        pieceOpacity.value = 1;
        liftProgress.value = 0;
        isOverHoldSlot.value = false;
      }
    }
  }, [pieceKey]);

  const onPlaceRef = useRef(onPlace);
  onPlaceRef.current = onPlace;

  const onHoldRef = useRef(onHold);
  onHoldRef.current = onHold;

  const pieceRef = useRef(piece);
  pieceRef.current = piece;

  const ghostRef = useRef(ghost);
  ghostRef.current = ghost;

  const checkPlacementJS = (row, col) => {
    const currentPiece = pieceRef.current;
    if (!currentPiece) return;
    const valid = canPlace(boardRef.current, currentPiece, row, col);
    isValidPlacement.value = valid;
    if (valid) {
      const step = cellSize + gap;
      ghostRef.current.ghostX.value = padding + col * step;
      ghostRef.current.ghostY.value = padding + row * step;
      ghostRef.current.ghostOpacity.value = 0.35;
    } else {
      ghostRef.current.ghostOpacity.value = 0;
    }
  };

  const handleDragBeginJS = (p) => {
    ghostRef.current?.setActiveGhostPiece(p);
  };

  const handleDragEndJS = () => {
    if (isHoldHovered) {
      isHoldHovered.value = false;
    }
    ghostRef.current?.setActiveGhostPiece(null);
  };

  const handleDropSuccessJS = (slotIdx, p, row, col) => {
    isDragging.value = false;
    lastRow.value = -999;
    lastCol.value = -999;
    isValidPlacement.value = false;
    ghostRef.current.ghostOpacity.value = 0;

    ghostRef.current?.setActiveGhostPiece(null);
    onPlaceRef.current(slotIdx, p, row, col);
  };

  const handleHoldSuccessJS = (slotIdx, p) => {
    isDragging.value = false;
    isOverHoldSlot.value = false;
    if (isHoldHovered) {
      isHoldHovered.value = false;
    }
    ghostRef.current?.setActiveGhostPiece(null);
    onHoldRef.current?.(slotIdx, p);
  };

  const panGesture = useMemo(() => {
    return Gesture.Pan()
      .enabled(Boolean(piece))
      .minDistance(0)
      .onBegin((event) => {
        'worklet';
        if (!piece) return;
        startX.value = event.x;
        startY.value = event.y;
        translationX.value = 0;
        translationY.value = 0;
        isDragging.value = true;
        isOverHoldSlot.value = false;
        lastRow.value = -999;
        lastCol.value = -999;
        isValidPlacement.value = false;

        // Floating offset relative to rest center: bottom edge sits 1 cell height above touch
        liftOffsetX.value = event.x - slotWidth / 2;
        liftOffsetY.value =
          event.y - cellSize - pieceHeight / 2 - slotHeight / 2;

        // Smoothly animate lift progress from 0 to 1 (piece starts at 0 with zero jump)
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

        // Check if hovering over hold slot
        if (canHold && slotHoldOffsetX && isHoldHovered) {
          const pieceHoldLeft = pieceSlotLeft - slotHoldOffsetX.value;
          const pieceHoldTop = pieceSlotTop - (slotHoldOffsetY?.value ?? 0);
          const pieceHoldCenterX = pieceHoldLeft + pieceWidth / 2;
          const pieceHoldCenterY = pieceHoldTop + pieceHeight / 2;

          const targetHoldWidth = holdWidth ?? slotWidth;
          const targetHoldHeight = holdHeight ?? slotHeight;
          const margin = 16;
          const isOverHold =
            pieceHoldCenterX >= -margin &&
            pieceHoldCenterX <= targetHoldWidth + margin &&
            pieceHoldCenterY >= -margin &&
            pieceHoldCenterY <= targetHoldHeight + margin;

          if (isOverHold) {
            if (!isOverHoldSlot.value) {
              isOverHoldSlot.value = true;
              isHoldHovered.value = true;
            }
            isValidPlacement.value = false;
            ghost.ghostOpacity.value = 0;
            return;
          } else if (isOverHoldSlot.value) {
            isOverHoldSlot.value = false;
            isHoldHovered.value = false;
          }
        }

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

        if (isOverHoldSlot.value && slotHoldOffsetX) {
          isOverHoldSlot.value = false;
          if (isHoldHovered) {
            isHoldHovered.value = false;
          }

          const targetHoldWidth = holdWidth ?? slotWidth;
          const targetHoldHeight = holdHeight ?? slotHeight;
          const targetSnapX =
            slotHoldOffsetX.value + (targetHoldWidth - pieceWidth) / 2;
          const targetSnapY =
            (slotHoldOffsetY?.value ?? 0) + (targetHoldHeight - pieceHeight) / 2;

          ghost.ghostOpacity.value = 0;
          scale.value = withTiming(0.55, { duration: snapDuration });
          translateX.value = withTiming(targetSnapX, { duration: snapDuration });
          translateY.value = withTiming(
            targetSnapY,
            { duration: snapDuration },
            (finished) => {
              if (finished) {
                pieceOpacity.value = 0;
                runOnJS(handleHoldSuccessJS)(slotIndex, piece);
              }
            }
          );
          return;
        }

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
                // Hide piece immediately so it never flashes back in the tray deck
                pieceOpacity.value = 0;
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
          if (isHoldHovered) {
            isHoldHovered.value = false;
          }
          isOverHoldSlot.value = false;
          ghost.ghostOpacity.value = 0;
          translateX.value = withTiming(0, { duration: returnDuration });
          translateY.value = withTiming(0, { duration: returnDuration });
          scale.value = withTiming(0.55, { duration: returnDuration }, (finished) => {
            if (finished) {
              runOnJS(handleDragEndJS)();
            }
          });
        }
      })
      .onFinalize((event, success) => {
        'worklet';
        if (!success && isDragging.value) {
          isDragging.value = false;
          isOverHoldSlot.value = false;
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
  }, [
    pieceKey,
    slotIndex,
    slotWidth,
    slotHeight,
    cellSize,
    gap,
    padding,
    pieceWidth,
    pieceHeight,
    canHold,
    holdWidth,
    holdHeight,
    pickupDuration,
    snapDuration,
    returnDuration,
    slotBoardOffsetX,
    slotBoardOffsetY,
    slotHoldOffsetX,
    slotHoldOffsetY,
    isHoldHovered,
    ghost,
  ]);

  const animatedSlotWrapperStyle = useAnimatedStyle(() => ({
    zIndex: isDragging.value ? 9999 : 1,
    elevation: isDragging.value ? 9999 : 1,
  }));

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

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.slotWrapper,
          {
            width: slotWidth,
            height: slotHeight,
          },
          animatedSlotWrapperStyle,
        ]}
      >
        <View
          style={[styles.slotBackground, { backgroundColor: theme.surface }]}
        />
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
      </Animated.View>
    </GestureDetector>
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

export default React.memo(TraySlot);

