import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../src/ui/theme';
import { useProgress } from '../src/store/useProgress';

export default function AchievementsScreen() {
  const theme = useTheme();
  const achievements = useProgress((state) => state.achievements);
  const unlockedCount = Object.keys(achievements).length;

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Achievements</Text>
        <Text style={[styles.body, { color: theme.inkMuted }]}>
          {unlockedCount} of 25 unlocked. Complete challenges across Classic,
          Blitz, and Adventure to earn badges.
        </Text>
        <Text style={[styles.status, { color: theme.accent }]}>
          Full badge grid arriving in Phase 3b.
        </Text>
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
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 24,
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 16,
  },
  status: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
});
