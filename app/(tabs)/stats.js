import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/theme';
import { useProgress } from '../../src/store/useProgress';
import ScreenHeader from '../../src/ui/components/ScreenHeader';
import Icon from '../../src/ui/components/Icon';
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

  // icon + glaze index give each tile its badge
  const statItems = [
    {
      id: 'classic-best',
      label: 'Classic best',
      icon: 'infinity',
      glaze: 0,
      bare: true,
      value: formatNumber(stats?.bestScore?.classic ?? 0),
    },
    {
      id: 'blitz-best',
      label: 'Blitz best',
      icon: 'stopwatch',
      glaze: 2,
      value: formatNumber(stats?.bestScore?.blitz ?? 0),
    },
    {
      id: 'avg-classic',
      label: 'Average Classic score',
      icon: 'bars',
      glaze: 0,
      value: formatAverageClassicScore(stats),
    },
    {
      id: 'games-played',
      label: 'Games played',
      icon: 'gamepad',
      glaze: 4,
      value: formatNumber(totalGames),
    },
    {
      id: 'lines-cleared',
      label: 'Total lines cleared',
      icon: 'grid',
      glaze: 0,
      value: formatNumber(stats?.totalLinesCleared ?? 0),
    },
    {
      id: 'best-combo',
      label: 'Best combo',
      icon: 'star',
      glaze: 3,
      value: formatCombo(stats?.bestCombo ?? 0),
    },
    {
      id: 'perfect-clears',
      label: 'Perfect clears',
      icon: 'gem',
      glaze: 0,
      value: formatNumber(stats?.perfectClears ?? 0),
    },
    {
      id: 'play-time',
      label: 'Total play time',
      icon: 'clock',
      glaze: 4,
      value: formatPlayTime(stats?.totalPlayTime ?? 0),
    },
    {
      id: 'current-streak',
      label: 'Current day streak',
      icon: 'flame',
      glaze: 2,
      value: `${stats?.currentStreak ?? 0}`,
    },
    {
      id: 'best-streak',
      label: 'Best day streak',
      icon: 'crown',
      glaze: 3,
      value: `${stats?.bestStreak ?? 0}`,
    },
  ];

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + 8, paddingBottom: 24 },
      ]}
      showsVerticalScrollIndicator={false}
    >
      <ScreenHeader
        title="Stats"
        art="stats"
        subtitle={hasNoGames ? 'Play a game to start your stats.' : undefined}
      />

      <View style={styles.grid}>
        {statItems.map((item) => {
          const glaze = theme.glaze[item.glaze];
          return (
            <View
              key={item.id}
              accessible={true}
              accessibilityLabel={`${item.label}, ${item.value}`}
              style={[styles.card, { backgroundColor: theme.surface }]}
            >
              <Text style={[styles.cardLabel, { color: theme.inkMuted }]} numberOfLines={1}>
                {item.label}
              </Text>
              <View style={styles.valueRow}>
                <View
                  style={[
                    styles.badge,
                    !item.bare && { backgroundColor: `${glaze.base}24` },
                    item.bare && styles.bareBadge,
                  ]}
                >
                  <Icon name={item.icon} size={item.bare ? 36 : 28} color={glaze.base} solid />
                </View>
                <Text
                  style={[styles.cardValue, { color: theme.ink }]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {item.value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    maxWidth: 452,
    width: '100%',
    alignSelf: 'center',
    gap: 24,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  card: {
    flexBasis: '45%',
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 18,
    borderRadius: 18,
    gap: 14,
  },
  cardLabel: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  badge: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bareBadge: {
    width: 36,
  },
  cardValue: {
    flexShrink: 1,
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 22,
    letterSpacing: -0.5,
  },
});
