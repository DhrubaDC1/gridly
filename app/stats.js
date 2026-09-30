import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../src/ui/theme';
import { useProgress } from '../src/store/useProgress';

export default function StatsScreen() {
  const theme = useTheme();
  const stats = useProgress((state) => state.stats);

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Player stats</Text>
        <Text style={[styles.statLine, { color: theme.inkMuted }]}>
          Lines cleared:{' '}
          <Text style={{ color: theme.ink, fontFamily: 'Figtree_600SemiBold' }}>
            {stats.totalLinesCleared}
          </Text>
        </Text>
        <Text style={[styles.statLine, { color: theme.inkMuted }]}>
          Pieces placed:{' '}
          <Text style={{ color: theme.ink, fontFamily: 'Figtree_600SemiBold' }}>
            {stats.totalPiecesPlaced}
          </Text>
        </Text>
        <Text style={[styles.statLine, { color: theme.inkMuted }]}>
          Best combo:{' '}
          <Text style={{ color: theme.ink, fontFamily: 'Figtree_600SemiBold' }}>
            {stats.bestCombo > 0 ? `×${stats.bestCombo}` : '—'}
          </Text>
        </Text>
        <Text style={[styles.statLine, { color: theme.inkMuted }]}>
          Current day streak:{' '}
          <Text style={{ color: theme.ink, fontFamily: 'Figtree_600SemiBold' }}>
            {stats.currentStreak}
          </Text>
        </Text>
        <Text style={[styles.status, { color: theme.accent }]}>
          Detailed stats dashboard arriving in Phase 3b.
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
    marginBottom: 16,
  },
  statLine: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    marginBottom: 8,
  },
  status: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
    marginTop: 16,
  },
});
