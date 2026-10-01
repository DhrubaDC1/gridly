import React, { useState, useRef, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useTheme } from '../src/ui/theme';
import useReduceMotion from '../src/ui/useReduceMotion';
import Board from '../src/ui/components/Board';
import Piece from '../src/ui/components/Piece';
import Tray from '../src/ui/components/Tray';
import HoldSlot from '../src/ui/components/HoldSlot';
import { getDefaultBoardSize, getBoardMetrics } from '../src/ui/boardLayout';
import { placePiece } from '../src/engine/board';

// Hardcoded initial test board containing a few blocks of different colors,
// one gem block, and one lock block (hp: 2).
const INITIAL_TEST_BOARD = Array(64).fill(null);
INITIAL_TEST_BOARD[18] = { color: 0, kind: 'normal' }; // Row 2, Col 2 (Harbor)
INITIAL_TEST_BOARD[19] = { color: 1, kind: 'normal' }; // Row 2, Col 3 (Sage)
INITIAL_TEST_BOARD[25] = { color: 2, kind: 'normal' }; // Row 3, Col 1 (Heather)
INITIAL_TEST_BOARD[26] = { color: 3, kind: 'normal' }; // Row 3, Col 2 (Ochre)
INITIAL_TEST_BOARD[27] = { color: 4, kind: 'normal' }; // Row 3, Col 3 (Lavender)
INITIAL_TEST_BOARD[28] = { color: 5, kind: 'gem' }; // Row 3, Col 4 (Lagoon - gem)
INITIAL_TEST_BOARD[34] = { color: 3, kind: 'lock', hp: 2 }; // Row 4, Col 2 (Ochre - lock)
INITIAL_TEST_BOARD[35] = { color: 0, kind: 'normal' }; // Row 4, Col 3 (Harbor)
INITIAL_TEST_BOARD[36] = { color: 1, kind: 'normal' }; // Row 4, Col 4 (Sage)
INITIAL_TEST_BOARD[43] = { color: 2, kind: 'normal' }; // Row 5, Col 3 (Heather)
INITIAL_TEST_BOARD[44] = { color: 4, kind: 'normal' }; // Row 5, Col 4 (Lavender)
INITIAL_TEST_BOARD[45] = { color: 5, kind: 'normal' }; // Row 5, Col 5 (Lagoon)

// Three pieces in a row under the board
const INITIAL_TEST_PIECES = [
  {
    color: 0, // Harbor (1x3 line)
    cells: [
      [0, 0],
      [0, 1],
      [0, 2],
    ],
  },
  {
    color: 1, // Sage (2x2 square)
    cells: [
      [0, 0],
      [0, 1],
      [1, 0],
      [1, 1],
    ],
  },
  {
    color: 4, // Lavender (L-tetromino)
    cells: [
      [0, 0],
      [1, 0],
      [2, 0],
      [2, 1],
    ],
  },
];

export default function ClassicScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const [board, setBoard] = useState(INITIAL_TEST_BOARD);
  const [trayPieces, setTrayPieces] = useState(INITIAL_TEST_PIECES);
  const [heldPiece, setHeldPiece] = useState(null);
  const [canHold, setCanHold] = useState(true);
  const [ghostPiece, setGhostPiece] = useState(null);
  const [boardLayout, setBoardLayout] = useState(null);
  const [bottomRowLayout, setBottomRowLayout] = useState(null);

  const boardRef = useRef(board);
  boardRef.current = board;

  const boardSize = getDefaultBoardSize(screenWidth);
  const metrics = getBoardMetrics(boardSize);

  const TRAY_GAP = 8;
  const slotWidth = Math.floor((boardSize - 30) / 4);
  const slotHeight = 96;
  const trayWidth = 3 * slotWidth + 2 * TRAY_GAP;
  const holdWidth = slotWidth;

  // Shared values for ghost preview on board
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const ghostOpacity = useSharedValue(0);

  // Shared values for hold and tray offsets
  const holdBoardOffsetX = useSharedValue(0);
  const holdBoardOffsetY = useSharedValue(0);

  const slot0BoardOffsetX = useSharedValue(0);
  const slot1BoardOffsetX = useSharedValue(0);
  const slot2BoardOffsetX = useSharedValue(0);
  const slotBoardOffsetY = useSharedValue(0);

  const slot0HoldOffsetX = useSharedValue(0);
  const slot1HoldOffsetX = useSharedValue(0);
  const slot2HoldOffsetX = useSharedValue(0);
  const slotHoldOffsetY = useSharedValue(0);

  const isHoldHovered = useSharedValue(false);

  const slotBoardOffsetXs = [
    slot0BoardOffsetX,
    slot1BoardOffsetX,
    slot2BoardOffsetX,
  ];
  const slotHoldOffsetXs = [
    slot0HoldOffsetX,
    slot1HoldOffsetX,
    slot2HoldOffsetX,
  ];

  useEffect(() => {
    if (boardLayout && bottomRowLayout) {
      const rowYOffset = bottomRowLayout.y - boardLayout.y;
      const rowXOffset = bottomRowLayout.x - boardLayout.x;

      holdBoardOffsetX.value = rowXOffset;
      holdBoardOffsetY.value = rowYOffset;

      slotBoardOffsetY.value = rowYOffset;
      slotHoldOffsetY.value = 0;

      const trayX = boardSize - trayWidth;
      for (let i = 0; i < 3; i++) {
        const slotXInRow = trayX + i * (slotWidth + TRAY_GAP);
        slotBoardOffsetXs[i].value = rowXOffset + slotXInRow;
        slotHoldOffsetXs[i].value = -slotXInRow;
      }
    }
  }, [
    boardLayout,
    bottomRowLayout,
    boardSize,
    trayWidth,
    slotWidth,
    slotBoardOffsetXs,
    slotHoldOffsetXs,
    holdBoardOffsetX,
    holdBoardOffsetY,
    slotBoardOffsetY,
    slotHoldOffsetY,
  ]);

  const ghostAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ghostOpacity.value,
    transform: [
      { translateX: ghostX.value },
      { translateY: ghostY.value },
    ],
  }));

  const handlePlacePiece = (slotIndex, piece, row, col) => {
    setBoard((prev) =>
      placePiece(prev, piece, row, col, piece.color, 'normal')
    );
    setTrayPieces((prev) => {
      const next = [...prev];
      next[slotIndex] = null;
      if (next.every((p) => p === null)) {
        return INITIAL_TEST_PIECES;
      }
      return next;
    });
    setCanHold(true);
  };

  const handlePlaceHeldPiece = (piece, row, col) => {
    setBoard((prev) =>
      placePiece(prev, piece, row, col, piece.color, 'normal')
    );
    setHeldPiece(null);
    setCanHold(true);
  };

  const handleHoldFromTray = (slotIndex, piece) => {
    const previousHold = heldPiece;
    setHeldPiece(piece);
    setTrayPieces((prev) => {
      const next = [...prev];
      next[slotIndex] = previousHold;
      if (next.every((p) => p === null)) {
        return INITIAL_TEST_PIECES;
      }
      return next;
    });
    setCanHold(false);
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.bg,
          paddingBottom: Math.max(insets.bottom, 16) + 16,
        },
      ]}
    >
      <Stack.Screen
        options={{
          title: 'Classic',
          headerTitleAlign: 'center',
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Pause game"
              hitSlop={8}
              style={styles.pauseButton}
            >
              <Text style={[styles.pauseText, { color: theme.ink }]}>⏸</Text>
            </Pressable>
          ),
        }}
      />

      {/* Score Section */}
      <View style={styles.scoreContainer}>
        <Text style={[styles.score, { color: theme.ink }]}>12,480</Text>
        <Text style={[styles.bestScore, { color: theme.inkMuted }]}>
          best 31,020
        </Text>
      </View>

      {/* Hero Board */}
      <View
        onLayout={(e) => setBoardLayout(e.nativeEvent.layout)}
        style={[styles.boardContainer, { width: boardSize, height: boardSize }]}
      >
        <Board board={board} size={boardSize} />
        <Animated.View
          pointerEvents="none"
          style={[styles.ghostOverlay, ghostAnimatedStyle]}
        >
          {ghostPiece && (
            <Piece
              cells={ghostPiece.cells}
              color={ghostPiece.color}
              cellSize={metrics.cellSize}
              ghost
            />
          )}
        </Animated.View>
      </View>

      {/* Bottom Area: Hold Slot to the left of Tray */}
      <View
        onLayout={(e) => setBottomRowLayout(e.nativeEvent.layout)}
        style={[styles.bottomRow, { width: boardSize }]}
      >
        <HoldSlot
          piece={heldPiece}
          slotWidth={holdWidth}
          slotHeight={slotHeight}
          cellSize={metrics.cellSize}
          gap={metrics.gap}
          padding={metrics.padding}
          boardRef={boardRef}
          slotBoardOffsetX={holdBoardOffsetX}
          slotBoardOffsetY={holdBoardOffsetY}
          ghost={{
            ghostX,
            ghostY,
            ghostOpacity,
            setActiveGhostPiece: setGhostPiece,
          }}
          onPlace={handlePlaceHeldPiece}
          canHold={canHold}
          isHovered={isHoldHovered}
          reduceMotion={reduceMotion}
          theme={theme}
        />
        <Tray
          pieces={trayPieces}
          boardSize={boardSize}
          trayWidth={trayWidth}
          slotWidth={slotWidth}
          slotHeight={slotHeight}
          gap={TRAY_GAP}
          board={board}
          boardLayout={boardLayout}
          slotOffsetXs={slotBoardOffsetXs}
          slotOffsetY={slotBoardOffsetY}
          slotHoldOffsetXs={slotHoldOffsetXs}
          slotHoldOffsetY={slotHoldOffsetY}
          holdWidth={holdWidth}
          holdHeight={slotHeight}
          canHold={canHold}
          isHoldHovered={isHoldHovered}
          ghost={{
            ghostX,
            ghostY,
            ghostOpacity,
            setActiveGhostPiece: setGhostPiece,
          }}
          onPlace={handlePlacePiece}
          onHold={handleHoldFromTray}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  pauseButton: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: {
    fontSize: 18,
  },
  scoreContainer: {
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 8,
  },
  score: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 56,
    letterSpacing: -1,
  },
  bestScore: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    marginTop: 2,
  },
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 8,
    position: 'relative',
  },
  ghostOverlay: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
  bottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
    overflow: 'visible',
    position: 'relative',
    zIndex: 100,
  },
});
