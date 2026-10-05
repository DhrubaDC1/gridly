import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import Icon from './Icon';
import PressableScale from './PressableScale';
import { useTheme } from '../theme';
import useReduceMotion from '../useReduceMotion';

/**
 * @typedef {Object} NavItem
 * @property {string} key
 * @property {string} label
 * @property {string} icon - name from icons.js
 * @property {string} accessibilityLabel
 * @property {() => void} [onPress]
 * @property {boolean} [soon] - shows a "Soon" chip under the label
 */

function NavButton({ item, active, theme, reduceMotion }) {
  const on = useSharedValue(active && reduceMotion ? 1 : 0);

  useEffect(() => {
    if (reduceMotion) on.value = withTiming(active ? 1 : 0, { duration: 100 });
    else if (active) on.value = withSpring(1, { damping: 14, stiffness: 180 });
    else on.value = withTiming(0, { duration: 140 });
  }, [active, reduceMotion, on]);

  const haloStyle = useAnimatedStyle(() => ({
    opacity: on.value,
    transform: [{ scale: 0.6 + 0.4 * on.value }],
  }));

  const color = active ? theme.accentInk : theme.inkMuted;

  return (
    <PressableScale
      accessibilityLabel={item.accessibilityLabel}
      accessibilityState={{ selected: active }}
      onPress={item.onPress}
      containerStyle={styles.item}
      style={styles.itemInner}
      pressedScale={0.92}
    >
      <View style={styles.iconWrap}>
        <Animated.View
          style={[styles.halo, { backgroundColor: theme.accentSoft }, haloStyle]}
        />
        <Icon name={item.icon} size={24} color={color} />
      </View>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.75}
        style={[
          styles.label,
          { color, fontFamily: active ? 'Figtree_600SemiBold' : 'Figtree_500Medium' },
        ]}
      >
        {item.label}
      </Text>
      {item.soon ? (
        <View style={[styles.soon, { backgroundColor: theme.surfaceSunken }]}>
          <Text style={[styles.soonText, { color: theme.inkMuted }]}>Soon</Text>
        </View>
      ) : active ? (
        <View style={[styles.dot, { backgroundColor: theme.accentInk }]} />
      ) : null}
    </PressableScale>
  );
}

/**
 * Floating tab bar card for Home.
 *
 * @param {Object} props
 * @param {NavItem[]} props.items
 * @param {string} props.activeKey
 * @param {any} [props.style]
 */
export default function BottomNav({ items, activeKey, style }) {
  const theme = useTheme();
  const reduceMotion = useReduceMotion();

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.bar, { backgroundColor: theme.surface }, shadow(theme), style]}
    >
      {items.map((item) => (
        <NavButton
          key={item.key}
          item={item}
          active={item.key === activeKey}
          theme={theme}
          reduceMotion={reduceMotion}
        />
      ))}
    </View>
  );
}

/** Soft, diffused card shadow shared by Home surfaces. */
export function shadow(theme) {
  return {
    boxShadow: theme.isDark
      ? '0px 8px 24px rgba(0, 0, 0, 0.35)'
      : '0px 8px 24px rgba(27, 29, 43, 0.07)',
  };
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    borderRadius: 24,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  item: {
    flex: 1,
  },
  itemInner: {
    alignItems: 'center',
    minHeight: 64,
    paddingHorizontal: 2,
  },
  iconWrap: {
    width: 44,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: {
    position: 'absolute',
    width: 44,
    height: 36,
    borderRadius: 18,
  },
  label: {
    fontSize: 12,
    marginTop: 4,
    maxWidth: '100%',
  },
  soon: {
    marginTop: 4,
    paddingHorizontal: 8,
    paddingVertical: 1,
    borderRadius: 999,
  },
  soonText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 10,
  },
  dot: {
    marginTop: 6,
    width: 5,
    height: 5,
    borderRadius: 3,
  },
});
