import { create } from 'zustand';
import {
  createToastQueueState,
  enqueueToast,
  advanceToast,
} from '../game/toastQueue';
import { ACHIEVEMENTS } from '../engine/achievements';

let toastIdCounter = 0;

/**
 * Zustand store for application-wide queued toasts (e.g. achievement unlocks).
 */
export const useToast = create((set, get) => ({
  ...createToastQueueState(),

  /**
   * Enqueues a toast.
   *
   * @param {string | { id?: string, title?: string, message?: string, duration?: number }} toast
   */
  showToast: (toast) => {
    toastIdCounter += 1;
    const fallbackId = `toast_${Date.now()}_${toastIdCounter}`;

    const item =
      typeof toast === 'string'
        ? {
            id: fallbackId,
            title: 'Achievement unlocked',
            message: toast,
            duration: 2500,
          }
        : {
            id: toast?.id || fallbackId,
            title: toast?.title || 'Achievement unlocked',
            message: toast?.message || '',
            duration: toast?.duration ?? 2500,
          };

    set((state) => enqueueToast(state, item));
  },

  /**
   * Enqueues an achievement toast with "Achievement unlocked" title and friendly name.
   *
   * @param {string} achievementIdOrName
   */
  showAchievementToast: (achievementIdOrName) => {
    const match = ACHIEVEMENTS.find(
      (a) => a.id === achievementIdOrName || a.name === achievementIdOrName
    );
    const name = match ? match.name : achievementIdOrName;
    get().showToast({
      title: 'Achievement unlocked',
      message: name,
      duration: 2500,
    });
  },

  /**
   * Dismisses the active toast and advances to the next toast in queue.
   */
  dismissCurrent: () => {
    set((state) => advanceToast(state));
  },

  /**
   * Clears all active and pending toasts.
   */
  clearAll: () => {
    set(createToastQueueState());
  },
}));

export default useToast;
