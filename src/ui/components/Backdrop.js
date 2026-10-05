import React, { memo, useMemo } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import {
  Canvas,
  Rect,
  LinearGradient,
  RadialGradient,
  vec,
} from '@shopify/react-native-skia';
import { useTheme } from '../theme';

const makeVec = typeof vec === 'function' ? vec : (x, y) => ({ x, y });

/**
 * Backdrop renders a static full-screen background pool behind content.
 * It draws:
 * 1. A full-screen vertical linear gradient from theme.bg (top) to theme.bgDeep (bottom).
 * 2. A radial gradient from theme.spotlight to transparent centered behind the board area
 *    with radius 0.7 * screenWidth.
 *
 * Absolutely positioned behind content with pointerEvents="none".
 * Memoized to render once and never re-render during gameplay.
 *
 * @param {Object} props
 * @param {Object} [props.theme] - Optional theme override.
 * @param {number} [props.boardCenterY] - Optional vertical center coordinate for the spotlight.
 * @param {any} [props.style] - Optional style override for the Canvas.
 * @param {string} [props.testID='backdrop'] - Optional test ID.
 */
function Backdrop({
  theme: themeProp,
  boardCenterY,
  style,
  testID = 'backdrop',
}) {
  const hookTheme = useTheme();
  const theme = themeProp || hookTheme;
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  const width = screenWidth;
  const height = screenHeight;

  // Spotlight pool centered horizontally and behind the board area
  // Radius = 0.7 * screen width
  const radius = screenWidth * 0.7;
  const cx = screenWidth / 2;
  const cy = boardCenterY != null ? boardCenterY : screenHeight * 0.48;

  // Memoize drawing children so no new objects/nodes are created during play
  const content = useMemo(
    () => (
      <>
        {/* Full-screen vertical gradient: theme.bg (top) to theme.bgDeep (bottom) */}
        <Rect x={0} y={0} width={width} height={height}>
          <LinearGradient
            start={makeVec(0, 0)}
            end={makeVec(0, height)}
            colors={[theme.bg, theme.bgDeep]}
          />
        </Rect>

        {/* Radial spotlight pool: theme.spotlight to transparent behind board area */}
        <Rect x={0} y={0} width={width} height={height}>
          <RadialGradient
            c={makeVec(cx, cy)}
            r={radius}
            colors={[theme.spotlight, `${theme.spotlight}00`]}
          />
        </Rect>
      </>
    ),
    [width, height, cx, cy, radius, theme.bg, theme.bgDeep, theme.spotlight]
  );

  return (
    <Canvas
      testID={testID}
      pointerEvents="none"
      style={[styles.canvas, { width, height }, style]}
    >
      {content}
    </Canvas>
  );
}

const styles = StyleSheet.create({
  canvas: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
});

export default memo(Backdrop);
