import React, { useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  useWindowDimensions,
} from 'react-native';
import { useRouter, useIsFocused } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
import { Canvas, Group } from '@shopify/react-native-skia';
import { useTheme } from '../../src/ui/theme';
import { useProgress } from '../../src/store/useProgress';
import { formatNumber } from '../../src/game/format';
import useReduceMotion from '../../src/ui/useReduceMotion';
import Backdrop from '../../src/ui/components/Backdrop';
import BrandMark from '../../src/ui/components/BrandMark';
import { shadow } from '../../src/ui/components/BottomNav';
import Cell from '../../src/ui/components/Cell';
import Icon from '../../src/ui/components/Icon';
import PressableScale from '../../src/ui/components/PressableScale';
import levelsData from '../../assets/levels/levels.json';

const EASE_OUT = Easing.out(Easing.quad);
// Longer than the stack push transition, so Home never blanks while still visible
const HIDE_AFTER_BLUR_MS = 500;

/** Staggered fade + rise each time Home comes into view. Reduce Motion: fade only, half duration. */
function Rise({ index, children, style }) {
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const t = useSharedValue(0);

  useEffect(() => {
    if (!focused) return undefined;
    t.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(
        reduceMotion ? index * 40 : index * 80,
        withTiming(1, { duration: reduceMotion ? 200 : 420, easing: EASE_OUT })
      )
    );
    return () => {
      // Hide once Home is off screen (after any push transition), so the
      // next focus starts hidden instead of flashing the old frame.
      t.value = withDelay(HIDE_AFTER_BLUR_MS, withTiming(0, { duration: 0 }));
    };
  }, [focused, index, reduceMotion, t]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: t.value,
    transform: [{ translateY: reduceMotion ? 0 : (1 - t.value) * 14 }],
  }));

  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/** Repeats a gentle scale bump every `every` ms. Off under Reduce Motion. */
function Pulse({ every, to, children, style }) {
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const s = useSharedValue(1);

  useEffect(() => {
    if (reduceMotion || !focused) return undefined;
    s.value = withRepeat(
      withSequence(
        withDelay(every, withTiming(to, { duration: 320, easing: EASE_OUT })),
        withTiming(1, { duration: 480, easing: EASE_OUT })
      ),
      -1
    );
    return () => {
      cancelAnimation(s);
      s.value = 1;
    };
  }, [every, to, reduceMotion, focused, s]);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: s.value }] }));
  return <Animated.View style={[style, animatedStyle]}>{children}</Animated.View>;
}

/** Progress bar that fills from 0 each time Home comes into view. */
function ProgressBar({ value, color, track }) {
  const reduceMotion = useReduceMotion();
  const focused = useIsFocused();
  const p = useSharedValue(0);

  useEffect(() => {
    if (!focused) return undefined;
    p.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(
        reduceMotion ? 0 : 500,
        withTiming(value, { duration: reduceMotion ? 200 : 900, easing: EASE_OUT })
      )
    );
    return () => {
      p.value = withDelay(HIDE_AFTER_BLUR_MS, withTiming(0, { duration: 0 }));
    };
  }, [focused, value, reduceMotion, p]);

  const fillStyle = useAnimatedStyle(() => ({ width: `${p.value * 100}%` }));

  return (
    <View style={[styles.track, { backgroundColor: track }]}>
      <Animated.View style={[styles.fill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

/** Two glazed tiles peeking out of a card's bottom-right corner. */
function CornerTiles({ glaze, theme }) {
  const size = 92;
  const tile = 40;
  return (
    <Canvas pointerEvents="none" style={[styles.cornerTiles, { width: size, height: size }]}>
      <Group transform={[{ rotate: -0.22 }]} origin={{ x: size / 2, y: size / 2 }}>
        <Cell x={44} y={10} size={tile} color={glaze} theme={theme} reduceMotion />
        <Cell x={10} y={50} size={tile} color={glaze} theme={theme} reduceMotion />
        <Cell x={54} y={54} size={tile} color={glaze} theme={theme} reduceMotion />
      </Group>
    </Canvas>
  );
}

function ModeCard({ label, title, meta, icon, glaze, theme, onPress, iconPulse, children }) {
  const tint = `${theme.glaze[glaze].base}24`;
  const ink = theme.glaze[glaze][theme.isDark ? 'top' : 'base'];
  const iconNode = <Icon name={icon} size={24} color={ink} strokeWidth={2.4} />;

  return (
    <PressableScale
      accessibilityLabel={label}
      onPress={onPress}
      containerStyle={[styles.modeCardContainer, shadow(theme)]}
      style={[styles.modeCard, { backgroundColor: theme.surface }]}
    >
      <CornerTiles glaze={glaze} theme={theme} />
      <View style={styles.modeTop}>
        <View style={[styles.modeIcon, { backgroundColor: tint }]}>
          {iconPulse ? <Pulse every={3200} to={1.12}>{iconNode}</Pulse> : iconNode}
        </View>
        <View style={[styles.chevron, { backgroundColor: tint }]}>
          <Icon name="chevron-right" size={16} color={ink} strokeWidth={2.6} />
        </View>
      </View>
      <Text style={[styles.modeTitle, { color: theme.ink }]}>{title}</Text>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.85}
        style={[styles.modeMeta, { color: theme.inkMuted }]}
      >
        {meta}
      </Text>
      {children}
    </PressableScale>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const stats = useProgress((s) => s.stats);
  const adventure = useProgress((s) => s.adventure);

  // iPhone SE / small Android: shrink the brand so everything fits above the nav
  const compact = height < 760;

  const streak = stats?.currentStreak ?? 0;
  const best = stats?.bestScore?.classic ?? 0;
  const totalLevels = levelsData.length;
  const level = Math.min(adventure?.unlocked ?? 1, totalLevels);
  const maxStars = totalLevels * 3;
  const stars = Object.values(adventure?.stars ?? {}).reduce((sum, n) => sum + (n || 0), 0);

  return (
    <View style={[styles.root, { backgroundColor: theme.bgDeep }]}>
      <Backdrop />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + (compact ? 8 : 16), gap: compact ? 14 : 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <PressableScale
          accessibilityLabel="Open Settings"
          onPress={() => router.push('/settings')}
          containerStyle={[styles.gearContainer, { top: insets.top + 8 }, shadow(theme)]}
          style={[styles.gear, { backgroundColor: theme.surface }]}
          pressedScale={0.9}
        >
          <Icon name="settings" size={24} color={theme.ink} />
        </PressableScale>

        <Rise index={0} style={styles.brand}>
          <BrandMark tileSize={compact ? 40 : 50} fontSize={compact ? 42 : 52} />
          <Text style={[styles.subtitle, { color: theme.inkMuted }]}>
            Calm, tactile block puzzle
          </Text>
        </Rise>

        <Rise index={1} style={styles.pills}>
          <View
            accessible
            accessibilityLabel={streak > 0 ? `${streak} day streak` : 'No streak yet'}
            style={[styles.pill, { backgroundColor: theme.surface }, shadow(theme)]}
          >
            <Text style={styles.pillEmoji}>🔥</Text>
            <Text numberOfLines={1} style={[styles.pillText, { color: theme.ink }]}>
              {streak > 0 ? `${streak} day streak` : 'Start a streak'}
            </Text>
          </View>
          <View
            accessible
            accessibilityLabel={`Best Classic score ${formatNumber(best)}`}
            style={[styles.pill, { backgroundColor: theme.surface }, shadow(theme)]}
          >
            <Text style={styles.pillEmoji}>🏆</Text>
            <Text numberOfLines={1} style={[styles.pillText, { color: theme.ink }]}>
              {`Best ${formatNumber(best)}`}
            </Text>
          </View>
        </Rise>

        <Rise index={2}>
          <PressableScale
            accessibilityLabel="Play Classic mode"
            onPress={() => router.push('/classic')}
            containerStyle={[styles.heroContainer, shadow(theme)]}
            style={[
              styles.hero,
              { backgroundColor: theme.accent, minHeight: compact ? 132 : 156 },
            ]}
          >
            <View pointerEvents="none" style={[styles.heroBlock, styles.heroBlockA]} />
            <View pointerEvents="none" style={[styles.heroBlock, styles.heroBlockB]} />
            <View pointerEvents="none" style={[styles.heroBlock, styles.heroBlockC]} />
            <View style={styles.heroText}>
              <Icon name="infinity" size={44} color={theme.onAccent} strokeWidth={2.8} />
              <View>
                <Text style={[styles.heroTitle, { color: theme.onAccent }]}>Play Classic</Text>
                <Text style={[styles.heroSub, { color: theme.onAccent, opacity: 0.8 }]}>
                  Endless relaxing puzzle
                </Text>
              </View>
            </View>
            <Pulse every={2800} to={1.07} style={styles.playWrap}>
              <View style={[styles.play, { backgroundColor: theme.surface }]}>
                <Icon name="play" size={26} color={theme.accent} fill style={styles.playIcon} />
              </View>
            </Pulse>
          </PressableScale>
        </Rise>

        <Rise index={3} style={styles.modes}>
          <ModeCard
            label="Play Blitz mode"
            title="Blitz"
            meta="90 second rush"
            icon="timer"
            glaze={2}
            theme={theme}
            iconPulse
            onPress={() => router.push('/blitz')}
          />
          <ModeCard
            label="Play Adventure mode"
            title="Adventure"
            meta={`Level ${level} · ${stars}/${maxStars} ★`}
            icon="flag"
            glaze={1}
            theme={theme}
            onPress={() => router.push('/adventure')}
          >
            <ProgressBar
              value={maxStars ? stars / maxStars : 0}
              color={theme.glaze[1].base}
              track={theme.surfaceSunken}
            />
          </ModeCard>
        </Rise>
      </ScrollView>

    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingBottom: 16,
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
  },
  gearContainer: {
    position: 'absolute',
    right: 20,
    zIndex: 1,
    borderRadius: 24,
  },
  gear: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brand: {
    alignItems: 'center',
  },
  subtitle: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    marginTop: 2,
  },
  pills: {
    flexDirection: 'row',
    gap: 12,
  },
  pill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  pillEmoji: {
    fontSize: 18,
  },
  pillText: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 15,
    flexShrink: 1,
  },
  heroContainer: {
    borderRadius: 24,
  },
  hero: {
    borderRadius: 24,
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  heroBlock: {
    position: 'absolute',
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.13)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.18)',
  },
  heroBlockA: {
    width: 72,
    height: 72,
    right: 96,
    top: -14,
    transform: [{ rotate: '14deg' }],
  },
  heroBlockB: {
    width: 84,
    height: 84,
    right: -22,
    top: -30,
    transform: [{ rotate: '-10deg' }],
  },
  heroBlockC: {
    width: 76,
    height: 76,
    right: 72,
    bottom: -44,
    transform: [{ rotate: '22deg' }],
  },
  heroText: {
    flex: 1,
    alignSelf: 'stretch',
    justifyContent: 'space-between',
    gap: 12,
  },
  heroTitle: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 26,
    letterSpacing: -0.5,
  },
  heroSub: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    marginTop: 2,
  },
  playWrap: {
    marginLeft: 12,
  },
  play: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0px 6px 16px rgba(14, 18, 24, 0.18)',
  },
  playIcon: {
    marginLeft: 3,
  },
  modes: {
    flexDirection: 'row',
    gap: 12,
  },
  modeCardContainer: {
    flex: 1,
    borderRadius: 22,
  },
  modeCard: {
    flex: 1,
    borderRadius: 22,
    overflow: 'hidden',
    padding: 16,
    minHeight: 136,
  },
  cornerTiles: {
    position: 'absolute',
    right: -22,
    bottom: -22,
  },
  modeTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  modeIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chevron: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modeTitle: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  modeMeta: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 14,
    marginTop: 4,
  },
  track: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    marginRight: 36,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 4,
  },
});
