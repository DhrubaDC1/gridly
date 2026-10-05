import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/theme';
import { useProgress } from '../../src/store/useProgress';
import { ACHIEVEMENTS } from '../../src/engine/achievements';
import { formatUnlockDate, formatDate } from '../../src/game/format';
import ScreenHeader from '../../src/ui/components/ScreenHeader';
import { Canvas } from '@shopify/react-native-skia';
import Icon from '../../src/ui/components/Icon';
import Cell from '../../src/ui/components/Cell';

// Badge per achievement: glazed tile grid [cols, rows] or a solid icon, tinted by glaze index
const BADGES = {
  first_clear: { tiles: [1, 1], glaze: 2 },
  double: { tiles: [2, 1], glaze: 0 },
  quad: { tiles: [2, 2], glaze: 1 },
  combo_3: { icon: 'star', glaze: 2 },
  combo_5: { icon: 'hand', glaze: 4 },
  combo_10: { icon: 'crown', glaze: 3 },
  perfect: { tiles: [3, 3], glaze: 0 },
  perfect_5: { icon: 'trophy', glaze: 2 },
  mono: { tiles: [3, 1], glaze: 4 },
  mono_10: { icon: 'palette', glaze: 4 },
  classic_1k: { icon: 'trophy', glaze: 1 },
  '5k': { icon: 'trophy', glaze: 0 },
  '10k': { icon: 'trophy', glaze: 4 },
  '25k': { icon: 'trophy', glaze: 3 },
  blitz_3k: { icon: 'zap', glaze: 2 },
  blitz_8k: { icon: 'zap', glaze: 3 },
  adv_10: { icon: 'flag', glaze: 1 },
  adv_25: { icon: 'flag', glaze: 0 },
  adv_50: { icon: 'flag', glaze: 4 },
  stars_100: { icon: 'star', glaze: 3 },
  games_10: { icon: 'gamepad', glaze: 0 },
  games_100: { icon: 'gamepad', glaze: 4 },
  lines_1000: { tiles: [3, 2], glaze: 5 },
  holder: { icon: 'swap', glaze: 4 },
  streak_7: { icon: 'flame', glaze: 2 },
};

const BADGE_SIZE = 54;

function TileBadge({ cols, rows, glaze, theme }) {
  const n = Math.max(cols, rows);
  const gap = n === 1 ? 0 : n === 2 ? 3 : 2;
  const tile = n === 1 ? 26 : n === 2 ? 16 : 11;
  const w = cols * tile + (cols - 1) * gap;
  const h = rows * tile + (rows - 1) * gap;
  const cells = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      cells.push(
        <Cell
          key={`${r}-${c}`}
          x={(BADGE_SIZE - w) / 2 + c * (tile + gap)}
          y={(BADGE_SIZE - h) / 2 + r * (tile + gap)}
          size={tile}
          color={glaze}
          theme={theme}
          reduceMotion
        />
      );
    }
  }
  return <Canvas style={styles.badgeCanvas}>{cells}</Canvas>;
}

function useSafeInsets() {
  try {
    return useSafeAreaInsets() || { top: 0, bottom: 0, left: 0, right: 0 };
  } catch {
    return { top: 0, bottom: 0, left: 0, right: 0 };
  }
}

export default function AchievementsScreen() {
  const theme = useTheme();
  const insets = useSafeInsets();
  const achievements = useProgress((state) => state.achievements);

  const totalCount = ACHIEVEMENTS.length;
  const unlockedCount = ACHIEVEMENTS.filter((item) =>
    Boolean(achievements[item.id])
  ).length;

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
        title="Achievements"
        art="achievements"
        subtitle={`${unlockedCount} of ${totalCount} unlocked`}
      />

      <View style={[styles.progressTrack, { backgroundColor: theme.surfaceSunken }]}>
        <View
          style={[
            styles.progressBar,
            {
              backgroundColor: theme.accent,
              width: `${Math.round((unlockedCount / totalCount) * 100)}%`,
            },
          ]}
        />
      </View>

      <View style={styles.list}>
        {ACHIEVEMENTS.map((item) => {
          const unlockedAt = achievements[item.id];
          const isUnlocked = Boolean(unlockedAt);
          const badge = BADGES[item.id] ?? { icon: 'star', glaze: 3 };
          const glaze = theme.glaze[badge.glaze];

          return (
            <View
              key={item.id}
              testID={`achievement-card-${item.id}`}
              accessible={true}
              accessibilityLabel={`${item.name}, ${
                isUnlocked ? `unlocked ${formatDate(unlockedAt)}` : 'locked'
              }. ${item.description}`}
              style={[styles.card, { backgroundColor: theme.surface }]}
            >
              <View style={[styles.badge, { backgroundColor: `${glaze.base}24` }]}>
                {badge.tiles ? (
                  <TileBadge
                    cols={badge.tiles[0]}
                    rows={badge.tiles[1]}
                    glaze={badge.glaze}
                    theme={theme}
                  />
                ) : (
                  <Icon name={badge.icon} size={30} color={glaze.base} solid />
                )}
              </View>

              <View style={styles.cardText}>
                <Text style={[styles.cardTitle, { color: theme.ink }]}>{item.name}</Text>
                <Text
                  style={[
                    styles.cardDescription,
                    { color: theme.inkMuted, opacity: isUnlocked ? 1 : 0.75 },
                  ]}
                >
                  {item.description}
                </Text>
                {isUnlocked && (
                  <Text style={[styles.unlockDate, { color: theme.success }]}>
                    {formatUnlockDate(unlockedAt)}
                  </Text>
                )}
              </View>

              {isUnlocked ? (
                <Icon name="check" size={22} color={theme.success} strokeWidth={2.5} />
              ) : (
                <Icon name="lock" size={20} color={theme.inkMuted} solid style={styles.lock} />
              )}
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
    gap: 16,
  },
  progressTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    width: '100%',
    marginBottom: 8,
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  list: {
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  badge: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeCanvas: {
    width: BADGE_SIZE,
    height: BADGE_SIZE,
  },
  lock: {
    opacity: 0.6,
  },
  cardText: {
    flex: 1,
    gap: 2,
  },
  cardTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  cardDescription: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
  },
  unlockDate: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    marginTop: 2,
  },
});
