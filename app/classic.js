import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  useWindowDimensions,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
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
import ScoreTicker from '../src/ui/components/ScoreTicker';
import ComboLabel from '../src/ui/components/ComboLabel';
import PauseMenu from '../src/ui/components/PauseMenu';
import HandHint from '../src/ui/components/HandHint';
import { getDefaultBoardSize, getBoardMetrics } from '../src/ui/boardLayout';
import { useGameController } from '../src/game/useGameController';
import { adaptPiece, adaptTray } from '../src/game/adapter';
import { useProgress } from '../src/store/useProgress';
import { useSettings } from '../src/store/useSettings';
import { onPickup } from '../src/services/feedback';

export default function ClassicScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const reduceMotion = useReduceMotion();

  const {
    state,
    clearing,
    onClearingComplete,
    place,
    hold,
    restart,
    subscribe,
    isPaused,
    pause,
    resume,
  } = useGameController();
  const savedBestScore = useProgress((s) => s.stats.bestScore.classic);
  const bestScore = Math.max(savedBestScore || 0, state.score);
  const seenOnboarding = useSettings((s) => s.seenOnboarding);

  const [hasStartedDragging, setHasStartedDragging] = useState(false);

  const trayPieces = useMemo(() => adaptTray(state.tray), [state.tray]);
  const heldPiece = useMemo(() => adaptPiece(state.hold), [state.hold]);
  const canHold = !state.holdUsed && !state.over && !isPaused;

  const [ghostPiece, setGhostPiece] = useState(null);
  const [boardLayout, setBoardLayout] = useState(null);
  const [bottomRowLayout, setBottomRowLayout] = useState(null);

  const boardRef = useRef(state.board);
  boardRef.current = state.board;

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

  const slotBoardOffsetXs = useMemo(
    () => [slot0BoardOffsetX, slot1BoardOffsetX, slot2BoardOffsetX],
    [slot0BoardOffsetX, slot1BoardOffsetX, slot2BoardOffsetX]
  );
  const slotHoldOffsetXs = useMemo(
    () => [slot0HoldOffsetX, slot1HoldOffsetX, slot2HoldOffsetX],
    [slot0HoldOffsetX, slot1HoldOffsetX, slot2HoldOffsetX]
  );

  const ghostObject = useMemo(
    () => ({
      ghostX,
      ghostY,
      ghostOpacity,
      setActiveGhostPiece: setGhostPiece,
    }),
    [ghostX, ghostY, ghostOpacity]
  );

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

  const handlePickup = useCallback(() => {
    setHasStartedDragging(true);
    onPickup();
  }, []);

  const handlePlacePiece = useCallback(
    (slotIndex, piece, row, col) => {
      place(slotIndex, row, col);
    },
    [place]
  );

  const handlePlaceHeldPiece = useCallback(
    (piece, row, col) => {
      place('hold', row, col);
    },
    [place]
  );

  const handleHoldFromTray = useCallback(
    (slotIndex) => {
      hold(slotIndex);
    },
    [hold]
  );

  const handlePause = useCallback(() => {
    if (!state.over) {
      pause();
    }
  }, [state.over, pause]);

  const handleResume = useCallback(() => {
    resume();
  }, [resume]);

  const handleRestart = useCallback(() => {
    resume();
    restart();
  }, [resume, restart]);

  const handleQuit = useCallback(() => {
    resume();
    router.replace('/');
  }, [resume, router]);

  const showHandHint =
    !seenOnboarding &&
    !hasStartedDragging &&
    !isPaused &&
    !state.over &&
    state.tray.some((p) => p?.id === 'line_1x3');

  const hintCoords = useMemo(() => {
    if (!boardLayout || !bottomRowLayout) return null;
    const trayX = boardSize - trayWidth;
    const startX = bottomRowLayout.x + trayX + slotWidth / 2;
    const startY = bottomRowLayout.y + slotHeight / 2;

    const step = metrics.cellSize + metrics.gap;
    const endX =
      boardLayout.x +
      metrics.padding +
      6 * step +
      metrics.cellSize / 2;
    const endY =
      boardLayout.y +
      metrics.padding +
      7 * step +
      metrics.cellSize / 2;

    return {
      startPos: { x: startX, y: startY },
      endPos: { x: endX, y: endY },
    };
  }, [
    boardLayout,
    bottomRowLayout,
    boardSize,
    trayWidth,
    slotWidth,
    slotHeight,
    metrics,
  ]);

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
              onPress={handlePause}
              style={styles.pauseButton}
            >
              <Text style={[styles.pauseText, { color: theme.ink }]}>⏸</Text>
            </Pressable>
          ),
        }}
      />

      {/* Score Section */}
      <View style={styles.scoreContainer}>
        <ScoreTicker score={state.score} />
        <Text style={[styles.bestScore, { color: theme.inkMuted }]}>
          best {bestScore.toLocaleString()}
        </Text>
      </View>

      {/* Hero Board - Dimmed while paused */}
      <View
        onLayout={(e) => setBoardLayout(e.nativeEvent.layout)}
        style={[
          styles.boardContainer,
          {
            width: boardSize,
            height: boardSize,
            opacity: isPaused ? 0.08 : 1,
          },
        ]}
      >
        <Board
          board={state.board}
          size={boardSize}
          clearing={clearing}
          subscribe={subscribe}
          onClearingComplete={onClearingComplete}
        />
        <ComboLabel subscribe={subscribe} />
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
          ghost={ghostObject}
          onPlace={handlePlaceHeldPiece}
          onPickup={handlePickup}
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
          board={state.board}
          boardLayout={boardLayout}
          slotOffsetXs={slotBoardOffsetXs}
          slotOffsetY={slotBoardOffsetY}
          slotHoldOffsetXs={slotHoldOffsetXs}
          slotHoldOffsetY={slotHoldOffsetY}
          holdWidth={holdWidth}
          holdHeight={slotHeight}
          canHold={canHold}
          isHoldHovered={isHoldHovered}
          ghost={ghostObject}
          onPlace={handlePlacePiece}
          onHold={handleHoldFromTray}
          onPickup={handlePickup}
        />
      </View>

      {/* Hand Hint Animation (loops until dragging starts, disappears on drag) */}
      <HandHint
        visible={Boolean(showHandHint && hintCoords)}
        startPos={hintCoords?.startPos}
        endPos={hintCoords?.endPos}
        theme={theme}
      />

      {/* Pause Menu Overlay */}
      <PauseMenu
        visible={isPaused}
        onResume={handleResume}
        onRestart={handleRestart}
        onQuit={handleQuit}
        theme={theme}
      />

      {/* Game Over Overlay */}
      {state.over && (
        <View style={styles.gameOverOverlay}>
          <View
            style={[styles.gameOverCard, { backgroundColor: theme.surface }]}
          >
            <Text style={[styles.gameOverTitle, { color: theme.ink }]}>
              Game over
            </Text>
            <Text style={[styles.gameOverScore, { color: theme.ink }]}>
              {state.score.toLocaleString()}
            </Text>
            <Text style={[styles.gameOverBest, { color: theme.inkMuted }]}>
              best {bestScore.toLocaleString()}
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Play again"
              onPress={() => restart()}
              style={[
                styles.playAgainButton,
                { backgroundColor: theme.accent },
              ]}
            >
              <Text style={styles.playAgainText}>Play again</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    position: 'relative',
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
  gameOverOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: 24,
  },
  gameOverCard: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  gameOverTitle: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 20,
    marginBottom: 8,
  },
  gameOverScore: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 40,
    letterSpacing: -1,
    marginBottom: 4,
  },
  gameOverBest: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    marginBottom: 24,
  },
  playAgainButton: {
    minWidth: 160,
    minHeight: 48,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playAgainText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
