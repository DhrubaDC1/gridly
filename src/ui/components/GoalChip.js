import React, { forwardRef, useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withSpring,
  Easing,
} from 'react-native-reanimated';

const SPARKS = 8;

function Spark({ burst, angle, color }) {
  const style = useAnimatedStyle(() => {
    const t = burst.value;
    const d = 6 + 26 * (1 - (1 - t) * (1 - t));
    return {
      opacity: t <= 0 || t >= 1 ? 0 : 1 - t,
      transform: [
        { translateX: Math.cos(angle) * d },
        { translateY: Math.sin(angle) * d },
        { scale: 1 - 0.6 * t },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.spark, { backgroundColor: color }, style]}
    />
  );
}

/**
 * Adventure goal chip. `celebrate` increments when the goal is met (pop, ring,
 * sparks); `bump` increments on progress (small pop, e.g. a gem landing).
 *
 * @param {Object} props
 * @param {string} props.text
 * @param {boolean} props.completed
 * @param {number} [props.celebrate=0]
 * @param {number} [props.bump=0]
 * @param {Object} props.theme
 * @param {boolean} [props.reduceMotion]
 */
function GoalChip(
  { text, completed, celebrate = 0, bump = 0, theme, reduceMotion },
  ref
) {
  const scale = useSharedValue(1);
  const burst = useSharedValue(0);

  useEffect(() => {
    if (!bump || reduceMotion) return;
    scale.value = withSequence(
      withTiming(1.12, { duration: 80 }),
      withSpring(1, { damping: 10, stiffness: 260 })
    );
  }, [bump, reduceMotion, scale]);

  useEffect(() => {
    if (!celebrate) return;
    burst.value = 0;
    burst.value = withTiming(1, {
      duration: reduceMotion ? 300 : 560,
      easing: Easing.linear,
    });
    if (!reduceMotion) {
      scale.value = withSequence(
        withTiming(1.28, { duration: 120, easing: Easing.out(Easing.quad) }),
        withSpring(1, { damping: 7, stiffness: 200 })
      );
    }
  }, [celebrate, reduceMotion, scale, burst]);

  const chipStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const ringStyle = useAnimatedStyle(() => {
    const t = burst.value;
    return {
      opacity: t <= 0 || t >= 1 ? 0 : 0.9 * (1 - t),
      transform: [{ scale: reduceMotion ? 1 : 1 + 0.5 * t }],
    };
  });

  const tint = completed ? theme.success : theme.cellEmpty;

  return (
    <View ref={ref} collapsable={false}>
      <Animated.View
        style={[
          styles.chip,
          {
            backgroundColor: theme.surface,
            borderColor: tint,
          },
          chipStyle,
        ]}
        accessibilityRole="text"
        accessibilityLabel={text}
      >
        <Animated.View
          pointerEvents="none"
          style={[styles.ring, { borderColor: theme.success }, ringStyle]}
        />
        {!reduceMotion &&
          Array.from({ length: SPARKS }).map((_, i) => (
            <Spark
              key={i}
              burst={burst}
              angle={(i / SPARKS) * Math.PI * 2}
              color={i % 2 ? theme.star : theme.success}
            />
          ))}
        <Text
          style={[
            styles.text,
            {
              color: completed ? theme.success : theme.ink,
              fontFamily: completed
                ? 'Figtree_600SemiBold'
                : 'Figtree_500Medium',
            },
          ]}
        >
          {text}
        </Text>
      </Animated.View>
    </View>
  );
}

export default forwardRef(GoalChip);

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ring: {
    position: 'absolute',
    top: -1,
    left: -1,
    right: -1,
    bottom: -1,
    borderRadius: 10,
    borderWidth: 2,
  },
  spark: {
    position: 'absolute',
    width: 5,
    height: 5,
    borderRadius: 2.5,
  },
  text: {
    fontSize: 13,
  },
});
