import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * @typedef {'system' | 'light' | 'dark'} ThemeMode
 * @typedef {'system' | 'on' | 'off'} ReduceMotionMode
 *
 * @typedef {Object} SettingsState
 * @property {boolean} sound
 * @property {boolean} haptics
 * @property {boolean} music - background music loop
 * @property {number} musicVolume - 0..1
 * @property {ThemeMode} theme
 * @property {boolean} colorblind
 * @property {ReduceMotionMode} reduceMotion
 * @property {boolean} seenOnboarding
 * @property {(sound: boolean) => void} setSound
 * @property {(haptics: boolean) => void} setHaptics
 * @property {(music: boolean) => void} setMusic
 * @property {(musicVolume: number) => void} setMusicVolume
 * @property {(theme: ThemeMode) => void} setTheme
 * @property {(colorblind: boolean) => void} setColorblind
 * @property {(reduceMotion: ReduceMotionMode) => void} setReduceMotion
 * @property {(seenOnboarding: boolean) => void} setSeenOnboarding
 * @property {(partial: Partial<SettingsState>) => void} updateSettings
 * @property {() => void} resetSettings
 */

export const DEFAULT_SETTINGS = {
  sound: true,
  haptics: true,
  music: true,
  musicVolume: 0.6,
  theme: 'system',
  colorblind: false,
  reduceMotion: 'system',
  seenOnboarding: false,
};

export const useSettings = create(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,
      setSound: (sound) => set({ sound }),
      setHaptics: (haptics) => set({ haptics }),
      setMusic: (music) => set({ music }),
      setMusicVolume: (musicVolume) =>
        set({ musicVolume: Math.min(1, Math.max(0, musicVolume)) }),
      setTheme: (theme) => set({ theme }),
      setColorblind: (colorblind) => set({ colorblind }),
      setReduceMotion: (reduceMotion) => set({ reduceMotion }),
      setSeenOnboarding: (seenOnboarding) => set({ seenOnboarding }),
      updateSettings: (partial) => set(partial),
      resetSettings: () => set(DEFAULT_SETTINGS),
    }),
    {
      name: 'gridly-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
