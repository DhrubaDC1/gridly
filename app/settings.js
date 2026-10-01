import React from 'react';
import { StyleSheet, Text, View, Switch, ScrollView } from 'react-native';
import { useTheme } from '../src/ui/theme';
import { useSettings } from '../src/store/useSettings';
import Segmented from '../src/ui/components/Segmented';

const THEME_OPTIONS = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
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
    theme: themeSetting,
    colorblind,
    reduceMotion,
    setSound,
    setHaptics,
    setTheme,
    setColorblind,
    setReduceMotion,
  } = useSettings();

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
});
