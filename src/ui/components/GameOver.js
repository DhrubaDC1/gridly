import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';
import { useProgress } from '../../store/useProgress';
import * as defaultFeedback from '../../services/feedback';
import { getHighlightStat } from '../../game/statsHighlight';

/**
 * GameOver overlay component.
 *
 * Displays:
 * 1. Final score in Unbounded 40, best score underneath, and "New best" if beaten.
 * 2. Highlight stat (perfect clears, best combo >= 2, or lines cleared).
 * 3. Dominant primary "Play again" button and secondary text "Home" button underneath.
 * 4. Animated card fading and rising over 250ms (fade only with Reduce Motion),
 *    triggering feedback.onGameOver once.
 * 5. Updates best Classic score in useProgress once per game and clears inProgress.classic.
 *
 * @param {Object} props
 * @param {boolean} [props.visible=true]
 * @param {number} [props.score=0]
 * @param {Object | null} [props.stats]
 * @param {number} [props.previousBestScore]
 * @param {() => void} [props.onPlayAgain]
 * @param {() => void} [props.onRestart]
 * @param {() => void} [props.onHome]
 * @param {() => void} [props.onQuit]
 * @param {boolean} [props.reduceMotion]
 * @param {string} [props.mode='classic']
 * @param {string | null} [props.overReason]
 * @param {any} [props.theme]
 * @param {any} [props.feedback]
 */
export default function GameOver({
  visible = true,
  mode = 'classic',
  overReason = null,
  score = 0,
  stats = null,
  previousBestScore,
  onPlayAgain,
  onRestart,
  onHome,
  onQuit,
  reduceMotion: reduceMotionProp,
  theme: customTheme,
  feedback: customFeedback,
}) {
  const defaultTheme = useTheme();
  const theme = customTheme || defaultTheme;
  const modeKey = mode || 'classic';

  const systemReduceMotion = useReduceMotion();
  const reduceMotion =
    typeof reduceMotionProp === 'boolean'
      ? reduceMotionProp
      : systemReduceMotion;

  const feedback = customFeedback || defaultFeedback;
  const handlePlayAgain = onPlayAgain || onRestart;
  const handleHome = onHome || onQuit;

  // Track the baseline best score prior to this game's result
  const [baselineBest, setBaselineBest] = useState(() => {
    if (typeof previousBestScore === 'number') {
      return previousBestScore;
    }
    return useProgress.getState().stats?.bestScore?.[modeKey] ?? 0;
  });

  const prevVisibleRef = useRef(visible);
  useEffect(() => {
    if (visible && !prevVisibleRef.current) {
      const best =
        typeof previousBestScore === 'number'
          ? previousBestScore
          : useProgress.getState().stats?.bestScore?.[modeKey] ?? 0;
      setBaselineBest(best);
    }
    prevVisibleRef.current = visible;
  }, [visible, previousBestScore, modeKey]);

  const isNewBest = score > baselineBest && score > 0;
  const displayBest = Math.max(baselineBest, score);
  const highlightText = getHighlightStat(stats);

  // Animations: card fades and rises over 250ms (fade only with reduce motion)
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : 24);

  useEffect(() => {
    if (!visible) {
      opacity.value = 0;
      translateY.value = reduceMotion ? 0 : 24;
      return;
    }

    if (reduceMotion) {
      translateY.value = 0;
      opacity.value = withTiming(1, { duration: 250 });
    } else {
      translateY.value = 24;
      translateY.value = withTiming(0, { duration: 250 });
      opacity.value = withTiming(1, { duration: 250 });
    }
  }, [visible, reduceMotion, opacity, translateY]);

  // One-time feedback and progress updates per game over
  const hasProcessedRef = useRef(false);
  useEffect(() => {
    if (!visible) {
      hasProcessedRef.current = false;
      return;
    }

    if (!hasProcessedRef.current) {
      hasProcessedRef.current = true;

      // 4. Call feedback.onGameOver once
      feedback?.onGameOver?.();

      // 5. Update best score once per game and clear inProgress for classic
      const progress = useProgress.getState();
      const currentBest = progress.stats?.bestScore?.[modeKey] ?? 0;
      if (score > currentBest) {
        progress.updateStats({
          bestScore: {
            ...progress.stats.bestScore,
            [modeKey]: score,
          },
        });
      }
      if (modeKey === 'classic') {
        progress.clearInProgress('classic');
      }
    }
  }, [visible, score, feedback, modeKey]);

  const animatedCardStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!visible) {
    return null;
  }

  const title = overReason === 'timeUp' ? "Time's up" : 'Game over';

  return (
    <View style={styles.overlay} testID="game-over-overlay">
      <Animated.View
        style={[
          styles.card,
          { backgroundColor: theme.surface },
          animatedCardStyle,
        ]}
        testID="game-over-card"
      >
        <Text style={[styles.title, { color: theme.ink }]}>{title}</Text>

        <Text
          style={[styles.score, { color: theme.ink }]}
          accessibilityRole="text"
          accessibilityLabel={`Final score: ${score}`}
        >
          {score.toLocaleString()}
        </Text>

        <Text
          style={[styles.bestScore, { color: theme.inkMuted }]}
          accessibilityRole="text"
          accessibilityLabel={`Best score: ${displayBest}`}
        >
          {`best ${displayBest.toLocaleString()}`}
        </Text>

        {isNewBest && (
          <Text
            style={[styles.newBest, { color: theme.accent }]}
            accessibilityRole="text"
            accessibilityLabel="New best"
            testID="new-best-label"
          >
            New best
          </Text>
        )}

        <Text
          style={[styles.highlight, { color: theme.inkMuted }]}
          accessibilityRole="text"
          accessibilityLabel={highlightText}
          testID="game-over-highlight"
        >
          {highlightText}
        </Text>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play again"
          style={({ pressed }) => [
            styles.primaryButton,
            {
              backgroundColor: theme.accent,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={handlePlayAgain}
        >
          <Text style={styles.primaryButtonText}>Play again</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Home"
          style={({ pressed }) => [
            styles.secondaryButton,
            {
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={handleHome}
        >
          <Text style={[styles.secondaryButtonText, { color: theme.inkMuted }]}>
            Home
          </Text>
        </Pressable>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 20,
    marginBottom: 16,
  },
  score: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 40,
    letterSpacing: -1,
    lineHeight: 48,
    marginBottom: 4,
  },
  bestScore: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
  newBest: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 14,
    marginTop: 4,
  },
  highlight: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
    marginTop: 16,
    marginBottom: 24,
    textAlign: 'center',
  },
  primaryButton: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginBottom: 8,
  },
  primaryButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
  secondaryButton: {
    width: '100%',
    minHeight: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
});
