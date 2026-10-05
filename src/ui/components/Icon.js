import React from 'react';
import { View } from 'react-native';
import { Canvas, Path, Group, Skia } from '@shopify/react-native-skia';
import icons from '../icons';
import iconsSolid from '../iconsSolid';

function parse(d) {
  if (typeof Skia !== 'undefined' && Skia?.Path?.MakeFromSVGString) {
    const parsed = Skia.Path.MakeFromSVGString(d);
    if (parsed) return parsed;
  }
  return d;
}

// Parse each path once at module load with Skia.Path.MakeFromSVGString
const parsedIcons = {};

for (const [name, pathStrings] of Object.entries(icons)) {
  parsedIcons[name] = pathStrings.map(parse);
}

// Solid set: { path, stroke } where '~'-prefixed strings are stroked
const parsedSolid = {};

for (const [name, pathStrings] of Object.entries(iconsSolid)) {
  parsedSolid[name] = pathStrings.map((d) =>
    d.startsWith('~') ? { path: parse(d.slice(1)), stroke: true } : { path: parse(d), stroke: false }
  );
}

/**
 * Dependency-free icon component using Skia.
 *
 * @param {Object} props
 * @param {string} props.name - Name of the icon
 * @param {number} [props.size=24] - Size of the icon in dp (square)
 * @param {string} [props.color='#000000'] - Stroke/fill color
 * @param {number} [props.strokeWidth=2] - Stroke width for stroked icons
 * @param {boolean} [props.fill=false] - Fill paths instead of stroking (star always fills)
 * @param {boolean} [props.solid=false] - Use the solid set (src/ui/iconsSolid.js) instead
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.style] - Optional wrapper style
 */
export default function Icon({
  name,
  size = 24,
  color = '#000000',
  strokeWidth = 2,
  fill = false,
  solid = false,
  style,
}) {
  if (solid) {
    const solidPaths = parsedSolid[name];
    if (!solidPaths) return null;
    return (
      <View accessible={false} style={[{ width: size, height: size }, style]}>
        <Canvas style={{ width: size, height: size }}>
          <Group transform={[{ scale: size / 24 }]}>
            {solidPaths.map(({ path, stroke }, index) => (
              <Path
                key={index}
                path={path}
                color={color}
                style={stroke ? 'stroke' : 'fill'}
                fillType="evenOdd"
                strokeWidth={stroke ? 2.4 : undefined}
                strokeCap="round"
                strokeJoin="round"
              />
            ))}
          </Group>
        </Canvas>
      </View>
    );
  }

  const paths = parsedIcons[name];
  if (!paths || paths.length === 0) {
    return null;
  }

  const scale = size / 24;
  const isStar = fill || name === 'star';
  const resolvedColor = color || '#000000';

  return (
    <View
      accessible={false}
      style={[{ width: size, height: size }, style]}
    >
      <Canvas style={{ width: size, height: size }}>
        <Group transform={[{ scale }]}>
          {paths.map((p, index) => (
            <Path
              key={index}
              path={p}
              color={resolvedColor}
              style={isStar ? 'fill' : 'stroke'}
              strokeWidth={isStar ? undefined : strokeWidth}
              strokeCap={isStar ? undefined : 'round'}
              strokeJoin={isStar ? undefined : 'round'}
            />
          ))}
        </Group>
      </Canvas>
    </View>
  );
}

export { parsedIcons, parsedSolid };
