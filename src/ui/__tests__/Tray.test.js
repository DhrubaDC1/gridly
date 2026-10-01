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
});
