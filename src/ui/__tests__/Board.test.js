jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View: (props) => React.createElement(View, props),
    },
    useSharedValue: (init) => ({ value: init }),
    useDerivedValue: (fn) => ({ value: fn() }),
    withTiming: (toValue, _config, cb) => {
      if (cb) cb(true);
      return toValue;
    },
    withSequence: (...animations) => animations[animations.length - 1],
    runOnJS: (fn) => fn,
    Easing: {
      linear: (t) => t,
      out: (fn) => fn,
      in: (fn) => fn,
      quad: (t) => t,
    },
  };
});

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  return {
    Canvas: ({ children, style }) =>
      React.createElement('Canvas', { style }, children),
    RoundedRect: (props) => React.createElement('RoundedRect', props),
    Circle: (props) => React.createElement('Circle', props),
    Line: (props) => React.createElement('Line', props),
    Path: (props) => React.createElement('Path', props),
    Group: ({ children, ...props }) =>
      React.createElement('Group', props, children),
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Board from '../components/Board';

describe('Board component', () => {
  test('renders 64 cell slots and empty board', () => {
    let tree;
    act(() => {
      tree = renderer.create(<Board board={Array(64).fill(null)} size={320} />);
    });
    const json = tree.toJSON();
    expect(json).toBeDefined();
    expect(json.type).toBe('Canvas');
    // At least 65 elements (1 well + 64 slots + pulse rect)
    expect(json.children.length).toBeGreaterThanOrEqual(65);

    act(() => {
      tree.unmount();
    });
  });

  test('renders filled cells on board', () => {
    const board = Array(64).fill(null);
    board[0] = { color: 1, kind: 'normal', hp: 1 };
    board[7] = { color: 3, kind: 'gem', hp: 1 };
    board[15] = { color: 0, kind: 'lock', hp: 2 };

    let tree;
    act(() => {
      tree = renderer.create(<Board board={board} size={320} />);
    });
    const json = tree.toJSON();
    expect(json).toBeDefined();

    act(() => {
      tree.unmount();
    });
  });

  test('renders clear wave overlay when clearing description is provided', () => {
    const onClearingComplete = jest.fn();
    const clearing = {
      cells: [
        { index: 0, row: 0, col: 0, color: 1, kind: 'normal', hp: 1, distance: 0 },
        { index: 1, row: 0, col: 1, color: 1, kind: 'normal', hp: 1, distance: 1 },
      ],
      indices: [0, 1],
      centerCell: { row: 0, col: 0, index: 0 },
      center: { row: 0, col: 0 },
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <Board
          board={Array(64).fill(null)}
          clearing={clearing}
          onClearingComplete={onClearingComplete}
          size={320}
        />
      );
    });

    expect(tree.toJSON()).toBeDefined();
    expect(onClearingComplete).toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  test('subscribes to perfectClear events', () => {
    let listener;
    const mockSubscribe = jest.fn((cb) => {
      listener = cb;
      return () => {};
    });

    let tree;
    act(() => {
      tree = renderer.create(
        <Board board={Array(64).fill(null)} subscribe={mockSubscribe} size={320} />
      );
    });

    expect(mockSubscribe).toHaveBeenCalled();
    act(() => {
      listener([{ type: 'perfectClear' }]);
    });

    expect(tree.toJSON()).toBeDefined();

    act(() => {
      tree.unmount();
    });
  });

  test('accepts colorblind prop', () => {
    const board = Array(64).fill(null);
    board[0] = { color: 1, kind: 'normal', hp: 1 };

    let tree;
    act(() => {
      tree = renderer.create(
        <Board board={board} colorblind={true} size={320} />
      );
    });

    expect(tree.toJSON()).toBeDefined();

    act(() => {
      tree.unmount();
    });
  });
});
