jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const { View, TextInput } = require('react-native');
  return {
    __esModule: true,
    default: {
      View: (props) => React.createElement(View, props),
      createAnimatedComponent: (Comp) => Comp,
    },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedProps: (fn) => fn(),
    useAnimatedStyle: (fn) => fn(),
    useDerivedValue: (fn) => ({ value: fn() }),
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withDelay: (_delay, animation) => animation,
    withSequence: (...animations) => animations[animations.length - 1],
    runOnJS: (fn) => fn,
    Easing: {
      linear: (t) => t,
      out: (fn) => fn,
      in: (fn) => fn,
      quad: (t) => t,
      cubic: (t) => t,
    },
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ScoreTicker, { formatScore } from '../components/ScoreTicker';

describe('ScoreTicker component', () => {
  describe('formatScore', () => {
    test('formats integers with comma separators', () => {
      expect(formatScore(0)).toBe('0');
      expect(formatScore(42)).toBe('42');
      expect(formatScore(100)).toBe('100');
      expect(formatScore(12480)).toBe('12,480');
      expect(formatScore(1000000)).toBe('1,000,000');
    });

    test('handles floats, NaN, and null safely', () => {
      expect(formatScore(123.4)).toBe('123');
      expect(formatScore(123.6)).toBe('124');
      expect(formatScore(NaN)).toBe('0');
      expect(formatScore(null)).toBe('0');
      expect(formatScore(undefined)).toBe('0');
    });
  });

  describe('rendering', () => {
    test('renders with initial score', () => {
      let tree;
      act(() => {
        tree = renderer.create(<ScoreTicker score={12480} />);
      });
      const json = tree.toJSON();
      expect(json).toBeDefined();
      expect(json.props.defaultValue).toBe('12,480');
      expect(json.props.editable).toBe(false);
      expect(json.props.accessibilityLabel).toBe('Score: 12480');
      act(() => {
        tree.unmount();
      });
    });

    test('renders with zero score', () => {
      let tree;
      act(() => {
        tree = renderer.create(<ScoreTicker score={0} />);
      });
      const json = tree.toJSON();
      expect(json).toBeDefined();
      expect(json.props.defaultValue).toBe('0');
      act(() => {
        tree.unmount();
      });
    });

    test('respects custom color and reduceMotion prop', () => {
      let tree;
      act(() => {
        tree = renderer.create(
          <ScoreTicker score={500} color="#FF0000" reduceMotion={true} />
        );
      });
      const json = tree.toJSON();
      expect(json).toBeDefined();
      expect(json.props.defaultValue).toBe('500');
      act(() => {
        tree.unmount();
      });
    });

    test('renders with letterSpacing: -0.5 in default style', () => {
      let tree;
      act(() => {
        tree = renderer.create(<ScoreTicker score={12480} />);
      });
      const { StyleSheet } = require('react-native');
      const json = tree.toJSON();
      const flatStyle = StyleSheet.flatten(json.props.style);
      expect(flatStyle.letterSpacing).toBe(-0.5);
      act(() => {
        tree.unmount();
      });
    });
  });
});
