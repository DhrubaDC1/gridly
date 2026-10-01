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
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from './theme';
import useReduceMotion from './useReduceMotion';
import Board from './components/Board';
import Piece from './components/Piece';
import Tray from './components/Tray';
import HoldSlot from './components/HoldSlot';
import ScoreTicker from './components/ScoreTicker';
import ComboLabel from './components/ComboLabel';
import PauseMenu from './components/PauseMenu';
import GameOver from './components/GameOver';
import HandHint from './components/HandHint';
import { getDefaultBoardSize, getBoardMetrics } from './boardLayout';
import { useGameController } from '../game/useGameController';
import { adaptPiece, adaptTray } from '../game/adapter';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import { onPickup } from '../services/feedback';
import { calculateTimerRatio, getRemainingSeconds } from '../game/timer';
import { buildGoalChipText } from '../game/adventureProgress';
import levelsData from '../../assets/levels/levels.json';

/**
 * Shared game UI component for Classic, Blitz, and other modes.
 *
 * @param {Object} props
 * @param {string} [props.mode='classic'] - Game mode ('classic' | 'blitz' | 'adventure').
 * @param {string} [props.title] - Optional custom header title override.
 * @param {number | Object} [props.level] - Optional level id or level config for Adventure mode.
 */
export default function GameScreen({
  mode = 'classic',
  title: customTitle,
  level: levelProp,
}) {
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
  } = useGameController({ mode, level: levelProp });

  const savedBestScore = useProgress(
    (s) => s.stats?.bestScore?.[mode] ?? 0
  );
  const bestScore = Math.max(savedBestScore || 0, state.score);
  const seenOnboarding = useSettings((s) => s.seenOnboarding);
  const colorblind = useSettings((s) => s.colorblind);

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

  // Reanimated timer progress for Blitz
  const timerProgress = useSharedValue(
    mode === 'blitz' ? calculateTimerRatio(state.timeLeftMs, 120000) : 0
  );

  useEffect(() => {
    if (mode === 'blitz' && typeof state.timeLeftMs === 'number') {
      const target = calculateTimerRatio(state.timeLeftMs, 120000);
      if (reduceMotion) {
        timerProgress.value = target;
      } else {
        timerProgress.value = withTiming(target, { duration: 100 });
      }
    }
  }, [mode, state.timeLeftMs, reduceMotion, timerProgress]);

  const timerFillStyle = useAnimatedStyle(() => ({
    width: `${timerProgress.value * 100}%`,
  }));

  const remainingSeconds =
    mode === 'blitz' ? getRemainingSeconds(state.timeLeftMs) : 0;

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
    router.replace(mode === 'adventure' ? '/adventure' : '/');
  }, [mode, resume, router]);

  const handleNextLevel = useCallback(() => {
    resume();
    const currentId =
      state.levelId ?? state.level ?? (typeof levelProp === 'number' ? levelProp : 1);
    const nextId = currentId + 1;
    const hasNext = levelsData.some((lvl) => lvl.id === nextId);
    if (hasNext) {
      router.replace(`/adventure/${nextId}`);
    } else {
      router.replace('/adventure');
    }
  }, [state.levelId, state.level, levelProp, resume, router]);

  const handleMap = useCallback(() => {
    resume();
    router.replace('/adventure');
  }, [resume, router]);

  const showHandHint =
    mode === 'classic' &&
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

  const headerTitle =
    customTitle ||
    (mode === 'blitz'
      ? 'Blitz'
      : mode === 'adventure'
      ? `Level ${state.levelId ?? state.level ?? levelProp ?? 1}`
      : 'Classic');

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
          title: headerTitle,
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

      {/* Blitz Timer Bar */}
      {mode === 'blitz' && (
        <View style={[styles.timerContainer, { width: boardSize }]}>
          <View
            style={[styles.timerTrack, { backgroundColor: theme.cellEmpty }]}
            accessible={true}
            accessibilityRole="progressbar"
            accessibilityLabel={`Time remaining: ${remainingSeconds} seconds`}
            accessibilityValue={{
              min: 0,
              max: 120,
              now: remainingSeconds,
            }}
          >
            <Animated.View
              style={[
                styles.timerFill,
                { backgroundColor: theme.accent },
                timerFillStyle,
              ]}
            />
          </View>
          <Text
            style={[styles.timerText, { color: theme.inkMuted }]}
            accessibilityRole="text"
            accessibilityLabel={`${remainingSeconds} seconds remaining`}
          >
            {`${remainingSeconds}s`}
          </Text>
        </View>
      )}

      {/* Score Section */}
      <View style={styles.scoreContainer}>
        <ScoreTicker score={state.score} />
        {mode === 'adventure' ? (
          <View style={styles.adventureGoalsContainer} testID="adventure-goals">
            <View style={styles.goalChipsRow}>
              {(state.goals || []).map((goal, idx) => {
                const chipText = buildGoalChipText(goal);
                return (
                  <View
                    key={idx}
                    style={[
                      styles.goalChip,
                      {
                        backgroundColor: goal.completed
                          ? theme.well
                          : theme.surface,
                        borderColor: goal.completed
                          ? theme.accent
                          : theme.cellEmpty,
                      },
                    ]}
                    accessibilityRole="text"
                    accessibilityLabel={chipText}
                  >
                    <Text
                      style={[
                        styles.goalChipText,
                        {
                          color: goal.completed ? theme.accent : theme.ink,
                          fontFamily: goal.completed
                            ? 'Figtree_600SemiBold'
                            : 'Figtree_500Medium',
                        },
                      ]}
                    >
                      {chipText}
                    </Text>
                  </View>
                );
              })}
              {typeof state.movesLeft === 'number' && (
                <View
                  style={[
                    styles.goalChip,
                    {
                      backgroundColor: theme.surface,
                      borderColor:
                        state.movesLeft <= 3 ? theme.danger : theme.cellEmpty,
                    },
                  ]}
                  accessibilityRole="text"
                  accessibilityLabel={`${state.movesLeft} moves left`}
                >
                  <Text
                    style={[
                      styles.goalChipText,
                      {
                        color:
                          state.movesLeft <= 3 ? theme.danger : theme.inkMuted,
                        fontFamily: 'Figtree_600SemiBold',
                      },
                    ]}
                  >
                    {`${state.movesLeft} ${
                      state.movesLeft === 1 ? 'move' : 'moves'
                    }`}
                  </Text>
                </View>
              )}
            </View>
          </View>
        ) : (
          <Text style={[styles.bestScore, { color: theme.inkMuted }]}>
            best {bestScore.toLocaleString()}
          </Text>
        )}
      </View>

      {/* Hero Board - Hidden while paused */}
      <View
        onLayout={(e) => setBoardLayout(e.nativeEvent.layout)}
        style={[
          styles.boardContainer,
          {
            width: boardSize,
            height: boardSize,
            opacity: isPaused ? 0 : 1,
          },
        ]}
      >
        <Board
          board={state.board}
          size={boardSize}
          colorblind={colorblind}
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
        style={[
          styles.bottomRow,
          {
            width: boardSize,
            opacity: isPaused ? 0 : 1,
          },
        ]}
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
          style={{ opacity: isPaused ? 0 : 1 }}
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
      <GameOver
        visible={state.over}
        mode={mode}
        overReason={state.overReason}
        score={state.score}
        stars={state.stars}
        stats={state.stats}
        previousBestScore={savedBestScore}
        onPlayAgain={handleRestart}
        onHome={handleQuit}
        onNextLevel={handleNextLevel}
        onReplay={handleRestart}
        onMap={handleMap}
        theme={theme}
      />
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
  timerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 4,
    height: 24,
  },
  timerTrack: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  timerText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    marginLeft: 12,
    minWidth: 32,
    textAlign: 'right',
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
  adventureGoalsContainer: {
    alignItems: 'center',
    marginTop: 6,
  },
  goalChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  goalChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goalChipText: {
    fontSize: 13,
  },
});
