import * as Haptics from 'expo-haptics';
import { createAudioPlayer, setAudioModeAsync } from 'expo-audio';
import { useSettings } from '../store/useSettings';
import { getClearHapticPattern } from '../game/clearWave';

const SOUND_FILES = {
  pickup: require('../../assets/sounds/pickup.wav'),
  place: require('../../assets/sounds/place.wav'),
  'clear-1': require('../../assets/sounds/clear-1.wav'),
  'clear-2': require('../../assets/sounds/clear-2.wav'),
  'clear-3': require('../../assets/sounds/clear-3.wav'),
  'clear-4': require('../../assets/sounds/clear-4.wav'),
  'clear-5': require('../../assets/sounds/clear-5.wav'),
  'clear-6': require('../../assets/sounds/clear-6.wav'),
  perfect: require('../../assets/sounds/perfect.wav'),
  achievement: require('../../assets/sounds/achievement.wav'),
  gameover: require('../../assets/sounds/gameover.wav'),
};

/** @type {Record<string, import('expo-audio').AudioPlayer | null>} */
const players = {};

// Configure audio to respect iOS silent switch and preload all sound players
try {
  setAudioModeAsync({ playsInSilentMode: false }).catch(() => {});
} catch {
  // Fail silently
}

for (const key of Object.keys(SOUND_FILES)) {
  try {
    players[key] = createAudioPlayer(SOUND_FILES[key]);
  } catch {
    players[key] = null;
  }
}

function getPlayer(key) {
  if (!players[key]) {
    try {
      players[key] = createAudioPlayer(SOUND_FILES[key]);
    } catch {
      return null;
    }
  }
  return players[key];
}

function playSound(key) {
  try {
    const { sound } = useSettings.getState();
    if (!sound) return;

    const player = getPlayer(key);
    if (!player) return;

    try {
      const seekRes = player.seekTo(0);
      if (seekRes && typeof seekRes.catch === 'function') {
        seekRes.catch(() => {});
      }
    } catch {
      // Ignore seek error
    }

    player.play();
  } catch {
    // Fail silently
  }
}

function playHaptic(hapticFn) {
  try {
    const { haptics } = useSettings.getState();
    if (!haptics) return;

    const res = hapticFn();
    if (res && typeof res.catch === 'function') {
      res.catch(() => {});
    }
  } catch {
    // Fail silently
  }
}

export function onPickup() {
  try {
    playHaptic(() => Haptics.selectionAsync());
    playSound('pickup');
  } catch {
    // Fail silently
  }
}

export function onPlace() {
  try {
    const style = Haptics.ImpactFeedbackStyle?.Light ?? 'light';
    playHaptic(() => Haptics.impactAsync(style));
    playSound('place');
  } catch {
    // Fail silently
  }
}

const IMPACT_STYLES = {
  light: Haptics.ImpactFeedbackStyle?.Light ?? 'light',
  medium: Haptics.ImpactFeedbackStyle?.Medium ?? 'medium',
  heavy: Haptics.ImpactFeedbackStyle?.Heavy ?? 'heavy',
  rigid: Haptics.ImpactFeedbackStyle?.Rigid ?? 'rigid',
};

function impact(style) {
  playHaptic(() => Haptics.impactAsync(IMPACT_STYLES[style]));
}

export function onClear(linesCount = 1, combo = 1) {
  try {
    const lines = typeof linesCount === 'number' ? linesCount : 1;
    const comboCount = typeof combo === 'number' ? combo : 1;

    // Rumble that rolls out with the clear wave; bigger clears and combos hit harder.
    for (const { at, style } of getClearHapticPattern(lines, comboCount)) {
      if (at === 0) impact(style);
      else setTimeout(() => impact(style), at);
    }

    const soundIndex = Math.min(Math.max(comboCount, 1), 6);
    playSound(`clear-${soundIndex}`);
  } catch {
    // Fail silently
  }
}

/** Gem lands in its goal chip. */
export function onGemCollected() {
  try {
    impact('rigid');
  } catch {
    // Fail silently
  }
}

/** An Adventure goal (gems, score, lines) was just met. */
export function onGoalCompleted() {
  try {
    const type = Haptics.NotificationFeedbackType?.Success ?? 'success';
    playHaptic(() => Haptics.notificationAsync(type));
    playSound('achievement');
  } catch {
    // Fail silently
  }
}

export function onPerfectClear() {
  try {
    const type = Haptics.NotificationFeedbackType?.Success ?? 'success';
    playHaptic(() => Haptics.notificationAsync(type));
    playSound('perfect');
  } catch {
    // Fail silently
  }
}

export function onAchievement() {
  try {
    const type = Haptics.NotificationFeedbackType?.Success ?? 'success';
    playHaptic(() => Haptics.notificationAsync(type));
    playSound('achievement');
  } catch {
    // Fail silently
  }
}

export function onGameOver() {
  try {
    const type = Haptics.NotificationFeedbackType?.Warning ?? 'warning';
    playHaptic(() => Haptics.notificationAsync(type));
    playSound('gameover');
  } catch {
    // Fail silently
  }
}
