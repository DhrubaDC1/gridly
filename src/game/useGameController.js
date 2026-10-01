import { useState, useRef, useEffect } from 'react';
import {
  createGame,
  placePiece,
  holdPiece,
  serializeGame,
  restoreGame,
} from '../engine/game';
import { useProgress } from '../store/useProgress';
import { playFeedbackForEvents } from './eventsFeedback';
import { buildClearingDescription } from './clearWave';

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
 * and persistence. Can be used in non-React test environments as well as inside hooks.
 *
 * @param {Object} [options]
 * @param {number} [options.seed] - Seed to use for new game.
 * @param {string} [options.mode='classic'] - Game mode ('classic', 'blitz', etc.).
 * @param {import('../engine/game').GameState} [options.initialState] - Pre-loaded state.
 * @param {boolean} [options.persist=true] - Whether to persist in-progress game to useProgress.
 * @returns {Object} Game controller instance.
 */
export function createGameController(options = {}) {
  const {
    seed: initialSeed,
    mode = 'classic',
    initialState = null,
    persist = true,
  } = options;

  let state = null;
  let clearing = null;

  if (initialState) {
    state = initialState;
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
    const seed = typeof initialSeed === 'number' ? initialSeed : generateSeed();
    state = createGame({ seed, mode });
  }

  const stateSubscribers = new Set();
  const eventSubscribers = new Set();

  function notifyState() {
    const listeners = Array.from(stateSubscribers);
    for (let i = 0; i < listeners.length; i++) {
      listeners[i](state, clearing);
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

    const currentBest =
      useProgress.getState().stats?.bestScore?.[mode] ?? 0;
    if (state.score > currentBest) {
      useProgress.getState().updateStats({
        bestScore: {
          ...useProgress.getState().stats.bestScore,
          [mode]: state.score,
        },
      });
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
    if (state.over) {
      return false;
    }

    const prevState = state;
    const result = placePiece(state, source, row, col);
    if (result.state === state || result.events.length === 0) {
      return false;
    }

    state = result.state;
    clearing = buildClearingDescription(prevState, result.events);
    notifyState();
    notifyEvents(result.events);
    playFeedbackForEvents(result.events);
    syncPersistence();
    return true;
  }

  /**
   * Holds a piece from the tray into the hold slot (swapping if occupied).
   *
   * @param {number} trayIndex - Tray index (0-2)
   * @returns {boolean} True if hold was valid, false otherwise.
   */
  function hold(trayIndex) {
    if (state.over || state.holdUsed) {
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
    const seed = typeof newSeed === 'number' ? newSeed : generateSeed();
    state = createGame({ seed, mode });
    clearing = null;
    notifyState();

    if (persist) {
      useProgress.getState().clearInProgress(mode);
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
    place,
    hold,
    restart,
    subscribe,
    subscribeState,
  };
}

/**
 * React hook bridging the pure engine, UI gestures, feedback, and persistence.
 *
 * @param {Object} [options]
 * @returns {{
 *   state: import('../engine/game').GameState,
 *   clearing: Object | null,
 *   onClearingComplete: () => void,
 *   place: (source: number | 'hold', row: number, col: number) => boolean,
 *   hold: (trayIndex: number) => boolean,
 *   restart: (newSeed?: number) => void,
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

  useEffect(() => {
    return controller.subscribeState((newState, newClearing) => {
      setState(newState);
      setClearing(newClearing ?? controller.clearing);
    });
  }, [controller]);

  const onClearingComplete = () => {
    controller.clearClearing();
    setClearing(null);
  };

  return {
    state,
    clearing,
    onClearingComplete,
    place: controller.place,
    hold: controller.hold,
    restart: controller.restart,
    subscribe: controller.subscribe,
  };
}

export default useGameController;
