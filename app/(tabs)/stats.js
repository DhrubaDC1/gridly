import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/theme';
import { useProgress } from '../../src/store/useProgress';
import {
  formatPlayTime,
  formatNumber,
  formatAverageClassicScore,
  formatCombo,
  getTotalGamesPlayed,
} from '../../src/game/format';

function useSafeInsets() {
  try {
    return useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  } catch {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

export default function StatsScreen() {
  const theme = useTheme();
  const insets = useSafeInsets();
  const stats = useProgress((state) => state.stats);

  const totalGames = getTotalGamesPlayed(stats);
  const hasNoGames = totalGames === 0;

  const statItems = [
    {
      id: 'classic-best',
      label: 'Classic best',
      value: formatNumber(stats?.bestScore?.classic ?? 0),
    },
    {
      id: 'blitz-best',
      label: 'Blitz best',
      value: formatNumber(stats?.bestScore?.blitz ?? 0),
    },
    {
      id: 'avg-classic',
      label: 'Average Classic score',
      value: formatAverageClassicScore(stats),
    },
    {
      id: 'games-played',
      label: 'Games played',
      value: formatNumber(totalGames),
    },
    {
      id: 'lines-cleared',
      label: 'Total lines cleared',
      value: formatNumber(stats?.totalLinesCleared ?? 0),
    },
    {
      id: 'best-combo',
      label: 'Best combo',
      value: formatCombo(stats?.bestCombo ?? 0),
    },
    {
      id: 'perfect-clears',
      label: 'Perfect clears',
      value: formatNumber(stats?.perfectClears ?? 0),
    },
    {
      id: 'play-time',
      label: 'Total play time',
      value: formatPlayTime(stats?.totalPlayTime ?? 0),
    },
    {
      id: 'current-streak',
      label: 'Current day streak',
      value: `${stats?.currentStreak ?? 0}`,
    },
    {
      id: 'best-streak',
      label: 'Best day streak',
      value: `${stats?.bestStreak ?? 0}`,
    },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          title: 'Stats',
        }}
      />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: 16,
            paddingBottom: Math.max(insets.bottom, 24) + 16,
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.ink }]}>Stats</Text>
        </View>

        {hasNoGames && (
          <View style={[styles.emptyCard, { backgroundColor: theme.surface }]}>
            <Text style={[styles.emptyText, { color: theme.inkMuted }]}>
              Play a game to start your stats.
            </Text>
          </View>
        )}

        <View style={styles.grid}>
          {statItems.map((item) => (
            <View
              key={item.id}
              accessible={true}
              accessibilityLabel={`${item.label}, ${item.value}`}
              style={[styles.card, { backgroundColor: theme.surface }]}
            >
              <Text style={[styles.cardLabel, { color: theme.inkMuted }]}>
                {item.label}
              </Text>
              <Text
                style={[styles.cardValue, { color: theme.ink }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {item.value}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    maxWidth: 460,
    width: '100%',
    alignSelf: 'center',
  },
  header: {
    marginBottom: 16,
  },
  title: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 28,
  },
  emptyCard: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 15,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    justifyContent: 'center',
  },
  cardLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 13,
    marginBottom: 6,
  },
  cardValue: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
});
