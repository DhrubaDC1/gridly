jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const makeFromSVGString = jest.fn((str) => ({
    __type: 'SkPath',
    svgString: str,
  }));
  return {
    Canvas: ({ children, style }) =>
      React.createElement('Canvas', { style }, children),
    Path: (props) => React.createElement('Path', props),
    Group: ({ children, ...props }) =>
      React.createElement('Group', props, children),
    Skia: {
      Path: {
        MakeFromSVGString: makeFromSVGString,
      },
    },
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import icons, { icons as namedIcons } from '../icons';
import Icon, { parsedIcons } from '../components/Icon';

const EXPECTED_ICON_NAMES = [
  'arrow-left',
  'pause',
  'play',
  'rotate-ccw',
  'house',
  'trophy',
  'award',
  'chart-column',
  'settings',
  'user',
  'star',
  'lock',
  'check',
  'timer',
  'map',
  'volume-2',
  'vibrate',
  'eye',
  'sparkles',
  'zap',
  'flame',
  'palette',
  'grid-3x3',
  'rows-3',
  'arrow-left-right',
  'gem',
  'footprints',
];

describe('Icon system', () => {
  describe('icons.js catalog', () => {
    test('exports both named and default icons object', () => {
      expect(icons).toBeDefined();
      expect(namedIcons).toBe(icons);
      expect(typeof icons).toBe('object');
    });

    test('contains all 27 expected icon names', () => {
      for (const name of EXPECTED_ICON_NAMES) {
        expect(icons).toHaveProperty(name);
      }
      expect(Object.keys(icons).length).toBe(EXPECTED_ICON_NAMES.length);
    });

    test.each(EXPECTED_ICON_NAMES)(
      'icon "%s" resolves to at least one valid path string',
      (name) => {
        const pathStrings = icons[name];
        expect(Array.isArray(pathStrings)).toBe(true);
        expect(pathStrings.length).toBeGreaterThanOrEqual(1);

        for (const p of pathStrings) {
          expect(typeof p).toBe('string');
          expect(p.trim().length).toBeGreaterThan(0);
          expect(p).not.toContain('NaN');
          expect(p).not.toContain('undefined');
          // Starts with a valid SVG path command (e.g. M, m, etc.)
          expect(p.trim()).toMatch(/^[a-zA-Z]/);
        }
      }
    );
  });

  describe('Icon component', () => {
    test('parses paths at module load with Skia.Path.MakeFromSVGString', () => {
      // Skia.Path.MakeFromSVGString should have been called for every path in the catalog
      let totalPaths = 0;
      for (const list of Object.values(icons)) {
        totalPaths += list.length;
      }
      const { Skia } = require('@shopify/react-native-skia');
      expect(Skia.Path.MakeFromSVGString).toHaveBeenCalledTimes(totalPaths);

      for (const name of EXPECTED_ICON_NAMES) {
        expect(parsedIcons[name]).toBeDefined();
        expect(parsedIcons[name].length).toBe(icons[name].length);
      }
    });

    test('renders a Skia Canvas of size by size with accessible={false} wrapper', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <Icon name="arrow-left" size={24} color="#1B1F2A" strokeWidth={2} />
        );
      });

      const root = tree.toJSON();
      expect(root).toBeDefined();
      // Wrapper View
      expect(root.props.accessible).toBe(false);
      expect(root.props.style).toEqual(
        expect.arrayContaining([{ width: 24, height: 24 }])
      );

      // Canvas inside
      const canvas = root.children[0];
      expect(canvas.type).toBe('Canvas');
      expect(canvas.props.style).toEqual({ width: 24, height: 24 });

      // Group scaling from 24-unit grid: scale = 24 / 24 = 1
      const group = canvas.children[0];
      expect(group.type).toBe('Group');
      expect(group.props.transform).toEqual([{ scale: 1 }]);

      // Path children drawn as stroked paths with round caps and joins
      const paths = group.children;
      expect(paths.length).toBe(icons['arrow-left'].length);
      for (const pathNode of paths) {
        expect(pathNode.type).toBe('Path');
        expect(pathNode.props.style).toBe('stroke');
        expect(pathNode.props.strokeWidth).toBe(2);
        expect(pathNode.props.strokeCap).toBe('round');
        expect(pathNode.props.strokeJoin).toBe('round');
        expect(pathNode.props.color).toBe('#1B1F2A');
      }
    });

    test('scales 24-unit paths correctly for custom size', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <Icon name="pause" size={36} color="#FF0000" strokeWidth={3} />
        );
      });

      const root = tree.toJSON();
      expect(root.props.style).toEqual(
        expect.arrayContaining([{ width: 36, height: 36 }])
      );

      const canvas = root.children[0];
      expect(canvas.props.style).toEqual({ width: 36, height: 36 });

      const group = canvas.children[0];
      expect(group.props.transform).toEqual([{ scale: 36 / 24 }]);

      for (const p of group.children) {
        expect(p.props.strokeWidth).toBe(3);
        expect(p.props.color).toBe('#FF0000');
        expect(p.props.style).toBe('stroke');
      }
    });

    test('draws star icon filled', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <Icon name="star" size={20} color="#F2B33D" />
        );
      });

      const root = tree.toJSON();
      const canvas = root.children[0];
      const group = canvas.children[0];
      const starPath = group.children[0];

      expect(starPath.type).toBe('Path');
      expect(starPath.props.style).toBe('fill');
      expect(starPath.props.color).toBe('#F2B33D');
      expect(starPath.props.strokeCap).toBeUndefined();
      expect(starPath.props.strokeJoin).toBeUndefined();
    });

    test('returns null for unknown icon name', () => {
      let tree;
      act(() => {
        tree = renderer.create(<Icon name="nonexistent-icon-xyz" />);
      });
      expect(tree.toJSON()).toBeNull();
    });
  });
});
