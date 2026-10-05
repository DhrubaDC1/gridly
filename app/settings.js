import React from 'react';
import { StyleSheet, Text, View, Switch, ScrollView, Pressable } from 'react-native';
import { useTheme } from '../src/ui/theme';
import { useSettings } from '../src/store/useSettings';
import { useProgress } from '../src/store/useProgress';
import Segmented from '../src/ui/components/Segmented';
import levelsData from '../assets/levels/levels.json';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

const MUSIC_VOLUME_OPTIONS = [
  { value: 0.3, label: 'Low' },
  { value: 0.6, label: 'Medium' },
  { value: 1, label: 'High' },
];

const REDUCE_MOTION_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'on', label: 'On' },
  { value: 'off', label: 'Off' },
];

export default function SettingsScreen() {
  const theme = useTheme();
  const {
    sound,
    haptics,
    music,
    musicVolume,
    theme: themeSetting,
    colorblind,
    reduceMotion,
    setSound,
    setHaptics,
    setMusic,
    setMusicVolume,
    setTheme,
    setColorblind,
    setReduceMotion,
  } = useSettings();
  const unlockAllLevels = useProgress((state) => state.unlockAllLevels);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Settings</Text>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.ink }]}>Sound</Text>
          <View style={styles.switchTarget}>
            <Switch
              accessibilityLabel="Sound"
              value={sound}
              onValueChange={setSound}
              trackColor={{ false: theme.cellEmpty, true: theme.accent }}
              thumbColor={theme.isDark && !sound ? theme.inkMuted : '#FFFFFF'}
              ios_backgroundColor={theme.cellEmpty}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.ink }]}>Music</Text>
          <View style={styles.switchTarget}>
            <Switch
              accessibilityLabel="Music"
              value={music}
              onValueChange={setMusic}
              trackColor={{ false: theme.cellEmpty, true: theme.accent }}
              thumbColor={theme.isDark && !music ? theme.inkMuted : '#FFFFFF'}
              ios_backgroundColor={theme.cellEmpty}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </View>
        </View>

        {music ? (
          <View style={styles.segmentedRow}>
            <Text style={[styles.label, { color: theme.ink }]}>
              Music volume
            </Text>
            <Segmented
              accessibilityLabel="Music volume"
              options={MUSIC_VOLUME_OPTIONS}
              value={musicVolume}
              onChange={setMusicVolume}
              theme={theme}
            />
          </View>
        ) : null}

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.ink }]}>Haptics</Text>
          <View style={styles.switchTarget}>
            <Switch
              accessibilityLabel="Haptics"
              value={haptics}
              onValueChange={setHaptics}
              trackColor={{ false: theme.cellEmpty, true: theme.accent }}
              thumbColor={theme.isDark && !haptics ? theme.inkMuted : '#FFFFFF'}
              ios_backgroundColor={theme.cellEmpty}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </View>
        </View>

        <View style={styles.switchRow}>
          <Text style={[styles.label, { color: theme.ink }]}>
            Colorblind mode
          </Text>
          <View style={styles.switchTarget}>
            <Switch
              accessibilityLabel="Colorblind mode"
              value={colorblind}
              onValueChange={setColorblind}
              trackColor={{ false: theme.cellEmpty, true: theme.accent }}
              thumbColor={theme.isDark && !colorblind ? theme.inkMuted : '#FFFFFF'}
              ios_backgroundColor={theme.cellEmpty}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            />
          </View>
        </View>

        <View style={styles.segmentedRow}>
          <Text style={[styles.label, { color: theme.ink }]}>Theme</Text>
          <Segmented
            accessibilityLabel="Theme"
            options={THEME_OPTIONS}
            value={themeSetting}
            onChange={setTheme}
            theme={theme}
          />
        </View>

        <View style={styles.segmentedRow}>
          <Text style={[styles.label, { color: theme.ink }]}>
            Reduce motion
          </Text>
          <Segmented
            accessibilityLabel="Reduce motion"
            options={REDUCE_MOTION_OPTIONS}
            value={reduceMotion}
            onChange={setReduceMotion}
            theme={theme}
          />
        </View>

        {typeof __DEV__ !== 'undefined' && __DEV__ ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Unlock all levels"
            onPress={() => unlockAllLevels(levelsData.length)}
            style={({ pressed }) => [
              styles.devRow,
              {
                backgroundColor: theme.well,
                opacity: pressed ? 0.7 : 1,
              },
            ]}
          >
            <Text style={[styles.label, { color: theme.ink }]}>
              Unlock all levels
            </Text>
          </Pressable>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flexGrow: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
    gap: 16,
  },
  title: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 24,
    marginBottom: 4,
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 48,
  },
  segmentedRow: {
    gap: 8,
    width: '100%',
  },
  label: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
  },
  switchTarget: {
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  devRow: {
    minHeight: 48,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
