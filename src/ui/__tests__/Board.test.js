const mockCreatePicture = jest.fn();

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
    RoundedRect: ({ children, ...props }) =>
      React.createElement('RoundedRect', props, children),
    Circle: (props) => React.createElement('Circle', props),
    Line: (props) => React.createElement('Line', props),
    Path: (props) => React.createElement('Path', props),
    Shadow: (props) => React.createElement('Shadow', props),
    Picture: (props) => React.createElement('Picture', props),
    Group: ({ children, ...props }) =>
      React.createElement('Group', props, children),
    createPicture: (...args) => mockCreatePicture(...args),
    Skia: {
      Paint: () => ({
        setColor: jest.fn(),
        setStrokeWidth: jest.fn(),
      }),
      Color: (c) => c,
      RRectXY: (rect, rx, ry) => ({ rect, rx, ry }),
      XYWHRect: (x, y, w, h) => ({ x, y, w, h }),
    },
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Board from '../components/Board';
import Cell from '../components/Cell';
import { resolveTheme } from '../theme';

describe('Board component', () => {
  beforeEach(() => {
    mockCreatePicture.mockReset();
  });

  test('renders well with inner Shadow and 64 debossed socket cells when falling back to plain nodes', () => {
    mockCreatePicture.mockReturnValue(null);
    const theme = resolveTheme('light');

    let tree;
    act(() => {
      tree = renderer.create(<Board board={Array(64).fill(null)} size={320} />);
    });

    const root = tree.root;
    // 1. Well rounded rect
    const roundedRects = root.findAllByType('RoundedRect');
    // First rounded rect is the well (radius 20)
    const well = roundedRects[0];
    expect(well.props.r).toBe(20);
    expect(well.props.color).toBe(theme.well);
    expect(well.props.width).toBe(320);
    expect(well.props.height).toBe(320);

    // Inner shadow child on the well
    const shadows = well.findAllByType('Shadow');
    expect(shadows.length).toBe(1);
    expect(shadows[0].props.dx).toBe(0);
    expect(shadows[0].props.dy).toBe(1.5);
    expect(shadows[0].props.blur).toBe(3);
    expect(shadows[0].props.inner).toBe(true);
    expect(shadows[0].props.color).toBe(theme.wellShadow);

    // 2. 64 socket slots
    // 64 socket rounded rects + 1 well + 1 pulse rect = 66 RoundedRects
    expect(roundedRects.length).toBe(66);
    const socketRects = roundedRects.slice(1, 65);
    expect(socketRects.length).toBe(64);
    for (const sr of socketRects) {
      expect(sr.props.color).toBe(theme.cellEmpty);
      expect(sr.props.r).toBeCloseTo(sr.props.width * 0.16);
    }

    // 64 sockets each have 1 top deboss line and 1 bottom lip line = 128 lines
    const lines = root.findAllByType('Line');
    expect(lines.length).toBe(128);

    const topLines = lines.filter((l) => l.props.color === theme.socketTop);
    const bottomLines = lines.filter((l) => l.props.color === theme.socketBottom);
    expect(topLines.length).toBe(64);
    expect(bottomLines.length).toBe(64);
    for (const tl of topLines) {
      expect(tl.props.strokeWidth).toBe(1);
      expect(tl.props.p2.x).toBeGreaterThan(tl.props.p1.x);
    }
    for (const bl of bottomLines) {
      expect(bl.props.strokeWidth).toBe(1);
      expect(bl.props.p2.x).toBeGreaterThan(bl.props.p1.x);
    }

    act(() => {
      tree.unmount();
    });
  });

  test('records well and sockets as a single Picture when createPicture is supported and available', () => {
    const mockPictureObj = { id: 'memoized-board-picture' };
    mockCreatePicture.mockReturnValue(mockPictureObj);

    let tree;
    act(() => {
      tree = renderer.create(<Board board={Array(64).fill(null)} size={358} />);
    });

    // createPicture was invoked to record well + sockets
    expect(mockCreatePicture).toHaveBeenCalled();
    const calls = mockCreatePicture.mock.calls;
    expect(calls.length).toBe(1);
    expect(calls[0][1]).toEqual({ x: 0, y: 0, width: 358, height: 358 });

    // Drawn as a single <Picture>
    const root = tree.root;
    const pictures = root.findAllByType('Picture');
    expect(pictures.length).toBe(1);
    expect(pictures[0].props.picture.id).toBe('memoized-board-picture');

    // In Picture mode, the 128 plain socket lines and 65 plain rects are replaced by the single Picture
    const lines = root.findAllByType('Line');
    expect(lines.length).toBe(0);

    act(() => {
      tree.unmount();
    });
  });

  test('memoizes createPicture on boardSize and dark mode', () => {
    mockCreatePicture.mockReturnValue({ id: 'pic-1' });

    let tree;
    act(() => {
      tree = renderer.create(<Board board={Array(64).fill(null)} size={320} />);
    });
    expect(mockCreatePicture).toHaveBeenCalledTimes(1);

    // Re-render with same size and theme does not re-record
    act(() => {
      tree.update(<Board board={Array(64).fill(null)} size={320} />);
    });
    expect(mockCreatePicture).toHaveBeenCalledTimes(1);

    // Re-render with different size re-records
    act(() => {
      tree.update(<Board board={Array(64).fill(null)} size={360} />);
    });
    expect(mockCreatePicture).toHaveBeenCalledTimes(2);

    act(() => {
      tree.unmount();
    });
  });

  test('renders filled cells on board on top of well and sockets', () => {
    mockCreatePicture.mockReturnValue(null);
    const board = Array(64).fill(null);
    board[0] = { color: 1, kind: 'normal', hp: 1 };
    board[7] = { color: 3, kind: 'gem', hp: 1 };
    board[15] = { color: 0, kind: 'lock', hp: 2 };

    let tree;
    act(() => {
      tree = renderer.create(<Board board={board} size={320} />);
    });

    const root = tree.root;
    const cells = root.findAllByType(Cell);
    expect(cells.length).toBe(3);
    expect(cells[0].props.color).toBe(1);
    expect(cells[1].props.color).toBe(3);
    expect(cells[2].props.color).toBe(0);

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
