import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useTheme } from '../theme';

/**
 * StarRow renders a row of up to 3 stars (filled or empty).
 * Used in level map nodes and level complete result cards.
 *
 * @param {Object} props
 * @param {number} [props.stars=0] - Number of earned stars (0-3)
 * @param {number} [props.maxStars=3] - Maximum stars (default 3)
 * @param {number} [props.size=18] - Star font size in pt
 * @param {number} [props.gap=4] - Gap between stars
 * @param {any} [props.theme] - Custom theme override
 * @param {any} [props.style] - Optional container style
 */
export default function StarRow({
  stars = 0,
  maxStars = 3,
  size = 18,
  gap = 4,
  theme: customTheme,
  style,
}) {
  const defaultTheme = useTheme();
  const theme = customTheme || defaultTheme;

  const earned = Math.min(Math.max(0, Math.round(stars || 0)), maxStars);
  const starFillColor = theme?.blocks?.[3] ?? '#D1A84B';
  const starEmptyColor = theme?.cellEmpty ?? '#D0D6DE';

  const starElements = [];
  for (let i = 0; i < maxStars; i++) {
    const isFilled = i < earned;
    starElements.push(
      <Text
        key={i}
        style={[
          styles.star,
          {
            fontSize: size,
            lineHeight: size * 1.15,
            color: isFilled ? starFillColor : starEmptyColor,
            marginHorizontal: gap / 2,
          },
        ]}
      >
        ★
      </Text>
    );
  }

  return (
    <View
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={`${earned} of ${maxStars} stars`}
      style={[styles.container, style]}
    >
      {starElements}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  star: {
    textAlign: 'center',
    includeFontPadding: false,
  },
});
