import { StyleSheet, Text, View, Pressable, Switch } from 'react-native';
import { useTheme } from '../src/ui/theme';
import { useSettings } from '../src/store/useSettings';

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

  const cycleTheme = () => {
    const next =
      themeSetting === 'system'
        ? 'light'
        : themeSetting === 'light'
        ? 'dark'
        : 'system';
    setTheme(next);
  };

  const cycleReduceMotion = () => {
    const next =
      reduceMotion === 'system'
        ? 'on'
        : reduceMotion === 'on'
        ? 'off'
        : 'system';
    setReduceMotion(next);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Settings</Text>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.ink }]}>Sound effects</Text>
          <Switch
            accessibilityLabel="Toggle sound effects"
            value={sound}
            onValueChange={setSound}
            trackColor={{ false: theme.cellEmpty, true: theme.accent }}
          />
        </View>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.ink }]}>Haptics</Text>
          <Switch
            accessibilityLabel="Toggle haptic feedback"
            value={haptics}
            onValueChange={setHaptics}
            trackColor={{ false: theme.cellEmpty, true: theme.accent }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Theme mode: ${themeSetting}`}
          style={styles.rowPressable}
          onPress={cycleTheme}
        >
          <Text style={[styles.label, { color: theme.ink }]}>Theme</Text>
          <Text style={[styles.value, { color: theme.accent }]}>
            {themeSetting}
          </Text>
        </Pressable>

        <View style={styles.row}>
          <Text style={[styles.label, { color: theme.ink }]}>
            Colorblind mode
          </Text>
          <Switch
            accessibilityLabel="Toggle colorblind glyphs"
            value={colorblind}
            onValueChange={setColorblind}
            trackColor={{ false: theme.cellEmpty, true: theme.accent }}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Reduce motion: ${reduceMotion}`}
          style={styles.rowPressable}
          onPress={cycleReduceMotion}
        >
          <Text style={[styles.label, { color: theme.ink }]}>
            Reduce motion
          </Text>
          <Text style={[styles.value, { color: theme.accent }]}>
            {reduceMotion}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 420,
  },
  title: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 24,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  rowPressable: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    minHeight: 48,
  },
  label: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
  },
  value: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    textTransform: 'capitalize',
  },
});
