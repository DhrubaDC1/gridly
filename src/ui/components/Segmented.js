import React from 'react';
import { StyleSheet, View, Text, Pressable } from 'react-native';
import { useTheme } from '../theme';

/**
 * @typedef {Object} SegmentedOptionObject
 * @property {any} value
 * @property {string} label
 * @property {string} [accessibilityLabel]
 * @property {string} [testID]
 */

/**
 * @typedef {string | number | SegmentedOptionObject} SegmentedOption
 */

/**
 * Segmented control drawn as separate pills (radius 14), touch targets >= 44pt.
 *
 * @param {Object} props
 * @param {SegmentedOption[]} props.options - List of options to display.
 * @param {any} props.value - Currently selected value.
 * @param {(value: any) => void} props.onChange - Callback fired when an option is selected.
 * @param {any} [props.theme] - Optional theme tokens (defaults to useTheme()).
 * @param {string} [props.accessibilityLabel] - Optional accessibility label for the segmented container.
 * @param {import('react-native').ViewStyle} [props.style] - Optional outer container style override.
 */
export default function Segmented({
  options = [],
  value,
  onChange,
  theme: customTheme,
  accessibilityLabel,
  style,
}) {
  const defaultTheme = useTheme();
  const theme = customTheme || defaultTheme;

  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={[styles.container, style]}
    >
      {options.map((opt) => {
        const item =
          typeof opt === 'object' && opt !== null
            ? opt
            : { value: opt, label: String(opt) };

        const isSelected =
          item.value === value ||
          (typeof item.value === 'string' &&
            typeof value === 'string' &&
            item.value.toLowerCase() === value.toLowerCase());

        const optAccessibilityLabel =
          item.accessibilityLabel || item.label || String(item.value);

        return (
          <Pressable
            key={String(item.value)}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            accessibilityLabel={optAccessibilityLabel}
            testID={item.testID || `segmented-option-${item.value}`}
            onPress={() => onChange?.(item.value)}
            style={({ pressed }) => [
              styles.segment,
              { backgroundColor: theme.isDark ? theme.surface : theme.surfaceSunken },
              isSelected && [
                styles.selectedSegment,
                { backgroundColor: theme.accent, shadowColor: theme.accent },
              ],
              {
                opacity: pressed ? (isSelected ? 0.9 : 0.7) : 1,
              },
            ]}
          >
            <Text
              style={[
                styles.label,
                isSelected
                  ? [
                      styles.selectedLabel,
                      { color: theme.onAccent },
                    ]
                  : [
                      styles.unselectedLabel,
                      { color: theme.inkMuted },
                    ],
              ]}
              numberOfLines={1}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export { Segmented };

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    width: '100%',
  },
  segment: {
    flex: 1,
    minHeight: 52,
    minWidth: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  selectedSegment: {
    elevation: 4,
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
  },
  label: {
    fontSize: 16,
    textAlign: 'center',
  },
  selectedLabel: {
    fontFamily: 'Figtree_600SemiBold',
  },
  unselectedLabel: {
    fontFamily: 'Figtree_500Medium',
  },
});
