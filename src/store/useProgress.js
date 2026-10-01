import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createStats } from '../engine/stats';

/**
 * @typedef {Object} ModeStats
 * @property {number} classic
 * @property {number} blitz
 * @property {number} adventure
 *
 * @typedef {Object} Stats
 * @property {ModeStats} gamesPlayed
 * @property {ModeStats} bestScore
 * @property {number} totalLinesCleared
 * @property {number} bestCombo
 * @property {number} perfectClears
 * @property {number} monoLines
 * @property {number} totalPiecesPlaced
 * @property {number} holdsUsed
 * @property {number} totalPlayTime
 * @property {number} currentStreak
 * @property {number} bestStreak
 * @property {string | null} lastPlayedDay - 'YYYY-MM-DD' (local time)
 *
 * @typedef {Object} AdventureProgress
 * @property {number} unlocked
 * @property {Record<number | string, number>} stars - 0-3 stars per level
 * @property {Record<number | string, number>} best - score per level
 *
 * @typedef {Object} InProgressGames
 * @property {Object | null} classic - serialized game state
 *
 * @typedef {Object} ProgressState
 * @property {number} version
 * @property {Stats} stats
 * @property {Record<string, string>} achievements - [id]: ISO timestamp
 * @property {AdventureProgress} adventure
 * @property {InProgressGames} inProgress
 * @property {string} updatedAt - ISO timestamp
 */

export const INITIAL_STATS = createStats();

export const INITIAL_PROGRESS = {
  version: 1,
  stats: INITIAL_STATS,
  achievements: {},
  adventure: {
    unlocked: 1,
    stars: {},
    best: {},
  },
  inProgress: {
    classic: null,
  },
  updatedAt: new Date().toISOString(),
};

export const useProgress = create(
  persist(
    (set) => ({
      ...INITIAL_PROGRESS,

      setStats: (newStats) =>
        set((state) => ({
          stats: typeof newStats === 'function' ? newStats(state.stats) : newStats,
          updatedAt: new Date().toISOString(),
        })),

      updateStats: (partial) =>
        set((state) => ({
          stats: { ...state.stats, ...partial },
          updatedAt: new Date().toISOString(),
        })),

      unlockAchievement: (id, unlockedAt = new Date().toISOString()) =>
        set((state) => {
          if (state.achievements[id]) return state;
          return {
            achievements: { ...state.achievements, [id]: unlockedAt },
            updatedAt: new Date().toISOString(),
          };
        }),

      setAchievements: (achievements) =>
        set({
          achievements,
          updatedAt: new Date().toISOString(),
        }),

      setAdventureProgress: ({ unlocked, levelId, stars, score }) =>
        set((state) => {
          const nextAdventure = { ...state.adventure };
          if (typeof unlocked === 'number') {
            nextAdventure.unlocked = Math.max(state.adventure.unlocked, unlocked);
          }
          if (levelId !== undefined) {
            if (typeof stars === 'number') {
              nextAdventure.stars = {
                ...nextAdventure.stars,
                [levelId]: Math.max(nextAdventure.stars[levelId] || 0, stars),
              };
            }
            if (typeof score === 'number') {
              nextAdventure.best = {
                ...nextAdventure.best,
                [levelId]: Math.max(nextAdventure.best[levelId] || 0, score),
              };
            }
          }
          return {
            adventure: nextAdventure,
            updatedAt: new Date().toISOString(),
          };
        }),

      setInProgress: (mode, gameState) =>
        set((state) => ({
          inProgress: { ...state.inProgress, [mode]: gameState },
          updatedAt: new Date().toISOString(),
        })),

      clearInProgress: (mode) =>
        set((state) => ({
          inProgress: { ...state.inProgress, [mode]: null },
          updatedAt: new Date().toISOString(),
        })),

      setProgress: (progress) =>
        set({
          ...progress,
          updatedAt: new Date().toISOString(),
        }),

      resetProgress: () =>
        set({
          ...INITIAL_PROGRESS,
          stats: createStats(),
          updatedAt: new Date().toISOString(),
        }),
    }),
    {
      name: 'gridly-progress',
      storage: createJSONStorage(() => AsyncStorage),
      version: 1,
    }
  )
);
