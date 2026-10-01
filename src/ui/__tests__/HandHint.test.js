jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View: (props) => React.createElement(View, props),
    },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (fn) => fn(),
    withRepeat: (anim) => anim,
    withSequence: (...anims) => anims[0],
    withTiming: (toValue) => toValue,
    withDelay: (_delay, anim) => anim,
    cancelAnimation: jest.fn(),
    Easing: {
      inOut: jest.fn(() => jest.fn()),
      cubic: jest.fn(),
    },
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import HandHint from '../components/HandHint';

describe('HandHint component', () => {
  it('renders nothing when visible is false', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HandHint
          visible={false}
          startPos={{ x: 100, y: 300 }}
          endPos={{ x: 200, y: 150 }}
        />
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('renders nothing when startPos or endPos is missing', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HandHint
          visible={true}
          startPos={null}
          endPos={{ x: 200, y: 150 }}
        />
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('renders a circle with pointerEvents="none" and no text when visible with valid coordinates', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HandHint
          visible={true}
          startPos={{ x: 100, y: 300 }}
          endPos={{ x: 250, y: 200 }}
          theme={{ accent: '#3F5FA8' }}
        />
      );
    });

    const json = tree.toJSON();
    expect(json).toBeDefined();
    expect(json.props.pointerEvents).toBe('none');

    // Ensure there is absolutely no Text rendered
    const root = tree.root;
    const texts = root.findAllByType('Text');
    expect(texts).toHaveLength(0);
  });

  it('uses theme.onAccent for border and inner dot in dark and light modes', () => {
    const { resolveTheme } = require('../theme');
    const { StyleSheet } = require('react-native');
    const darkTheme = resolveTheme('dark', 'dark');
    const lightTheme = resolveTheme('light', 'light');

    // Dark mode: onAccent is #0E1218
    let darkTree;
    act(() => {
      darkTree = renderer.create(
        <HandHint
          visible={true}
          startPos={{ x: 100, y: 300 }}
          endPos={{ x: 250, y: 200 }}
          theme={darkTheme}
        />
      );
    });
    const darkCircle = darkTree.root.findByProps({ testID: 'hand-hint' });
    const darkCircleStyle = StyleSheet.flatten(darkCircle.props.style);
    expect(darkCircleStyle.borderColor).toBe(darkTheme.onAccent);
    expect(darkCircleStyle.borderColor).toBe('#0E1218');

    const darkInnerDot = darkTree.root.findByProps({ testID: 'hand-hint-dot' });
    const darkInnerDotStyle = StyleSheet.flatten(darkInnerDot.props.style);
    expect(darkInnerDotStyle.backgroundColor).toBe(darkTheme.onAccent);
    expect(darkInnerDotStyle.backgroundColor).toBe('#0E1218');

    // Light mode: onAccent is #FFFFFF
    let lightTree;
    act(() => {
      lightTree = renderer.create(
        <HandHint
          visible={true}
          startPos={{ x: 100, y: 300 }}
          endPos={{ x: 250, y: 200 }}
          theme={lightTheme}
        />
      );
    });
    const lightCircle = lightTree.root.findByProps({ testID: 'hand-hint' });
    const lightCircleStyle = StyleSheet.flatten(lightCircle.props.style);
    expect(lightCircleStyle.borderColor).toBe(lightTheme.onAccent);
    expect(lightCircleStyle.borderColor).toBe('#FFFFFF');

    const lightInnerDot = lightTree.root.findByProps({ testID: 'hand-hint-dot' });
    const lightInnerDotStyle = StyleSheet.flatten(lightInnerDot.props.style);
    expect(lightInnerDotStyle.backgroundColor).toBe(lightTheme.onAccent);
    expect(lightInnerDotStyle.backgroundColor).toBe('#FFFFFF');
  });
});
