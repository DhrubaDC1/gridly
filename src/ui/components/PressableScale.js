import React from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import useReduceMotion from '../useReduceMotion';

const SPRING = { damping: 18, stiffness: 320, mass: 0.6 };

/**
 * Pressable that springs down slightly while held. Under Reduce Motion it dims instead.
 * All other props (onPress, accessibility*) go to the underlying Pressable.
 *
 * @param {Object} props
 * @param {any} [props.style] - style of the animated content
 * @param {any} [props.containerStyle] - style of the outer Pressable (layout: flex, margins)
 * @param {number} [props.pressedScale=0.97]
 * @param {React.ReactNode} props.children
 */
export default function PressableScale({
  style,
  containerStyle,
  pressedScale = 0.97,
  children,
  ...pressableProps
}) {
  const reduceMotion = useReduceMotion();
  const pressed = useSharedValue(0);

  const animatedStyle = useAnimatedStyle(() =>
    reduceMotion
      ? { opacity: 1 - pressed.value * 0.15 }
      : { transform: [{ scale: 1 - pressed.value * (1 - pressedScale) }] }
  );

  return (
    <Pressable
      accessibilityRole="button"
      {...pressableProps}
      style={containerStyle}
      onPressIn={() => {
        pressed.value = withSpring(1, SPRING);
      }}
      onPressOut={() => {
        pressed.value = withSpring(0, SPRING);
      }}
    >
      <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>
    </Pressable>
  );
}
