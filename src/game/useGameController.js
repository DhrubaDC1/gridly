import { useState, useRef, useEffect } from 'react';
import { AppState } from 'react-native';
import {
  createGame,
  placePiece,
  holdPiece,
  serializeGame,
  restoreGame,
} from '../engine/game';
import {
  createBlitzGame,
  placeBlitz,
  tick as blitzTick,
} from '../engine/modes/blitz';
import { calculateElapsed } from './timer';
import { evaluate } from '../engine/achievements';
import { applyGameResult } from '../engine/stats';
import { useProgress } from '../store/useProgress';
import { useSettings } from '../store/useSettings';
import { useToast } from '../store/useToast';
import { onAchievement } from '../services/feedback';
import { SCRIPTED_INITIAL_STATE } from './onboarding';
import { playFeedbackForEvents } from './eventsFeedback';
import { buildClearingDescription } from './clearWave';
import { buildGameResult, getLocalDayKey } from './gameResult';

/**
 * Generates a random 32-bit positive integer seed for deterministic engine runs.
 *
 * @returns {number}
 */
function generateSeed() {
  return Math.floor(Math.random() * 2147483647);
}

/**
 * Creates a standalone game controller managing engine state, actions, event stream,
 * persistence, and pause state.
 *
 * @param {Object} [options]
 * @param {number} [options.seed] - Seed to use for new game.
 * @param {string} [options.mode='classic'] - Game mode ('classic', 'blitz', etc.).
 * @param {import('../engine/game').GameState} [options.initialState] - Pre-loaded state.
 * @param {boolean} [options.persist=true] - Whether to persist in-progress game to useProgress.
 * @param {{ board: import('../engine/board').Board, tray: (Object | null)[] }} [options.initial]
 * @returns {Object} Game controller instance.
 */
export function createGameController(options = {}) {
  const {
    seed: initialSeed,
    mode = 'classic',
    initialState = null,
    persist: persistOption = true,
    initial: customInitial = null,
    now: customNow = null,
    feedback: customFeedback = null,
    autoStartTimer = true,
  } = options;

  const persist = mode === 'blitz' ? false : persistOption;
  const now = typeof customNow === 'function' ? customNow : () => Date.now();
  const fb = customFeedback || { onAchievement };

  let state = null;
  let clearing = null;
  let paused = false;

  // Duration tracking in milliseconds (excluding paused time)
  let accumulatedDurationMs = 0;
  let lastActiveTime = now();
  let lastTickTime = now();
  let hasHandledGameOver = false;
  let timerInterval = null;

  if (initialState) {
    state = initialState;
    hasHandledGameOver = Boolean(state.over);
  } else if (persist) {
    try {
      const saved = useProgress.getState().inProgress?.[mode];
      if (saved) {
        const restored = restoreGame(saved);
        if (restored && !restored.over) {
          state = restored;
        }
      }
    } catch {
      state = null;
    }
  }

  if (!state) {
    let initial = customInitial;
    if (!initial && mode === 'classic' && persist) {
      const seenOnboarding = useSettings.getState().seenOnboarding;
      const hasSaved = Boolean(useProgress.getState().inProgress?.[mode]);
      if (!seenOnboarding && !hasSaved) {
        initial = SCRIPTED_INITIAL_STATE;
      }
    }
    const seed = typeof initialSeed === 'number' ? initialSeed : generateSeed();
    state = mode === 'blitz'
      ? createBlitzGame({ seed, initial })
      : createGame({ seed, mode, initial });
    hasHandledGameOver = Boolean(state.over);
  }

  function tick(forcedElapsedMs) {
    if (state.over || paused) {
      return { state, events: [] };
    }

    const currentTime = now();
    const elapsed =
      typeof forcedElapsedMs === 'number'
        ? forcedElapsedMs
        : calculateElapsed(lastTickTime, currentTime);
    lastTickTime = currentTime;

    if (elapsed <= 0) {
      return { state, events: [] };
    }

    if (mode === 'blitz') {
      const result = blitzTick(state, elapsed);
      if (result.state !== state) {
        state = result.state;
        notifyState();
        if (result.events && result.events.length > 0) {
          notifyEvents(result.events);
        }
        if (state.over) {
          stopTimer();
          handleGameOver(state);
        }
      }
      return result;
    }

    return { state, events: [] };
  }

  function startTimer() {
    if (mode !== 'blitz' || timerInterval !== null || state.over || paused) {
      return;
    }
    lastTickTime = now();
    timerInterval = setInterval(() => {
      tick();
    }, 100);
    if (timerInterval && typeof timerInterval.unref === 'function') {
      timerInterval.unref();
    }
  }

  function stopTimer() {
    if (timerInterval !== null) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  if (mode === 'blitz' && autoStartTimer && !state.over && !paused) {
    startTimer();
  }

  function getDurationMs() {
    if (paused || state.over) {
      return accumulatedDurationMs;
    }
    return accumulatedDurationMs + Math.max(0, now() - lastActiveTime);
  }

  function unlockAchievements(unlockedIds) {
    if (!Array.isArray(unlockedIds) || unlockedIds.length === 0) return;
    for (let i = 0; i < unlockedIds.length; i++) {
      const id = unlockedIds[i];
      const nowIso = new Date().toISOString();
      useProgress.getState().unlockAchievement(id, nowIso);
      (fb.onAchievement || onAchievement)();
      useToast.getState().showAchievementToast(id);
    }
  }

  function handleGameOver(finalState) {
    if (hasHandledGameOver || !finalState || !finalState.over) return;
    hasHandledGameOver = true;

    if (!paused) {
      accumulatedDurationMs += Math.max(0, now() - lastActiveTime);
    }
    const durationMs = Math.round(accumulatedDurationMs);
    const dayKey = getLocalDayKey(new Date());

    const currentStats = useProgress.getState().stats;
    const gameResult = buildGameResult(finalState, { durationMs, dayKey });
    const nextStats = applyGameResult(currentStats, gameResult);
    const modeKey = finalState.mode || mode;
    const prevScoreTotals = currentStats.scoreTotals || {};
    const scoreTotals = {
      ...prevScoreTotals,
      [modeKey]: (prevScoreTotals[modeKey] ?? 0) + (finalState.score || 0),
    };
    useProgress.getState().setStats({ ...nextStats, scoreTotals });

    const currentUnlocked = useProgress.getState().achievements;
    const statUnlocked = evaluate([], nextStats, {
      unlocked: currentUnlocked,
      mode: finalState.mode || mode,
      score: finalState.score,
      adventureLevel: null,
    });
    unlockAchievements(statUnlocked);
  }

  const stateSubscribers = new Set();
  const eventSubscribers = new Set();
  const pauseSubscribers = new Set();

  function notifyState() {
    const listeners = Array.from(stateSubscribers);
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](state, clearing);
    }
  }

  function notifyPause() {
    const listeners = Array.from(pauseSubscribers);
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](paused);
    }
  }

  function notifyEvents(events) {
    if (!events || events.length === 0) return;
    const listeners = Array.from(eventSubscribers);
    for (let i = 0; i < listeners.length; i++) {
      try {
        listeners[i](events);
      } catch (err) {
        console.error('Error in game event subscriber:', err);
      }
    }
  }

  function syncPersistence() {
    if (!persist) return;

    if (state.over) {
      useProgress.getState().clearInProgress(mode);
    } else {
      useProgress.getState().setInProgress(mode, serializeGame(state));
    }
  }

  function pause() {
    if (state.over || paused) return;
    accumulatedDurationMs += Math.max(0, now() - lastActiveTime);
    paused = true;
    stopTimer();
    syncPersistence();
    notifyPause();
    notifyState();
  }

  function resume() {
    if (!paused) return;
    lastActiveTime = now();
    lastTickTime = now();
    paused = false;
    if (mode === 'blitz' && autoStartTimer && !state.over) {
      startTimer();
    }
    notifyPause();
    notifyState();
  }

  function setPaused(val) {
    if (val) {
      pause();
    } else {
      resume();
    }
  }

  /**
   * Places a piece from tray or hold onto the board at (row, col).
   * Invalid placement leaves state unchanged.
   *
   * @param {number | 'hold'} source - Tray index 0-2 or 'hold'
   * @param {number} row - Board row index (0-7)
   * @param {number} col - Board col index (0-7)
   * @returns {boolean} True if placement was valid, false otherwise.
   */
  function place(source, row, col) {
    if (state.over || paused) {
      return false;
    }

    const prevState = state;
    const result =
      mode === 'blitz'
        ? placeBlitz(state, source, row, col, now())
        : placePiece(state, source, row, col);
    if (result.state === state || result.events.length === 0) {
      return false;
    }

    state = result.state;
    clearing = buildClearingDescription(prevState, result.events);

    const hasClear = result.events.some(
      (e) => e.type === 'cleared' && e.linesCount > 0
    );
    if (hasClear && !useSettings.getState().seenOnboarding && mode === 'classic') {
      useSettings.getState().setSeenOnboarding(true);
    }

    // 1. Evaluate achievements after successful place()
    const currentStats = useProgress.getState().stats;
    const currentUnlocked = useProgress.getState().achievements;
    const newlyUnlocked = evaluate(result.events, currentStats, {
      unlocked: currentUnlocked,
      mode: state.mode || mode,
      score: state.score,
      adventureLevel: null,
    });
    unlockAchievements(newlyUnlocked);

    notifyState();
    notifyEvents(result.events);
    playFeedbackForEvents(result.events.filter((e) => e.type !== 'gameOver'));
    syncPersistence();

    // 2. When a game ends, apply game result and evaluate stat-based achievements
    if (state.over) {
      stopTimer();
      handleGameOver(state);
    }

    return true;
  }

  /**
   * Holds a piece from the tray into the hold slot (swapping if occupied).
   *
   * @param {number} trayIndex - Tray index (0-2)
   * @returns {boolean} True if hold was valid, false otherwise.
   */
  function hold(trayIndex) {
    if (state.over || paused || state.holdUsed) {
      return false;
    }

    const result = holdPiece(state, trayIndex);
    if (result.state === state || result.events.length === 0) {
      return false;
    }

    state = result.state;
    clearing = null;
    notifyState();
    notifyEvents(result.events);
    syncPersistence();
    return true;
  }

  /**
   * Restarts the game with a new random seed or given seed.
   *
   * @param {number} [newSeed]
   */
  function restart(newSeed) {
    stopTimer();
    const seed = typeof newSeed === 'number' ? newSeed : generateSeed();
    state =
      mode === 'blitz'
        ? createBlitzGame({ seed })
        : createGame({ seed, mode });
    clearing = null;
    accumulatedDurationMs = 0;
    lastActiveTime = now();
    lastTickTime = now();
    hasHandledGameOver = false;
    if (paused) {
      paused = false;
      notifyPause();
    }
    notifyState();

    if (persist) {
      useProgress.getState().clearInProgress(mode);
    }
    if (mode === 'blitz' && autoStartTimer && !state.over) {
      startTimer();
    }
  }

  /**
   * Clears the current clearing description (called when wave animation completes).
   */
  function clearClearing() {
    clearing = null;
    notifyState();
  }

  /**
   * Subscribes to the engine's events stream.
   *
   * @param {(events: Array<Object>) => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  function subscribe(listener) {
    if (typeof listener !== 'function') return () => {};
    eventSubscribers.add(listener);
    return () => {
      eventSubscribers.delete(listener);
    };
  }

  /**
   * Subscribes to state updates (used internally by React hook).
   *
   * @param {(state: import('../engine/game').GameState, clearing: Object | null) => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  function subscribeState(listener) {
    if (typeof listener !== 'function') return () => {};
    stateSubscribers.add(listener);
    return () => {
      stateSubscribers.delete(listener);
    };
  }

  /**
   * Subscribes to pause changes.
   *
   * @param {(paused: boolean) => void} listener
   * @returns {() => void} Unsubscribe function.
   */
  function subscribePause(listener) {
    if (typeof listener !== 'function') return () => {};
    pauseSubscribers.add(listener);
    return () => {
      pauseSubscribers.delete(listener);
    };
  }

  return {
    get state() {
      return state;
    },
    getState: () => state,
    get clearing() {
      return clearing;
    },
    getClearing: () => clearing,
    clearClearing,
    get isPaused() {
      return paused;
    },
    get paused() {
      return paused;
    },
    getIsPaused: () => paused,
    pause,
    resume,
    setPaused,
    place,
    hold,
    restart,
    tick,
    startTimer,
    stopTimer,
    destroy: () => {
      stopTimer();
      stateSubscribers.clear();
      eventSubscribers.clear();
      pauseSubscribers.clear();
    },
    subscribe,
    subscribeState,
    subscribePause,
    getDurationMs: () => Math.round(getDurationMs()),
    getDuration: () => Math.round(getDurationMs()),
    handleGameOver: (s) => handleGameOver(s || state),
  };
}

/**
 * React hook bridging the pure engine, UI gestures, feedback, persistence, and pause.
 *
 * @param {Object} [options]
 * @returns {{
 *   state: import('../engine/game').GameState,
 *   clearing: Object | null,
 *   isPaused: boolean,
 *   pause: () => void,
 *   resume: () => void,
 *   setPaused: (val: boolean) => void,
 *   onClearingComplete: () => void,
 *   place: (source: number | 'hold', row: number, col: number) => boolean,
 *   hold: (trayIndex: number) => boolean,
 *   restart: (newSeed?: number) => void,
 *   tick: (elapsedMs?: number) => Object,
 *   subscribe: (listener: (events: Array<Object>) => void) => () => void,
 * }}
 */
export function useGameController(options = {}) {
  const controllerRef = useRef(null);
  if (!controllerRef.current) {
    controllerRef.current = createGameController(options);
  }
  const controller = controllerRef.current;

  const [state, setState] = useState(() => controller.state);
  const [clearing, setClearing] = useState(() => controller.clearing);
  const [isPaused, setIsPaused] = useState(() => controller.isPaused);

  useEffect(() => {
    return controller.subscribeState((newState, newClearing) => {
      setState(newState);
      setClearing(newClearing ?? controller.clearing);
      setIsPaused(controller.isPaused);
    });
  }, [controller]);

  useEffect(() => {
    return controller.subscribePause(setIsPaused);
  }, [controller]);

  useEffect(() => {
    if (typeof AppState?.addEventListener === 'function') {
      const subscription = AppState.addEventListener('change', (nextAppState) => {
        if (nextAppState === 'background' || nextAppState === 'inactive') {
          controller.pause();
        }
      });
      return () => {
        subscription?.remove?.();
      };
    }
  }, [controller]);

  useEffect(() => {
    return () => {
      controller.stopTimer();
    };
  }, [controller]);

  const onClearingComplete = () => {
    controller.clearClearing();
    setClearing(null);
  };

  return {
    state,
    clearing,
    isPaused,
    pause: controller.pause,
    resume: controller.resume,
    setPaused: controller.setPaused,
    onClearingComplete,
    place: controller.place,
    hold: controller.hold,
    restart: controller.restart,
    tick: controller.tick,
    subscribe: controller.subscribe,
    getDurationMs: controller.getDurationMs,
  };
}

export default useGameController;
