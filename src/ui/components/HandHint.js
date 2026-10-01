import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation,
} from 'react-native-reanimated';
import useReduceMotion from '../useReduceMotion';

const CIRCLE_SIZE = 32;
const CIRCLE_RADIUS = CIRCLE_SIZE / 2;

/**
 * HandHint component:
 * Renders a small animated circle that slides from the 1x3 tray piece to the
 * target empty cells on the board and loops until dragging starts.
 * Contains no text.
 *
 * @param {Object} props
 * @param {{ x: number, y: number } | null} props.startPos
 * @param {{ x: number, y: number } | null} props.endPos
 * @param {boolean} props.visible
 * @param {Object} props.theme
 */
export default function HandHint({ startPos, endPos, visible, theme }) {
  const reduceMotion = useReduceMotion();
  const progress = useSharedValue(0);

  useEffect(() => {
    if (!visible || !startPos || !endPos) {
      cancelAnimation(progress);
      progress.value = 0;
      return;
    }

    const duration = reduceMotion ? 600 : 1200;
    progress.value = 0;
    progress.value = withRepeat(
      withSequence(
        withTiming(1, {
          duration,
          easing: Easing.inOut(Easing.cubic),
        }),
        withDelay(250, withTiming(0, { duration: 0 }))
      ),
      -1,
      false
    );

    return () => {
      cancelAnimation(progress);
    };
  }, [visible, startPos, endPos, reduceMotion, progress]);

  const animatedStyle = useAnimatedStyle(() => {
    if (!startPos || !endPos) {
      return { opacity: 0 };
    }

    const p = progress.value;
    const curX = startPos.x + (endPos.x - startPos.x) * p;
    const curY = startPos.y + (endPos.y - startPos.y) * p;

    let opacity = 0.9;
    if (p < 0.12) {
      opacity = (p / 0.12) * 0.9;
    } else if (p > 0.85) {
      opacity = ((1 - p) / 0.15) * 0.9;
    }

    return {
      opacity,
      transform: [
        { translateX: curX - CIRCLE_RADIUS },
        { translateY: curY - CIRCLE_RADIUS },
      ],
    };
  });

  if (!visible || !startPos || !endPos) {
    return null;
  }

  const circleBg = theme?.accent ? `${theme.accent}B3` : 'rgba(63, 95, 168, 0.7)';
  const innerDotBg = '#FFFFFF';

  return (
    <Animated.View
      testID="hand-hint"
      pointerEvents="none"
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.circle,
        {
          backgroundColor: circleBg,
          borderColor: '#FFFFFF',
        },
        animatedStyle,
      ]}
    >
      <View style={[styles.innerDot, { backgroundColor: innerDotBg }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  circle: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: CIRCLE_SIZE,
    height: CIRCLE_SIZE,
    borderRadius: CIRCLE_RADIUS,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  innerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
