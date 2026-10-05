import { AppState } from 'react-native';
import { createAudioPlayer } from 'expo-audio';
import { useSettings } from '../store/useSettings';

/** Background loops, one per screen family. */
export const MUSIC_TRACKS = {
  home: require('../../assets/audio/home.mp3'), // Home, Classic and the menu screens
  blitz: require('../../assets/audio/blitz.mp3'),
  adventure: require('../../assets/audio/adventure.mp3'),
};

/**
 * Picks the track for an expo-router pathname.
 *
 * @param {string | null | undefined} pathname
 * @returns {'home' | 'blitz' | 'adventure'}
 */
export function trackForPath(pathname) {
  if (pathname?.startsWith('/blitz')) return 'blitz';
  if (pathname?.startsWith('/adventure')) return 'adventure';
  return 'home';
}

/** @type {Record<string, import('expo-audio').AudioPlayer>} */
let players = {};
let current = 'home';
let sync = () => {};
let stop = null;

/**
 * Switches the playing loop. The previous track pauses where it is, so coming
 * back resumes it rather than restarting. No-op for the track already playing.
 *
 * @param {string} name - key of the tracks map
 */
export function setMusicTrack(name) {
  if (name === current) return;
  current = name;
  sync();
}

/**
 * Starts background music and keeps it in sync with the music settings and the
 * app lifecycle (pauses in background, resumes on return). Idempotent: a second
 * call returns the same cleanup and never restarts playback.
 *
 * @param {Record<string, any>} [tracks=MUSIC_TRACKS] - name -> audio asset
 * @returns {() => void} cleanup
 */
export function startBackgroundMusic(tracks = MUSIC_TRACKS) {
  if (stop) return stop;

  let appActive = AppState.currentState !== 'background';

  sync = () => {
    // Wait for persisted settings so a disabled preference never plays a note.
    if (useSettings.persist?.hasHydrated && !useSettings.persist.hasHydrated()) return;
    const { music, musicVolume } = useSettings.getState();
    const shouldPlay = music && appActive && Boolean(tracks[current]);
    try {
      for (const [name, player] of Object.entries(players)) {
        player.volume = musicVolume;
        if (!shouldPlay || name !== current) player.pause();
      }
      if (!shouldPlay) return;
      if (!players[current]) {
        players[current] = createAudioPlayer(tracks[current]);
        players[current].loop = true;
        players[current].volume = musicVolume;
      }
      players[current].play();
    } catch {
      // Audio is non-essential; fail silently
    }
  };

  const unsubscribeSettings = useSettings.subscribe(() => sync());
  const appStateSub = AppState.addEventListener('change', (next) => {
    appActive = next === 'active';
    sync();
  });
  sync();

  stop = () => {
    unsubscribeSettings();
    appStateSub.remove();
    for (const player of Object.values(players)) {
      try {
        player.pause();
        player.remove?.();
      } catch {
        // Ignore
      }
    }
    players = {};
    sync = () => {};
    stop = null;
  };
  return stop;
}
