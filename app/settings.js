import React, { useState } from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Canvas, Rect, LinearGradient, vec } from '@shopify/react-native-skia';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/ui/theme';
import { useSettings } from '../src/store/useSettings';
import { useProgress } from '../src/store/useProgress';
import Segmented from '../src/ui/components/Segmented';
import ScreenHeader from '../src/ui/components/ScreenHeader';
import Icon from '../src/ui/components/Icon';
import PressableScale from '../src/ui/components/PressableScale';
import Toggle from '../src/ui/components/Toggle';
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

function ToggleRow({ icon, glaze, label, hint, value, onValueChange, theme }) {
  const color = theme.glaze[glaze].base;
  return (
    <View style={styles.row}>
      <View style={[styles.iconChip, { backgroundColor: `${color}22` }]}>
        <Icon name={icon} size={30} color={color} solid />
      </View>
      <View style={styles.rowText}>
        <Text style={[styles.rowLabel, { color: theme.ink }]}>{label}</Text>
        <Text style={[styles.rowHint, { color: theme.inkMuted }]}>{hint}</Text>
      </View>
      <Toggle accessibilityLabel={label} value={value} onValueChange={onValueChange} />
    </View>
  );
}

function SegmentedGroup({ label, hint, options, value, onChange, theme }) {
  return (
    <View style={styles.group}>
      <View>
        <Text style={[styles.groupLabel, { color: theme.ink }]}>{label}</Text>
        {hint ? <Text style={[styles.rowHint, { color: theme.inkMuted }]}>{hint}</Text> : null}
      </View>
      <Segmented
        accessibilityLabel={label}
        options={options}
        value={value}
        onChange={onChange}
        theme={theme}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
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
  const [buttonSize, setButtonSize] = useState({ width: 0, height: 0 });

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 32 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader title="Settings" subtitle="Customize your experience" art="settings" />

      <View style={styles.rows}>
        <ToggleRow icon="volume" glaze={0} label="Sound" hint="Sound effects" value={sound} onValueChange={setSound} theme={theme} />
        <ToggleRow icon="music" glaze={5} label="Music" hint="Background music" value={music} onValueChange={setMusic} theme={theme} />
        <ToggleRow icon="vibrate" glaze={4} label="Haptics" hint="Feel the blocks" value={haptics} onValueChange={setHaptics} theme={theme} />
        <ToggleRow
          icon="eye"
          glaze={2}
          label="Colorblind mode"
          hint="Adds a shape to each color"
          value={colorblind}
          onValueChange={setColorblind}
          theme={theme}
        />
      </View>

      {music ? (
        <SegmentedGroup
          label="Music volume"
          options={MUSIC_VOLUME_OPTIONS}
          value={musicVolume}
          onChange={setMusicVolume}
          theme={theme}
        />
      ) : null}

      <SegmentedGroup
        label="Theme"
        options={THEME_OPTIONS}
        value={themeSetting}
        onChange={setTheme}
        theme={theme}
      />

      <SegmentedGroup
        label="Reduce motion"
        hint="Minimize animations"
        options={REDUCE_MOTION_OPTIONS}
        value={reduceMotion}
        onChange={setReduceMotion}
        theme={theme}
      />

      {typeof __DEV__ !== 'undefined' && __DEV__ ? (
        <PressableScale
          accessibilityLabel="Unlock all levels"
          onPress={() => unlockAllLevels(levelsData.length)}
          containerStyle={styles.devButtonContainer}
          style={[styles.devButton, { backgroundColor: theme.accent, shadowColor: theme.accent }]}
        >
          <View
            style={StyleSheet.absoluteFill}
            onLayout={(e) => setButtonSize(e.nativeEvent.layout)}
          >
            <Canvas style={StyleSheet.absoluteFill}>
              <Rect x={0} y={0} width={buttonSize.width} height={buttonSize.height}>
                <LinearGradient
                  start={vec(0, 0)}
                  end={vec(0, buttonSize.height)}
                  colors={['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']}
                />
              </Rect>
            </Canvas>
          </View>
          <Icon name="lock" size={20} color={theme.onAccent} solid />
          <Text style={[styles.devButtonLabel, { color: theme.onAccent }]}>
            Unlock all levels
          </Text>
        </PressableScale>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    width: '100%',
    maxWidth: 452,
    alignSelf: 'center',
    gap: 24,
  },
  rows: {
    gap: 32,
    marginTop: 8,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    minHeight: 56,
  },
  rowText: {
    flex: 1,
    gap: 2,
  },
  iconChip: {
    width: 60,
    height: 60,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 18,
  },
  rowHint: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
  },
  group: {
    gap: 12,
  },
  groupLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 18,
  },
  devButtonContainer: {
    marginTop: 16,
  },
  devButton: {
    minHeight: 58,
    borderRadius: 18,
    overflow: 'hidden',
    elevation: 8,
    shadowOpacity: 0.35,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    flexDirection: 'row',
    gap: 10,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  devButtonLabel: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 18,
  },
});
