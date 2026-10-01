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
});
