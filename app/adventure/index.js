import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Pressable,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../src/ui/theme';
import { useProgress } from '../../src/store/useProgress';
import StarRow from '../../src/ui/components/StarRow';
import levelsData from '../../assets/levels/levels.json';

/**
 * Level map screen displaying a scrollable grid of level nodes.
 * Unlocked levels are tappable and open app/adventure/[level].js.
 * Locked levels (above adventure.unlocked) are dimmed and not tappable.
 */
export default function AdventureMapScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();

  const unlocked = useProgress((s) => s.adventure?.unlocked ?? 1);
  const starsMap = useProgress((s) => s.adventure?.stars ?? {});

  const totalStars = Object.values(starsMap).reduce(
    (acc, val) => acc + (typeof val === 'number' ? val : 0),
    0
  );
  const maxPossibleStars = levelsData.length * 3;

  const contentWidth = Math.min(screenWidth - 32, 420);
  const numColumns = 4;
  const gap = 12;
  const itemWidth = Math.floor(
    (contentWidth - (numColumns - 1) * gap) / numColumns
  );

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.bg }]}
      contentContainerStyle={[
        styles.content,
        {
          paddingTop: 16,
          paddingBottom: Math.max(insets.bottom, 24) + 24,
        },
      ]}
      showsVerticalScrollIndicator={false}
      testID="adventure-map-screen"
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.ink }]}>Adventure</Text>
        <Text style={[styles.subtitle, { color: theme.inkMuted }]}>
          {`★ ${totalStars} / ${maxPossibleStars} stars`}
        </Text>
      </View>

      <View
        style={[
          styles.grid,
          {
            width: contentWidth,
            gap,
          },
        ]}
      >
        {levelsData.map((level) => {
          const levelId = level.id;
          const isLocked = levelId > unlocked;
          const levelStars = starsMap[levelId] ?? 0;
          const isCurrent = levelId === unlocked;

          return (
            <Pressable
              key={levelId}
              accessibilityRole="button"
              accessibilityLabel={
                isLocked
                  ? `Level ${levelId}, locked`
                  : `Level ${levelId}, ${levelStars} of 3 stars`
              }
              accessibilityState={{ disabled: isLocked }}
              disabled={isLocked}
              onPress={() => router.push(`/adventure/${levelId}`)}
              style={({ pressed }) => [
                styles.node,
                {
                  width: itemWidth,
                  height: itemWidth,
                  backgroundColor: isLocked ? theme.cellEmpty : theme.surface,
                  borderColor: isCurrent ? theme.accent : 'transparent',
                  borderWidth: isCurrent ? 2 : 1,
                  opacity: isLocked ? 0.35 : pressed ? 0.85 : 1,
                },
              ]}
              testID={`level-node-${levelId}`}
            >
              <Text
                style={[
                  styles.levelNumber,
                  {
                    color: isLocked ? theme.inkMuted : theme.ink,
                  },
                ]}
              >
                {levelId}
              </Text>
              <StarRow
                stars={isLocked ? 0 : levelStars}
                size={11}
                gap={2}
                theme={theme}
              />
            </Pressable>
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
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  header: {
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 24,
    marginBottom: 4,
  },
  subtitle: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  node: {
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    minWidth: 44,
    minHeight: 44,
  },
  levelNumber: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 18,
    marginBottom: 4,
  },
});
