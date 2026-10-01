import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/ui/theme';
import Board from '../src/ui/components/Board';
import Piece from '../src/ui/components/Piece';
import { getDefaultBoardSize, getBoardMetrics } from '../src/ui/boardLayout';

// Hardcoded test board containing a few blocks of different colors,
// one gem block, and one lock block (hp: 2).
const TEST_BOARD = Array(64).fill(null);
TEST_BOARD[18] = { color: 0, kind: 'normal' }; // Row 2, Col 2 (Harbor)
TEST_BOARD[19] = { color: 1, kind: 'normal' }; // Row 2, Col 3 (Sage)
TEST_BOARD[25] = { color: 2, kind: 'normal' }; // Row 3, Col 1 (Heather)
TEST_BOARD[26] = { color: 3, kind: 'normal' }; // Row 3, Col 2 (Ochre)
TEST_BOARD[27] = { color: 4, kind: 'normal' }; // Row 3, Col 3 (Lavender)
TEST_BOARD[28] = { color: 5, kind: 'gem' }; // Row 3, Col 4 (Lagoon - gem)
TEST_BOARD[34] = { color: 3, kind: 'lock', hp: 2 }; // Row 4, Col 2 (Ochre - lock)
TEST_BOARD[35] = { color: 0, kind: 'normal' }; // Row 4, Col 3 (Harbor)
TEST_BOARD[36] = { color: 1, kind: 'normal' }; // Row 4, Col 4 (Sage)
TEST_BOARD[43] = { color: 2, kind: 'normal' }; // Row 5, Col 3 (Heather)
TEST_BOARD[44] = { color: 4, kind: 'normal' }; // Row 5, Col 4 (Lavender)
TEST_BOARD[45] = { color: 5, kind: 'normal' }; // Row 5, Col 5 (Lagoon)

// Three pieces in a row under the board
const TEST_PIECES = [
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

  const boardSize = getDefaultBoardSize(screenWidth);
  const metrics = getBoardMetrics(boardSize);
  const trayCellSize = Math.round(metrics.cellSize * 0.55);

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
      <View style={styles.boardContainer}>
        <Board board={TEST_BOARD} size={boardSize} />
      </View>

      {/* Tray of 3 pieces */}
      <View style={[styles.trayContainer, { width: boardSize }]}>
        {TEST_PIECES.map((piece, index) => (
          <View
            key={`piece-${index}`}
            style={[
              styles.traySlot,
              {
                backgroundColor: theme.surface,
              },
            ]}
          >
            <Piece
              cells={piece.cells}
              color={piece.color}
              cellSize={trayCellSize}
            />
          </View>
        ))}
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
  },
  trayContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    marginTop: 8,
  },
  traySlot: {
    flex: 1,
    height: 96,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
