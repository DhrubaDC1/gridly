import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';
import { Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../src/ui/theme';
import { useProgress } from '../src/store/useProgress';
import { ACHIEVEMENTS } from '../src/engine/achievements';
import { formatUnlockDate, formatDate } from '../src/game/format';

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
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <Stack.Screen
        options={{
          title: 'Achievements',
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
          <Text style={[styles.title, { color: theme.ink }]}>Achievements</Text>
          <Text style={[styles.headerSubtitle, { color: theme.inkMuted }]}>
            {unlockedCount} of {totalCount} unlocked
          </Text>

          <View style={[styles.progressTrack, { backgroundColor: theme.well }]}>
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
        </View>

        <View style={styles.list}>
          {ACHIEVEMENTS.map((item) => {
            const unlockedAt = achievements[item.id];
            const isUnlocked = Boolean(unlockedAt);

            return (
              <View
                key={item.id}
                testID={`achievement-card-${item.id}`}
                accessible={true}
                accessibilityLabel={`${item.name}, ${
                  isUnlocked ? `unlocked ${formatDate(unlockedAt)}` : 'locked'
                }. ${item.description}`}
                style={[
                  styles.card,
                  {
                    backgroundColor: theme.surface,
                    opacity: isUnlocked ? 1 : 0.45,
                  },
                ]}
              >
                <View style={styles.cardHeader}>
                  <Text style={[styles.cardTitle, { color: theme.ink }]}>
                    {item.name}
                  </Text>
                  {isUnlocked && (
                    <Text style={[styles.badge, { color: theme.accent }]}>✓</Text>
                  )}
                </View>

                <Text
                  style={[styles.cardDescription, { color: theme.inkMuted }]}
                >
                  {item.description}
                </Text>

                {isUnlocked && (
                  <Text style={[styles.unlockDate, { color: theme.accent }]}>
                    {formatUnlockDate(unlockedAt)}
                  </Text>
                )}
              </View>
            );
          })}
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
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 28,
    marginBottom: 4,
  },
  headerSubtitle: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 15,
    marginBottom: 12,
  },
  progressTrack: {
    height: 6,
    borderRadius: 3,
    overflow: 'hidden',
    width: '100%',
  },
  progressBar: {
    height: '100%',
    borderRadius: 3,
  },
  list: {
    gap: 12,
  },
  card: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  cardTitle: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    flex: 1,
  },
  badge: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    marginLeft: 8,
  },
  cardDescription: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    lineHeight: 20,
  },
  unlockDate: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 12,
    marginTop: 8,
  },
});
