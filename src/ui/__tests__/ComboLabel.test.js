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
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withDelay: (_delay, animation) => animation,
    runOnJS: (fn) => fn,
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import ComboLabel from '../components/ComboLabel';

describe('ComboLabel component', () => {
  test('renders nothing when no combo or combo is 1', () => {
    let tree;
    act(() => {
      tree = renderer.create(<ComboLabel combo={1} />);
    });
    expect(tree.toJSON()).toBeNull();
    act(() => {
      tree.unmount();
    });
  });

  test('renders "x2" when combo prop is 2', () => {
    let tree;
    act(() => {
      tree = renderer.create(<ComboLabel combo={2} />);
    });
    const json = tree.toJSON();
    expect(json).toBeDefined();
    expect(json.props.accessibilityLabel).toBe('Combo x2');

    // Check inner text
    const textNode = json.children[0].children[0];
    expect(textNode.children).toEqual(['x2']);

    act(() => {
      tree.unmount();
    });
  });

  test('renders "x5" when combo prop is 5', () => {
    let tree;
    act(() => {
      tree = renderer.create(<ComboLabel combo={5} />);
    });
    const json = tree.toJSON();
    expect(json).toBeDefined();
    expect(json.props.accessibilityLabel).toBe('Combo x5');

    const textNode = json.children[0].children[0];
    expect(textNode.children).toEqual(['x5']);

    act(() => {
      tree.unmount();
    });
  });

  test('subscribes to controller events and shows combo for count >= 2', () => {
    let listenerCallback;
    const mockSubscribe = jest.fn((cb) => {
      listenerCallback = cb;
      return () => {};
    });

    let tree;
    act(() => {
      tree = renderer.create(<ComboLabel subscribe={mockSubscribe} />);
    });
    expect(tree.toJSON()).toBeNull();

    // Event with combo count 1 -> should still render nothing
    act(() => {
      listenerCallback([{ type: 'combo', count: 1 }]);
    });
    expect(tree.toJSON()).toBeNull();

    // Event with combo count 3 -> should show x3
    act(() => {
      listenerCallback([{ type: 'combo', count: 3 }]);
    });
    expect(tree.toJSON()).toBeDefined();
    expect(tree.toJSON().props.accessibilityLabel).toBe('Combo x3');

    act(() => {
      tree.unmount();
    });
  });

  test('respects reduceMotion prop', () => {
    let tree;
    act(() => {
      tree = renderer.create(<ComboLabel combo={4} reduceMotion={true} />);
    });
    expect(tree.toJSON()).toBeDefined();
    expect(tree.toJSON().props.accessibilityLabel).toBe('Combo x4');

    act(() => {
      tree.unmount();
    });
  });
});
