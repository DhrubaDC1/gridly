import React, { useEffect, useRef } from 'react';
import { StyleSheet, TextInput } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';

const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

/**
 * Formats an integer score with standard comma separators.
 * Pure worklet-compatible function.
 *
 * @param {number} n
 * @returns {string}
 */
export function formatScore(n) {
  'worklet';
  const val = Math.round(typeof n === 'number' && !isNaN(n) ? n : 0);
  const str = '' + val;
  return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Animated score ticker that counts up to the target score over 400ms with ease-out.
 * Displays in Unbounded 56 with tabular spacing.
 *
 * @param {Object} props
 * @param {number} [props.score=0] - Target score to display.
 * @param {string} [props.color] - Override text color.
 * @param {boolean} [props.reduceMotion] - Override reduce motion preference.
 * @param {any} [props.style] - Override text style.
 */
export default function ScoreTicker({
  score = 0,
  color,
  reduceMotion: reduceMotionProp,
  style,
}) {
  const theme = useTheme();
  const systemReduceMotion = useReduceMotion();
  const reduceMotion =
    typeof reduceMotionProp === 'boolean'
      ? reduceMotionProp
      : systemReduceMotion;

  const scoreValue = useSharedValue(score);
  const prevScoreRef = useRef(score);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      scoreValue.value = score;
      prevScoreRef.current = score;
      return;
    }

    if (score !== prevScoreRef.current) {
      prevScoreRef.current = score;
      const duration = reduceMotion ? 200 : 400;
      scoreValue.value = withTiming(score, {
        duration,
        easing: Easing.out(Easing.quad),
      });
    }
  }, [score, reduceMotion, scoreValue]);

  const animatedProps = useAnimatedProps(() => {
    const formatted = formatScore(scoreValue.value);
    return {
      text: formatted,
      defaultValue: formatted,
    };
  });

  const textColor = color || theme.ink;

  return (
    <AnimatedTextInput
      underlineColorAndroid="transparent"
      editable={false}
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={`Score: ${score}`}
      defaultValue={formatScore(score)}
      animatedProps={animatedProps}
      style={[
        styles.score,
        {
          color: textColor,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  score: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 56,
    letterSpacing: -0.5,
    textAlign: 'center',
    padding: 0,
    margin: 0,
    includeFontPadding: false,
    fontVariant: ['tabular-nums'],
  },
});
