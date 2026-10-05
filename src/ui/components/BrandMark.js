import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing,
} from 'react-native-reanimated';
import { Canvas } from '@shopify/react-native-skia';
import { useIsFocused } from 'expo-router';
import Cell from './Cell';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';

// Cluster layout in tile units: [glaze index, x, y, resting rotation deg, float period ms]
const TILES = [
  [1, 0, 0.62, -10, 3400], // Jade
  [0, 1.0, 0, 8, 3000], // Cobalt
  [2, 1.95, 0.7, -6, 3800], // Persimmon
  [3, 0.85, 1.25, 6, 3200], // Saffron
  [4, 1.8, 1.75, -10, 3600], // Iris
];

function FloatingTile({ glaze, x, y, rotate, period, size, theme, animate }) {
  const t = useSharedValue(0.5);

  useEffect(() => {
    if (!animate) return undefined;
    t.value = withSequence(
      // ease back to the low pose first so a paused tile never snaps
      withTiming(0, { duration: 400, easing: Easing.inOut(Easing.ease) }),
      withDelay(
        period % 700,
        withRepeat(
          withTiming(1, { duration: period, easing: Easing.inOut(Easing.ease) }),
          -1,
          true
        )
      )
    );
    return () => cancelAnimation(t);
  }, [animate, period, t]);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateY: 4 - 8 * t.value },
      { rotate: `${rotate + 10 * t.value - 5}deg` },
    ],
  }));

  return (
    <Animated.View
      style={[{ position: 'absolute', left: x, top: y, width: size, height: size }, style]}
    >
      <Canvas style={{ width: size, height: size }}>
        <Cell x={0} y={0} size={size} color={glaze} theme={theme} reduceMotion />
      </Canvas>
    </Animated.View>
  );
}

/**
 * Home brand: a floating cluster of glazed tiles over the "Gridly" wordmark.
 *
 * @param {Object} props
 * @param {number} [props.tileSize=52]
 * @param {number} [props.fontSize=52]
 */
export default function BrandMark({ tileSize = 52, fontSize = 52 }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();
  // Tabs keep Home mounted; only float while it's on screen
  const animate = useIsFocused() && !reduceMotion;
  const step = tileSize * 1.06;
  const width = step * 2 + tileSize + 8;
  const height = step * 1.75 + tileSize + 8;

  return (
    <View style={styles.root} accessible accessibilityRole="header" accessibilityLabel="Gridly">
      <View style={{ width, height }}>
        {TILES.map(([glaze, gx, gy, rotate, period]) => (
          <FloatingTile
            key={glaze}
            glaze={glaze}
            x={gx * step + 4}
            y={gy * step + 4}
            rotate={rotate}
            period={period}
            size={tileSize}
            theme={theme}
            animate={animate}
          />
        ))}
      </View>
      <Text
        style={[
          styles.wordmark,
          { color: theme.ink, fontSize, lineHeight: fontSize * 1.2 },
        ]}
      >
        Gridly
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    alignItems: 'center',
  },
  wordmark: {
    fontFamily: 'Unbounded_700Bold',
    letterSpacing: -1.5,
    marginTop: 4,
  },
});
