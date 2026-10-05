import React, { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';

const W = 60;
const H = 34;
const THUMB = 28;
const PAD = (H - THUMB) / 2;

/**
 * Pill switch (60x34) matching the Settings design. Same props as RN Switch.
 *
 * @param {Object} props
 * @param {boolean} props.value
 * @param {(value: boolean) => void} props.onValueChange
 * @param {string} props.accessibilityLabel
 */
export default function Toggle({ value, onValueChange, accessibilityLabel }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  const t = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    t.value = withTiming(value ? 1 : 0, { duration: reduceMotion ? 0 : 160 });
  }, [value, reduceMotion, t]);

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: t.value * (W - THUMB - PAD * 2) }],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ checked: value }}
      onPress={() => onValueChange?.(!value)}
      hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
    >
      <Animated.View
        style={[styles.track, { backgroundColor: value ? theme.accent : theme.line }]}
      >
        <Animated.View
          style={[
            styles.thumb,
            { backgroundColor: theme.isDark ? theme.ink : theme.surface },
            thumbStyle,
          ]}
        />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  track: {
    width: W,
    height: H,
    borderRadius: H / 2,
    padding: PAD,
  },
  thumb: {
    width: THUMB,
    height: THUMB,
    borderRadius: THUMB / 2,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
  },
});
