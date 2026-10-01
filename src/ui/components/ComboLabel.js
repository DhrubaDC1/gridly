import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withDelay,
  runOnJS,
} from 'react-native-reanimated';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';

/**
 * ComboLabel component.
 * Displays "x2", "x3", etc. near the top of the board when combo >= 2.
 * Pops in with a spring and fades out after 700ms.
 * Combos of 1 show nothing.
 *
 * @param {Object} props
 * @param {(listener: (events: Array<Object>) => void) => () => void} [props.subscribe] - Event subscription.
 * @param {number} [props.combo] - Direct combo count.
 * @param {boolean} [props.reduceMotion] - Override reduce motion preference.
 * @param {any} [props.style] - Override container style.
 */
export default function ComboLabel({
  subscribe,
  combo: comboProp,
  reduceMotion: reduceMotionProp,
  style,
}) {
  const theme = useTheme();
  const systemReduceMotion = useReduceMotion();
  const reduceMotion =
    typeof reduceMotionProp === 'boolean'
      ? reduceMotionProp
      : systemReduceMotion;

  const [displayedCount, setDisplayedCount] = useState(null);

  const scale = useSharedValue(1);
  const opacity = useSharedValue(0);

  const hide = useCallback(() => {
    setDisplayedCount(null);
  }, []);

  const triggerCombo = useCallback(
    (count) => {
      if (typeof count !== 'number' || count < 2) {
        return;
      }

      setDisplayedCount(count);

      const holdDuration = reduceMotion ? 350 : 700;
      const fadeDuration = reduceMotion ? 100 : 200;

      if (reduceMotion) {
        scale.value = 1;
      } else {
        scale.value = 0.3;
        scale.value = withSpring(1, { damping: 12, stiffness: 150 });
      }

      opacity.value = 1;
      opacity.value = withDelay(
        holdDuration,
        withTiming(0, { duration: fadeDuration }, (finished) => {
          if (finished) {
            runOnJS(hide)();
          }
        })
      );
    },
    [reduceMotion, hide, scale, opacity]
  );

  useEffect(() => {
    if (!subscribe) return;
    return subscribe((events) => {
      const comboEvent = events.find((e) => e.type === 'combo');
      if (comboEvent && typeof comboEvent.count === 'number') {
        if (comboEvent.count >= 2) {
          triggerCombo(comboEvent.count);
        }
      }
    });
  }, [subscribe, triggerCombo]);

  useEffect(() => {
    if (typeof comboProp === 'number' && comboProp >= 2) {
      triggerCombo(comboProp);
    }
  }, [comboProp, triggerCombo]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ scale: scale.value }],
  }));

  if (displayedCount === null) {
    return null;
  }

  return (
    <Animated.View
      pointerEvents="none"
      accessibilityRole="text"
      accessibilityLabel={`Combo x${displayedCount}`}
      style={[styles.container, animatedStyle, style]}
    >
      <View style={[styles.badge, { backgroundColor: theme.surface }]}>
        <Text style={[styles.text, { color: theme.accent }]}>
          {`x${displayedCount}`}
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 10,
    alignSelf: 'center',
    zIndex: 50,
    elevation: 50,
  },
  badge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  text: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 20,
    letterSpacing: -0.5,
  },
});
