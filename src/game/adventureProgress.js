import levelsData from '../../assets/levels/levels.json';

/**
 * Pure helper functions for Adventure mode progress, goals, stars, and unlocking.
 * No React, no Expo, no side-effects, no Date.now(), no Math.random().
 */

/**
 * Builds the user-facing text for a goal chip based on its type and progress.
 * Examples: "Collect 3 gems", "Collect 3 gems (1/3)", "Reach 1500", "Clear 2 lines ✓".
 *
 * @param {Object} goal
 * @param {string} goal.type - 'gems' | 'score' | 'lines'
 * @param {number} [goal.target]
 * @param {number} [goal.value]
 * @param {number} [goal.current=0]
 * @param {boolean} [goal.completed=false]
 * @param {Object} [options]
 * @param {boolean} [options.alwaysShowProgress=false]
 * @returns {string}
 */
export function buildGoalChipText(goal, options = {}) {
  if (!goal || typeof goal !== 'object') {
    return '';
  }

  const type = goal.type;
  const target = goal.target ?? goal.value ?? 0;
  const current = typeof goal.current === 'number' ? goal.current : 0;
  const isCompleted = Boolean(goal.completed || (target > 0 && current >= target));

  let label = '';
  if (type === 'gems') {
    label = target === 1 ? 'Collect 1 gem' : `Collect ${target} gems`;
  } else if (type === 'score') {
    label = `Reach ${target}`;
  } else if (type === 'lines') {
    label = target === 1 ? 'Clear 1 line' : `Clear ${target} lines`;
  } else {
    label = `${type}: ${target}`;
  }

  if (isCompleted) {
    return `${label} ✓`;
  }

  if (current > 0 || options.alwaysShowProgress) {
    return `${label} (${current}/${target})`;
  }

  return label;
}

/**
 * Updates stars map for a level, strictly keeping the maximum stars earned.
 * Pure function: never mutates input stars map.
 *
 * @param {Record<string | number, number> | null | undefined} currentStars
 * @param {number | string} levelId
 * @param {number} starsEarned - 0, 1, 2, or 3
 * @returns {Record<string | number, number>}
 */
export function calculateNextStars(currentStars, levelId, starsEarned) {
  const current = { ...(currentStars || {}) };
  const prev = current[levelId] ?? 0;
  const earned =
    typeof starsEarned === 'number' && Number.isFinite(starsEarned)
      ? Math.max(0, Math.min(3, starsEarned))
      : 0;

  current[levelId] = Math.max(prev, earned);
  return current;
}

/**
 * Calculates the next unlocked level number when a level is completed.
 * Never decreases previously unlocked levels.
 *
 * @param {number | null | undefined} currentUnlocked
 * @param {number} completedLevelId
 * @returns {number}
 */
export function calculateNextUnlocked(currentUnlocked, completedLevelId) {
  const current =
    typeof currentUnlocked === 'number' && Number.isFinite(currentUnlocked)
      ? currentUnlocked
      : 1;
  const completed =
    typeof completedLevelId === 'number' && Number.isFinite(completedLevelId)
      ? completedLevelId
      : 1;

  return Math.max(current, completed + 1);
}

/**
 * Updates best score map for a level, keeping the maximum score.
 * Pure function: never mutates input best map.
 *
 * @param {Record<string | number, number> | null | undefined} currentBest
 * @param {number | string} levelId
 * @param {number} score
 * @returns {Record<string | number, number>}
 */
export function calculateNextBest(currentBest, levelId, score) {
  const current = { ...(currentBest || {}) };
  const prev = current[levelId] ?? 0;
  const nextScore = typeof score === 'number' && Number.isFinite(score) ? score : 0;

  current[levelId] = Math.max(prev, nextScore);
  return current;
}

/**
 * Calculates updated Adventure progress object.
 * Pure function: never mutates input adventure state.
 *
 * @param {Object} [currentAdventure]
 * @param {Object} [update]
 * @param {number} [update.unlocked]
 * @param {number | string} [update.levelId]
 * @param {number} [update.stars]
 * @param {number} [update.score]
 * @returns {{ unlocked: number, stars: Record<string | number, number>, best: Record<string | number, number> }}
 */
export function calculateAdventureProgress(currentAdventure = {}, update = {}) {
  const currentUnlocked = currentAdventure.unlocked ?? 1;
  const currentStars = currentAdventure.stars || {};
  const currentBest = currentAdventure.best || {};

  const levelId = update.levelId;

  let nextUnlocked = currentUnlocked;
  if (typeof update.unlocked === 'number') {
    nextUnlocked = Math.max(currentUnlocked, update.unlocked);
  } else if (typeof levelId === 'number') {
    nextUnlocked = calculateNextUnlocked(currentUnlocked, levelId);
  }

  const nextStars =
    levelId !== undefined && typeof update.stars === 'number'
      ? calculateNextStars(currentStars, levelId, update.stars)
      : { ...currentStars };

  const nextBest =
    levelId !== undefined && typeof update.score === 'number'
      ? calculateNextBest(currentBest, levelId, update.score)
      : { ...currentBest };

  return {
    unlocked: nextUnlocked,
    stars: nextStars,
    best: nextBest,
  };
}

/**
 * Determines whether a given level can be opened.
 * Pure function: no React, no side-effects.
 *
 * A level can be opened if:
 * 1. The levelId is a valid level present in totalLevels (1 <= levelId <= totalLevels)
 * 2. The levelId is <= unlocked
 *
 * @param {number | string} levelId - ID of the level to check
 * @param {number} [unlocked=1] - Currently unlocked level threshold
 * @param {number | Array<any>} [totalLevels=levelsData.length] - Total level count or array of level objects
 * @returns {boolean}
 */
export function canOpenLevel(levelId, unlocked = 1, totalLevels = levelsData.length) {
  const trimmed =
    typeof levelId === 'string'
      ? levelId.trim()
      : typeof levelId === 'number'
      ? String(levelId)
      : '';

  if (!/^\d+$/.test(trimmed)) {
    return false;
  }

  const id = parseInt(trimmed, 10);
  if (!Number.isInteger(id) || id <= 0) {
    return false;
  }

  if (Array.isArray(totalLevels)) {
    const exists = totalLevels.some((lvl) =>
      lvl && typeof lvl === 'object' ? lvl.id === id : lvl === id
    );
    if (!exists) {
      return false;
    }
  } else if (typeof totalLevels === 'number' && Number.isFinite(totalLevels)) {
    if (id > totalLevels) {
      return false;
    }
  } else {
    if (id > levelsData.length) {
      return false;
    }
  }

  const maxUnlocked =
    typeof unlocked === 'number' && Number.isFinite(unlocked)
      ? unlocked
      : typeof unlocked === 'string' && /^\d+$/.test(unlocked.trim())
      ? parseInt(unlocked.trim(), 10)
      : 1;

  return id <= maxUnlocked;
}
