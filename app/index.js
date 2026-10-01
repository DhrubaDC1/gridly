import { StyleSheet, Text, View, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/ui/theme';

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: Math.max(insets.top, 24) + 24,
          paddingBottom: Math.max(insets.bottom, 24) + 16,
        },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.ink }]}>Gridly</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>
          Calm, tactile block puzzle
        </Text>
      </View>

      <View style={styles.section}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play Classic mode"
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.accent,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={() => router.push('/classic')}
        >
          <Text style={[styles.primaryButtonText, { color: theme.onAccent }]}>
            Play Classic
          </Text>
          <Text
            style={[
              styles.primaryButtonSub,
              { color: theme.onAccent, opacity: 0.8 },
            ]}
          >
            Endless relaxing puzzle
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play Blitz mode"
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push('/blitz')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.ink }]}>
            Play Blitz
          </Text>
          <Text style={[styles.secondaryButtonSub, { color: theme.inkMuted }]}>
            90 seconds fast clears
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play Adventure mode"
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push('/adventure')}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.ink }]}>
            Adventure
          </Text>
          <Text style={[styles.secondaryButtonSub, { color: theme.inkMuted }]}>
            50 handcrafted levels
          </Text>
        </Pressable>
      </View>

      <View style={styles.navGrid}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Leaderboards"
          style={({ pressed }) => [
            styles.gridItem,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push('/leaderboards')}
        >
          <Text style={[styles.gridItemText, { color: theme.ink }]}>
            Leaderboards
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Achievements"
          style={({ pressed }) => [
            styles.gridItem,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push('/achievements')}
        >
          <Text style={[styles.gridItemText, { color: theme.ink }]}>
            Achievements
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Stats"
          style={({ pressed }) => [
            styles.gridItem,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push('/stats')}
        >
          <Text style={[styles.gridItemText, { color: theme.ink }]}>Stats</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Open Settings"
          style={({ pressed }) => [
            styles.gridItem,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push('/settings')}
        >
          <Text style={[styles.gridItemText, { color: theme.ink }]}>
            Settings
          </Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="View Profile"
          style={({ pressed }) => [
            styles.gridItemFull,
            {
              backgroundColor: theme.surface,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={() => router.push('/profile')}
        >
          <Text style={[styles.gridItemText, { color: theme.ink }]}>
            Profile
          </Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 36,
  },
  title: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 40,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    marginTop: 8,
  },
  section: {
    gap: 12,
    marginBottom: 24,
  },
  primaryButton: {
    paddingVertical: 18,
    paddingHorizontal: 20,
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 18,
  },
  primaryButtonSub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 14,
    minHeight: 56,
    justifyContent: 'center',
  },
  secondaryButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  secondaryButtonSub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 13,
    marginTop: 2,
  },
  navGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridItem: {
    flex: 1,
    minWidth: '45%',
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemFull: {
    width: '100%',
    minHeight: 48,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  gridItemText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 15,
  },
});
