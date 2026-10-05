import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import {
  BlurMask,
  Canvas,
  Circle,
  Group,
  Line,
  Path,
  RoundedRect,
  LinearGradient,
  vec,
} from '@shopify/react-native-skia';
import { useTheme } from '../theme';
import iconsSolid from '../iconsSolid';
import BackButton from './BackButton';
import Cell from './Cell';

const ART_W = 140;
const ART_H = 120;
const TILE = 46;

function Tile({ glaze, x, y, deg = 0, size = TILE, theme }) {
  return (
    <Group
      origin={{ x: x + size / 2, y: y + size / 2 }}
      transform={[{ rotate: (deg * Math.PI) / 180 }]}
    >
      <Cell x={x} y={y} size={size} color={glaze} theme={theme} reduceMotion />
    </Group>
  );
}

// Glazed bar: darker lip under a top-to-base gradient body
function Bar({ glaze, x, y, w, h, theme }) {
  const g = theme.glaze[glaze];
  return (
    <Group>
      <RoundedRect x={x} y={y + 3} width={w} height={h} r={7} color={g.edge} />
      <RoundedRect x={x} y={y} width={w} height={h} r={7}>
        <LinearGradient start={vec(x, y)} end={vec(x, y + h)} colors={[g.top, g.base]} />
      </RoundedRect>
      <RoundedRect x={x + 5} y={y + 5} width={w - 16} height={4} r={2} color={theme.glazeFx.glint} />
    </Group>
  );
}

// Soft blurred puffs behind the art
function Cloud({ puffs, theme }) {
  const color = theme.isDark ? theme.spotlight : theme.surface;
  return (
    <Group opacity={theme.isDark ? 0.8 : 0.9}>
      <BlurMask blur={6} style="normal" />
      {puffs.map(([cx, cy, r], i) => (
        <Circle key={i} cx={cx} cy={cy} r={r} color={color} />
      ))}
    </Group>
  );
}

const ART = {
  settings: (theme) => (
    <>
      <Cloud puffs={[[30, 70, 26], [62, 52, 30], [104, 40, 24]]} theme={theme} />
      <Tile glaze={0} x={56} y={6} deg={12} size={44} theme={theme} />
      <Tile glaze={3} x={78} y={52} deg={-10} size={44} theme={theme} />
      <Tile glaze={1} x={22} y={64} deg={-16} size={42} theme={theme} />
    </>
  ),
  achievements: (theme) => (
    <>
      <Cloud puffs={[[34, 74, 26], [68, 64, 30], [110, 84, 22]]} theme={theme} />
      <Tile glaze={3} x={40} y={14} deg={14} size={50} theme={theme} />
      <Circle cx={108} cy={84} r={15} color={theme.isDark ? theme.surface : theme.bg} />
      <Group transform={[{ translateX: 98 }, { translateY: 74 }, { scale: 0.85 }]}>
        <Path path={iconsSolid.star[0]} color={theme.star} />
      </Group>
    </>
  ),
  adventure: (theme) => (
    <>
      <Cloud puffs={[[26, 84, 22], [60, 76, 30], [96, 96, 26]]} theme={theme} />
      <Path path="M0 120 C30 82 70 74 140 104 L140 120 Z" color={`${theme.glaze[1].base}33`} />
      <Line p1={vec(46, 18)} p2={vec(50, 84)} color={theme.glaze[2].edge} strokeWidth={6} strokeCap="round" />
      <Path path="M45 14 C60 6 74 22 94 12 L90 42 C72 52 62 34 47 42 Z" color={theme.glaze[2].base} />
      <Tile glaze={1} x={76} y={58} deg={-14} size={44} theme={theme} />
    </>
  ),
  stats: (theme) => (
    <>
      <Cloud puffs={[[30, 84, 24], [70, 70, 34], [112, 82, 22]]} theme={theme} />
      <Bar glaze={1} x={14} y={70} w={28} h={34} theme={theme} />
      <Bar glaze={0} x={46} y={24} w={30} h={80} theme={theme} />
      <Bar glaze={3} x={80} y={54} w={30} h={50} theme={theme} />
    </>
  ),
};

/**
 * Big-title screen header: optional back arrow, Unbounded title, subtitle and glazed art.
 *
 * @param {Object} props
 * @param {string} props.title
 * @param {React.ReactNode} [props.subtitle] - string or custom node under the title
 * @param {'settings' | 'achievements' | 'adventure' | 'stats'} [props.art]
 * @param {boolean} [props.back=true]
 */
export default function ScreenHeader({ title, subtitle, art, back = true }) {
  const theme = useTheme();

  return (
    <View>
      {back ? <BackButton style={styles.back} /> : null}
      <View style={styles.row}>
        <View style={styles.text}>
          <Text
            accessibilityRole="header"
            style={[styles.title, { color: theme.ink }]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {title}
          </Text>
          {typeof subtitle === 'string' ? (
            <Text style={[styles.subtitle, { color: theme.inkMuted }]}>{subtitle}</Text>
          ) : (
            subtitle
          )}
        </View>
        {art ? (
          <Canvas style={styles.art} accessible={false}>
            {ART[art](theme)}
          </Canvas>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  back: {
    marginLeft: -4,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    flexShrink: 1,
    gap: 4,
    paddingLeft: 4,
  },
  title: {
    fontFamily: 'Unbounded_700Bold',
    fontSize: 40,
    letterSpacing: -1,
  },
  subtitle: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 16,
  },
  art: {
    width: ART_W,
    height: ART_H,
    marginRight: -8,
  },
});
