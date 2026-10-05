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
import Icon from './components/Icon';
import Backdrop from './components/Backdrop';
import GoalChip from './components/GoalChip';
import GemFlight from './components/GemFlight';
import {
  getDefaultBoardSize,
  getBoardMetrics,
  getCellPosition,
} from './boardLayout';
import { useGameController } from '../game/useGameController';
import { adaptPiece, adaptTray } from '../game/adapter';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import {
  onPickup,
  onGemCollected,
  onGoalCompleted,
} from '../services/feedback';
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
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
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
  const paddingBottom = Math.max(insets.bottom, 16) + 16;
  const boardCenterY =
    screenHeight - paddingBottom - slotHeight - 20 - boardSize / 2;

  // Adventure goal feedback: gems fly from the board into their chip, and the
  // chip celebrates once its goal is met (after the last gem lands).
  const rootRef = useRef(null);
  const boardContainerRef = useRef(null);
  const gemChipRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const metricsRef = useRef(metrics);
  metricsRef.current = metrics;
  const [flights, setFlights] = useState([]);
  const [gemsInFlight, setGemsInFlight] = useState(0);
  const inFlightRef = useRef(0);
  const flightIdRef = useRef(0);
  const pendingGemGoalRef = useRef(null);
  const [goalFx, setGoalFx] = useState({});

  const bumpGoal = useCallback((index, key) => {
    setGoalFx((prev) => ({
      ...prev,
      [index]: { ...prev[index], [key]: (prev[index]?.[key] ?? 0) + 1 },
    }));
  }, []);

  const celebrateGoal = useCallback(
    (index) => {
      bumpGoal(index, 'celebrate');
      // The final goal already gets the level-complete success haptic.
      if (!stateRef.current.over) onGoalCompleted();
    },
    [bumpGoal]
  );

  const landGems = useCallback(
    (count) => {
      inFlightRef.current = Math.max(0, inFlightRef.current - count);
      setGemsInFlight(inFlightRef.current);
      if (inFlightRef.current === 0 && pendingGemGoalRef.current !== null) {
        celebrateGoal(pendingGemGoalRef.current);
        pendingGemGoalRef.current = null;
      }
    },
    [celebrateGoal]
  );

  const handleGemArrive = useCallback(
    (id) => {
      setFlights((prev) => prev.filter((f) => f.id !== id));
      const gemGoal = (stateRef.current.goals || []).findIndex(
        (g) => g.type === 'gems'
      );
      if (gemGoal !== -1) bumpGoal(gemGoal, 'bump');
      onGemCollected();
      landGems(1);
    },
    [bumpGoal, landGems]
  );

  useEffect(() => {
    if (mode !== 'adventure') return;
    const measure = (ref) =>
      new Promise((resolve) => {
        if (!ref.current?.measureInWindow) return resolve(null);
        ref.current.measureInWindow((x, y, w, h) => resolve({ x, y, w, h }));
      });

    return subscribe((events) => {
      for (const e of events) {
        if (e.type === 'goalCompleted' && e.goal !== 'gems') {
          celebrateGoal(e.index);
        }
      }
      const gemDone = events.find(
        (e) => e.type === 'goalCompleted' && e.goal === 'gems'
      );
      if (gemDone) pendingGemGoalRef.current = gemDone.index;

      const gems = events
        .filter((e) => e.type === 'gemCollected')
        .map((e) => e.index);
      if (gems.length === 0) {
        landGems(0);
        return;
      }

      // Count them in flight now so the chip never shows the new total early.
      inFlightRef.current += gems.length;
      setGemsInFlight(inFlightRef.current);

      Promise.all([
        measure(rootRef),
        measure(boardContainerRef),
        measure(gemChipRef),
      ]).then(([root, board, chip]) => {
        if (!root || !board || !chip) {
          onGemCollected();
          landGems(gems.length);
          return;
        }
        const m = metricsRef.current;
        const to = {
          x: chip.x - root.x + chip.w / 2,
          y: chip.y - root.y + chip.h / 2,
        };
        const batch = gems.map((index, order) => {
          const { x, y } = getCellPosition(index, m.cellSize, m.padding, m.gap);
          flightIdRef.current += 1;
          return {
            id: `gem-${flightIdRef.current}`,
            order,
            from: {
              x: board.x - root.x + x + m.cellSize / 2,
              y: board.y - root.y + y + m.cellSize / 2,
            },
            to,
          };
        });
        setFlights((prev) => [...prev, ...batch]);
      });
    });
  }, [mode, subscribe, celebrateGoal, landGems]);

  // Let the last clear and goal celebration play before the level-complete sheet.
  const [showGameOver, setShowGameOver] = useState(state.over);
  useEffect(() => {
    if (!state.over) {
      setShowGameOver(false);
      return;
    }
    if (state.overReason !== 'levelComplete') {
      setShowGameOver(true);
      return;
    }
    const t = setTimeout(
      () => setShowGameOver(true),
      reduceMotion ? 400 : 1200
    );
    return () => clearTimeout(t);
  }, [state.over, state.overReason, reduceMotion]);

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
    setFlights([]);
    inFlightRef.current = 0;
    setGemsInFlight(0);
    pendingGemGoalRef.current = null;
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
    <View ref={rootRef} style={[styles.root, { backgroundColor: theme.bg }]}>
      <Backdrop boardCenterY={boardCenterY} />
      <View
        style={[
          styles.container,
          {
            paddingBottom,
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
              hitSlop={2}
              onPress={handlePause}
              style={[
                styles.pauseButton,
                { backgroundColor: theme.surfaceSunken },
              ]}
            >
              <Icon name="pause" size={20} color={theme.ink} />
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
      <View style={styles.scoreWrapper} testID="score-wrapper">
        <View style={styles.scoreContainer} testID="score-container">
          <ScoreTicker score={state.score} />
          {mode === 'adventure' ? (
            <View style={styles.adventureGoalsContainer} testID="adventure-goals">
              <View style={styles.goalChipsRow}>
                {(state.goals || []).map((goal, idx) => {
                  const landing = goal.type === 'gems' ? gemsInFlight : 0;
                  const shown = landing
                    ? {
                        ...goal,
                        current: Math.max(0, goal.current - landing),
                        completed: false,
                      }
                    : goal;
                  return (
                    <GoalChip
                      key={idx}
                      ref={goal.type === 'gems' ? gemChipRef : undefined}
                      text={buildGoalChipText(shown)}
                      completed={Boolean(shown.completed)}
                      celebrate={goalFx[idx]?.celebrate}
                      bump={goalFx[idx]?.bump}
                      theme={theme}
                      reduceMotion={reduceMotion}
                    />
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
            <View
              style={[
                styles.bestChip,
                { backgroundColor: theme.surfaceSunken },
              ]}
              testID="best-chip"
              accessibilityRole="text"
              accessibilityLabel={`Best ${bestScore.toLocaleString()}`}
            >
              <Icon name="trophy" size={12} color={theme.inkMuted} />
              <Text style={[styles.bestText, { color: theme.inkMuted }]}>
                {`Best ${bestScore.toLocaleString()}`}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Bottom Group: Board and Tray */}
      <View style={styles.bottomGroup} testID="bottom-group">
        {/* Hero Board - Hidden while paused */}
        <View
          testID="board-container"
          ref={boardContainerRef}
          collapsable={false}
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
          testID="bottom-row"
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
      </View>

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
        visible={showGameOver}
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
      <GemFlight
        flights={flights}
        onArrive={handleGemArrive}
        theme={theme}
        reduceMotion={reduceMotion}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    position: 'relative',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 16,
    position: 'relative',
  },
  pauseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
  scoreWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  scoreContainer: {
    alignItems: 'center',
  },
  score: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 56,
    letterSpacing: -0.5,
  },
  bestChip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingVertical: 4,
    paddingHorizontal: 10,
    gap: 6,
    marginTop: 6,
  },
  bestText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
  bottomGroup: {
    alignItems: 'center',
    gap: 20,
    overflow: 'visible',
    position: 'relative',
    zIndex: 100,
  },
  boardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'flex-start',
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
