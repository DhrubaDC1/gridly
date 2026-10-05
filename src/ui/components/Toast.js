import React, { useEffect, useRef } from 'react';
import { StyleSheet, View, Text } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';
import { useToast } from '../../store/useToast';

/**
 * Toast banner component that displays queued notification banners (e.g. achievement unlocks)
 * at the top of the screen.
 *
 * Shows for 2.5s, queued one after another.
 * With Reduce Motion active, uses opacity fade only with no translateY motion.
 *
 * @param {Object} [props]
 * @param {import('../../game/toastQueue').ToastItem | null} [props.toast]
 * @param {import('../../game/toastQueue').ToastItem | null} [props.current]
 * @param {() => void} [props.onDismiss]
 * @param {boolean} [props.reduceMotion]
 * @param {any} [props.theme]
 */
export default function Toast({
  toast: toastProp,
  current: currentProp,
  onDismiss: onDismissProp,
  reduceMotion: reduceMotionProp,
  theme: customTheme,
}) {
  const defaultTheme = useTheme();
  const theme = customTheme || defaultTheme;

  const systemReduceMotion = useReduceMotion();
  const reduceMotion =
    typeof reduceMotionProp === 'boolean'
      ? reduceMotionProp
      : systemReduceMotion;

  let insets = { top: 0, bottom: 0, left: 0, right: 0 };
  try {
    const safeInsets = useSafeAreaInsets();
    if (safeInsets) insets = safeInsets;
  } catch {
    // Fallback when outside SafeAreaProvider
  }

  const storeCurrent = useToast((state) => state.current);
  const storeDismiss = useToast((state) => state.dismissCurrent);

  const activeToast =
    currentProp !== undefined
      ? currentProp
      : toastProp !== undefined
      ? toastProp
      : storeCurrent;
  const dismiss = onDismissProp || storeDismiss;

  const opacity = useSharedValue(0);
  const translateY = useSharedValue(reduceMotion ? 0 : -32);

  const dismissRef = useRef(dismiss);
  dismissRef.current = dismiss;

  useEffect(() => {
    if (!activeToast) {
      opacity.value = 0;
      translateY.value = reduceMotion ? 0 : -32;
      return;
    }

    const fadeInDuration = reduceMotion ? 150 : 250;
    const fadeOutDuration = reduceMotion ? 150 : 200;
    const displayDuration = activeToast.duration ?? 2500;

    // 1. Animate In
    if (reduceMotion) {
      translateY.value = 0;
      opacity.value = withTiming(1, { duration: fadeInDuration });
    } else {
      translateY.value = -32;
      translateY.value = withTiming(0, {
        duration: fadeInDuration,
        easing: Easing.out(Easing.quad),
      });
      opacity.value = withTiming(1, { duration: fadeInDuration });
    }

    // 2. Stay for 2.5s display duration, then animate out and dismiss
    let dismissTimer = null;
    const hideTimer = setTimeout(() => {
      if (reduceMotion) {
        translateY.value = 0;
        opacity.value = withTiming(0, { duration: fadeOutDuration });
      } else {
        translateY.value = withTiming(-32, {
          duration: fadeOutDuration,
          easing: Easing.in(Easing.quad),
        });
        opacity.value = withTiming(0, { duration: fadeOutDuration });
      }

      dismissTimer = setTimeout(() => {
        dismissRef.current?.();
      }, fadeOutDuration);
    }, displayDuration);

    return () => {
      clearTimeout(hideTimer);
      if (dismissTimer) clearTimeout(dismissTimer);
    };
  }, [activeToast?.id, reduceMotion, opacity, translateY]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  if (!activeToast) {
    return null;
  }

  const title = activeToast.title || 'Achievement unlocked';
  const message = activeToast.message || activeToast.name || '';
  const topPadding = Math.max(insets.top, 16) + 8;

  return (
    <View
      pointerEvents="box-none"
      style={[styles.container, { top: topPadding }]}
      testID="toast-container"
    >
      <Animated.View
        style={[
          styles.card,
          {
            backgroundColor: theme.surface,
            borderColor: theme.well,
          },
          animatedStyle,
        ]}
        accessibilityRole="alert"
        accessibilityLiveRegion="polite"
        accessibilityLabel={`${title}: ${message}`}
        testID="toast-card"
      >
        <Text style={[styles.title, { color: theme.accentInk }]}>{title}</Text>
        {Boolean(message) && (
          <Text style={[styles.message, { color: theme.ink }]}>
            {message}
          </Text>
        )}
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 9999,
    elevation: 9999,
    paddingHorizontal: 16,
  },
  card: {
    width: '100%',
    maxWidth: 360,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    alignItems: 'center',
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  title: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 13,
    letterSpacing: 0.2,
    marginBottom: 2,
    textAlign: 'center',
  },
  message: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    textAlign: 'center',
  },
});
