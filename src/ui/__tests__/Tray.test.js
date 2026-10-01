// Mock react-native-reanimated
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
    runOnJS: (fn) => fn,
  };
});

// Mock react-native-gesture-handler
const capturedGestures = [];
jest.mock('react-native-gesture-handler', () => {
  return {
    GestureDetector: ({ children, gesture }) => {
      capturedGestures.push(gesture);
      return children;
    },
    Gesture: {
      Pan: () => {
        let isEnabled = true;
        let beginCb = null;
        let updateCb = null;
        let endCb = null;
        let finalizeCb = null;

        const pan = {
          enabled: (val) => {
            isEnabled = val;
            return pan;
          },
          minDistance: () => pan,
          onBegin: (cb) => {
            beginCb = cb;
            return pan;
          },
          onUpdate: (cb) => {
            updateCb = cb;
            return pan;
          },
          onEnd: (cb) => {
            endCb = cb;
            return pan;
          },
          onFinalize: (cb) => {
            finalizeCb = cb;
            return pan;
          },
          _getHandlers: () => ({ isEnabled, beginCb, updateCb, endCb, finalizeCb }),
        };
        return pan;
      },
    },
  };
});

// Mock Skia Canvas and components
jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  return {
    Canvas: ({ children, style }) =>
      React.createElement('Canvas', { style }, children),
    RoundedRect: (props) => React.createElement('RoundedRect', props),
    Circle: (props) => React.createElement('Circle', props),
    Line: (props) => React.createElement('Line', props),
    Path: (props) => React.createElement('Path', props),
    Group: ({ children, opacity }) =>
      React.createElement('Group', { opacity }, children),
  };
});

import React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import Tray from '../components/Tray';
import TraySlot from '../components/TraySlot';
import { resolveTheme } from '../theme';

describe('Tray and TraySlot components', () => {
  const theme = resolveTheme('light');
  const mockGhost = {
    ghostX: { value: 0 },
    ghostY: { value: 0 },
    ghostOpacity: { value: 0 },
    setActiveGhostPiece: jest.fn(),
  };

  const samplePiece = {
    id: 'line_1x2',
    color: 0,
    cells: [
      [0, 0],
      [0, 1],
    ],
  };

  const mockSharedOffset = { value: 0 };
  const mockBoardRef = { current: Array(64).fill(null) };

  beforeEach(() => {
    capturedGestures.length = 0;
    jest.clearAllMocks();
  });

  test('renders 3 TraySlot components', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <Tray
          pieces={[samplePiece, null, null]}
          boardSize={320}
          board={Array(64).fill(null)}
          ghost={mockGhost}
          onPlace={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const slots = root.findAllByType(TraySlot.type);
    expect(slots).toHaveLength(3);
  });

  test('TraySlot disables pan gesture when piece is null', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={null}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const lastGesture = capturedGestures[capturedGestures.length - 1];
    expect(lastGesture).toBeDefined();
    expect(lastGesture._getHandlers().isEnabled).toBe(false);
  });

  test('TraySlot enables pan gesture when piece is provided', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={samplePiece}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const lastGesture = capturedGestures[capturedGestures.length - 1];
    expect(lastGesture).toBeDefined();
    expect(lastGesture._getHandlers().isEnabled).toBe(true);
  });

  test('re-rendering TraySlot with the same piece does not recreate pan gesture', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={samplePiece}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={mockBoardRef}
          slotBoardOffsetX={mockSharedOffset}
          slotBoardOffsetY={mockSharedOffset}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const initialGesture = capturedGestures[capturedGestures.length - 1];

    // Re-render with a new object containing identical id and color
    act(() => {
      tree.update(
        <TraySlot
          slotIndex={0}
          piece={{ ...samplePiece }}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={mockBoardRef}
          slotBoardOffsetX={mockSharedOffset}
          slotBoardOffsetY={mockSharedOffset}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const updatedGesture = capturedGestures[capturedGestures.length - 1];
    // Gesture reference should remain identical across re-renders
    expect(updatedGesture).toBe(initialGesture);
  });

  test('drag start calls setActiveGhostPiece with piece', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={samplePiece}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const gesture = capturedGestures[capturedGestures.length - 1];
    const { beginCb } = gesture._getHandlers();

    expect(beginCb).toBeDefined();
    act(() => {
      beginCb({ x: 40, y: 48 });
    });

    expect(mockGhost.setActiveGhostPiece).toHaveBeenCalledWith(samplePiece);
  });

  test('drag start calls onPickup callback if provided', () => {
    const mockOnPickup = jest.fn();
    act(() => {
      renderer.create(
        <TraySlot
          slotIndex={0}
          piece={samplePiece}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          onPickup={mockOnPickup}
          theme={theme}
        />
      );
    });

    const gesture = capturedGestures[capturedGestures.length - 1];
    const { beginCb } = gesture._getHandlers();
    act(() => {
      beginCb({ x: 40, y: 48 });
    });

    expect(mockOnPickup).toHaveBeenCalledTimes(1);
  });

  test('TraySlot has idle elevation of 0 so no Android shadow appears', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={samplePiece}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const views = root.findAllByType(require('react-native').View);
    // Find the slotWrapper (the outermost View inside GestureDetector)
    const slotWrapper = views[0];
    expect(slotWrapper.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ elevation: 0 }),
      ])
    );
  });

  test('TraySlot scales 1x5 and 5x1 pieces to sit fully inside slot dimensions', () => {
    const piece1x5 = {
      id: 'line_1x5',
      color: 0,
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
    };
    const piece5x1 = {
      id: 'line_5x1',
      color: 1,
      cells: [
        [0, 0],
        [1, 0],
        [2, 0],
        [3, 0],
        [4, 0],
      ],
    };

    // 1x5 test
    let tree1x5;
    act(() => {
      tree1x5 = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={piece1x5}
          slotWidth={90}
          slotHeight={96}
          cellSize={44}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const views1x5 = tree1x5.root.findAllByType(require('react-native').View);
    const pieceWrapper1x5 = views1x5.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some(
          (s) =>
            s &&
            Array.isArray(s.transform) &&
            s.transform.some((t) => typeof t.scale === 'number')
        )
    );
    expect(pieceWrapper1x5).toBeDefined();
    const transform1x5 = pieceWrapper1x5.props.style.find(
      (s) => s && Array.isArray(s.transform)
    );
    const scale1x5 = transform1x5.transform.find((t) => typeof t.scale === 'number').scale;
    // pieceWidth = 232, expected = (90 - 16) / 232 = 74 / 232 ≈ 0.3189655
    expect(scale1x5).toBeCloseTo(74 / 232, 5);
    expect(scale1x5).toBeLessThan(0.55);
    // Scaled width fits inside slotWidth - 16
    expect(232 * scale1x5).toBeLessThanOrEqual(90 - 16);

    // 5x1 test
    let tree5x1;
    act(() => {
      tree5x1 = renderer.create(
        <TraySlot
          slotIndex={1}
          piece={piece5x1}
          slotWidth={90}
          slotHeight={96}
          cellSize={44}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const views5x1 = tree5x1.root.findAllByType(require('react-native').View);
    const pieceWrapper5x1 = views5x1.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some(
          (s) =>
            s &&
            Array.isArray(s.transform) &&
            s.transform.some((t) => typeof t.scale === 'number')
        )
    );
    expect(pieceWrapper5x1).toBeDefined();
    const transform5x1 = pieceWrapper5x1.props.style.find(
      (s) => s && Array.isArray(s.transform)
    );
    const scale5x1 = transform5x1.transform.find((t) => typeof t.scale === 'number').scale;
    // pieceHeight = 232, expected = (96 - 16) / 232 = 80 / 232 ≈ 0.3448275
    expect(scale5x1).toBeCloseTo(80 / 232, 5);
    expect(scale5x1).toBeLessThan(0.55);
    // Scaled height fits inside slotHeight - 16
    expect(232 * scale5x1).toBeLessThanOrEqual(96 - 16);
  });

  test('TraySlot renders socket with theme.surfaceSunken, radius 16, and theme-dependent opacity', () => {
    // Light mode test
    let lightTree;
    act(() => {
      lightTree = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={null}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={theme}
        />
      );
    });

    const lightViews = lightTree.root.findAllByType(require('react-native').View);
    const lightBg = lightViews.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some((s) => s && s.backgroundColor === theme.surfaceSunken)
    );
    expect(lightBg).toBeDefined();
    const flatLight = StyleSheet.flatten(lightBg.props.style);
    expect(flatLight.backgroundColor).toBe(theme.surfaceSunken);
    expect(flatLight.opacity).toBe(0.6);
    expect(flatLight.borderRadius).toBe(16);

    // Dark mode test
    const darkTheme = resolveTheme('dark');
    let darkTree;
    act(() => {
      darkTree = renderer.create(
        <TraySlot
          slotIndex={0}
          piece={null}
          slotWidth={80}
          slotHeight={96}
          cellSize={35}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={{ value: 0 }}
          slotBoardOffsetY={{ value: 0 }}
          ghost={mockGhost}
          onPlace={jest.fn()}
          theme={darkTheme}
        />
      );
    });

    const darkViews = darkTree.root.findAllByType(require('react-native').View);
    const darkBg = darkViews.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some((s) => s && s.backgroundColor === darkTheme.surfaceSunken)
    );
    expect(darkBg).toBeDefined();
    const flatDark = StyleSheet.flatten(darkBg.props.style);
    expect(flatDark.backgroundColor).toBe(darkTheme.surfaceSunken);
    expect(flatDark.opacity).toBe(1.0);
    expect(flatDark.borderRadius).toBe(16);
  });
});
