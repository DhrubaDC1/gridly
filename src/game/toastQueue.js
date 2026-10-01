/**
 * Pure helper functions and class for managing a FIFO toast queue.
 * No React, no Expo, no side-effects.
 *
 * @typedef {Object} ToastItem
 * @property {string} [id] - Unique toast identifier
 * @property {string} title - Main header (e.g. "Achievement unlocked")
 * @property {string} message - Detail (e.g. achievement name)
 * @property {number} [duration] - Display duration in ms (default 2500)
 *
 * @typedef {Object} ToastQueueState
 * @property {ToastItem | null} current - Currently active toast
 * @property {ToastItem[]} queue - Pending toasts waiting to be shown
 */

/**
 * Creates an empty toast queue state.
 *
 * @returns {ToastQueueState}
 */
export function createToastQueueState() {
  return {
    current: null,
    queue: [],
  };
}

/**
 * Adds an item to the toast queue.
 * If no toast is currently active, the item becomes active immediately.
 * Otherwise, the item is appended to the pending queue.
 * Pure function: returns a new state object.
 *
 * @param {ToastQueueState | null | undefined} state
 * @param {ToastItem | null | undefined} item
 * @returns {ToastQueueState}
 */
export function enqueueToast(state, item) {
  if (!item) {
    return state || createToastQueueState();
  }

  const s = state || createToastQueueState();

  if (!s.current) {
    return {
      current: item,
      queue: Array.isArray(s.queue) ? [...s.queue] : [],
    };
  }

  return {
    current: s.current,
    queue: [...(s.queue || []), item],
  };
}

/**
 * Dismisses the currently active toast and advances the queue.
 * If queue is empty, current becomes null.
 * Pure function: returns a new state object.
 *
 * @param {ToastQueueState | null | undefined} state
 * @returns {ToastQueueState}
 */
export function advanceToast(state) {
  const s = state || createToastQueueState();
  const queue = Array.isArray(s.queue) ? s.queue : [];

  if (queue.length === 0) {
    return {
      current: null,
      queue: [],
    };
  }

  const [next, ...remaining] = queue;
  return {
    current: next,
    queue: remaining,
  };
}

/**
 * Simple stateful class wrapper around the pure toast queue operations.
 */
export class ToastQueue {
  /**
   * @param {ToastQueueState} [initialState]
   */
  constructor(initialState) {
    this.state = initialState ? { ...initialState } : createToastQueueState();
  }

  /**
   * Adds an item to the queue.
   *
   * @param {ToastItem} item
   * @returns {ToastQueueState}
   */
  enqueue(item) {
    this.state = enqueueToast(this.state, item);
    return this.state;
  }

  /**
   * Dismisses the active toast and advances the queue.
   *
   * @returns {ToastQueueState}
   */
  advance() {
    this.state = advanceToast(this.state);
    return this.state;
  }

  /**
   * Gets current active toast.
   *
   * @returns {ToastItem | null}
   */
  getCurrent() {
    return this.state.current;
  }

  /**
   * Gets pending queue of toasts.
   *
   * @returns {ToastItem[]}
   */
  getQueue() {
    return this.state.queue;
  }

  /**
   * Resets queue to empty.
   *
   * @returns {ToastQueueState}
   */
  clear() {
    this.state = createToastQueueState();
    return this.state;
  }
}

export default ToastQueue;
