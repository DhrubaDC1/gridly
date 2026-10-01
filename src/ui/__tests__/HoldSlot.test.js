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
jest.mock('react-native-gesture-handler', () => {
  return {
    GestureDetector: ({ children }) => children,
    Gesture: {
      Pan: () => {
        const pan = {
          enabled: () => pan,
          minDistance: () => pan,
          onBegin: () => pan,
          onUpdate: () => pan,
          onEnd: () => pan,
          onFinalize: () => pan,
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
import HoldSlot from '../components/HoldSlot';
import { resolveTheme } from '../theme';

describe('HoldSlot component', () => {
  const theme = resolveTheme('light');
  const mockGhost = {
    ghostX: { value: 0 },
    ghostY: { value: 0 },
    ghostOpacity: { value: 0 },
    setActiveGhostPiece: jest.fn(),
  };
  const mockSharedOffset = { value: 0 };
  const mockIsHovered = { value: false };

  test('renders empty state with "Hold" text when piece is null', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HoldSlot
          piece={null}
          slotWidth={80}
          slotHeight={96}
          cellSize={40}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={mockSharedOffset}
          slotBoardOffsetY={mockSharedOffset}
          ghost={mockGhost}
          onPlace={jest.fn()}
          canHold={true}
          isHovered={mockIsHovered}
          reduceMotion={false}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    // Check accessible empty label
    const slotWrapper = root.findByProps({ accessibilityLabel: 'Hold slot, empty' });
    expect(slotWrapper).toBeDefined();

    // Check "Hold" label text rendered
    const textNode = root.findByProps({ children: 'Hold' });
    expect(textNode).toBeDefined();
    expect(textNode.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ color: theme.inkMuted }),
      ])
    );
  });

  test('uses theme well color for slot background', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HoldSlot
          piece={null}
          slotWidth={80}
          slotHeight={96}
          cellSize={40}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={mockSharedOffset}
          slotBoardOffsetY={mockSharedOffset}
          ghost={mockGhost}
          onPlace={jest.fn()}
          canHold={true}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const views = root.findAllByType(require('react-native').View);
    const bgView = views.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some((s) => s && s.backgroundColor === theme.well)
    );
    expect(bgView).toBeDefined();
  });

  test('dims slot and marks accessibility label as locked when canHold is false', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <HoldSlot
          piece={null}
          slotWidth={80}
          slotHeight={96}
          cellSize={40}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={mockSharedOffset}
          slotBoardOffsetY={mockSharedOffset}
          ghost={mockGhost}
          onPlace={jest.fn()}
          canHold={false}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const slotWrapper = root.findByProps({ accessibilityLabel: 'Hold slot, locked' });
    expect(slotWrapper).toBeDefined();
    expect(slotWrapper.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ opacity: 0.45 }),
      ])
    );
  });

  test('renders held piece when piece is provided', () => {
    const testPiece = {
      color: 2,
      cells: [
        [0, 0],
        [0, 1],
      ],
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <HoldSlot
          piece={testPiece}
          slotWidth={80}
          slotHeight={96}
          cellSize={40}
          gap={3}
          padding={8}
          boardRef={{ current: Array(64).fill(null) }}
          slotBoardOffsetX={mockSharedOffset}
          slotBoardOffsetY={mockSharedOffset}
          ghost={mockGhost}
          onPlace={jest.fn()}
          canHold={true}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const slotWrapper = root.findByProps({ accessibilityLabel: 'Hold slot, contains piece' });
    expect(slotWrapper).toBeDefined();
  });
});

describe('Hold slot turn flow and state transitions', () => {
  const PIECE_A = { color: 0, cells: [[0, 0], [0, 1]] };
  const PIECE_B = { color: 1, cells: [[0, 0], [1, 0]] };
  const PIECE_C = { color: 2, cells: [[0, 0]] };
  const REFILL = [PIECE_A, PIECE_B, PIECE_C];

  // Pure logic simulation matching ClassicScreen state handlers
  function createHoldState() {
    let trayPieces = [PIECE_A, PIECE_B, PIECE_C];
    let heldPiece = null;
    let canHold = true;

    return {
      get trayPieces() {
        return trayPieces;
      },
      get heldPiece() {
        return heldPiece;
      },
      get canHold() {
        return canHold;
      },
      holdFromTray(slotIndex) {
        if (!canHold) return false;
        const piece = trayPieces[slotIndex];
        if (!piece) return false;

        const previousHold = heldPiece;
        heldPiece = piece;
        const next = [...trayPieces];
        next[slotIndex] = previousHold;
        if (next.every((p) => p === null)) {
          trayPieces = [...REFILL];
        } else {
          trayPieces = next;
        }
        canHold = false;
        return true;
      },
      placePieceFromTray(slotIndex) {
        trayPieces[slotIndex] = null;
        if (trayPieces.every((p) => p === null)) {
          trayPieces = [...REFILL];
        }
        canHold = true;
      },
      placePieceFromHold() {
        heldPiece = null;
        canHold = true;
      },
    };
  }

  test('holding a piece moves it to hold slot and disables hold', () => {
    const game = createHoldState();
    expect(game.canHold).toBe(true);
    expect(game.heldPiece).toBeNull();

    // Player holds piece from slot 0 (PIECE_A)
    const success = game.holdFromTray(0);
    expect(success).toBe(true);
    expect(game.heldPiece).toEqual(PIECE_A);
    expect(game.trayPieces[0]).toBeNull();
    expect(game.canHold).toBe(false);
  });

  test('cannot hold twice in a row without a placement', () => {
    const game = createHoldState();
    game.holdFromTray(0);
    expect(game.canHold).toBe(false);

    // Attempting to hold another piece while canHold is false fails
    const secondHold = game.holdFromTray(1);
    expect(secondHold).toBe(false);
    expect(game.heldPiece).toEqual(PIECE_A);
    expect(game.trayPieces[1]).toEqual(PIECE_B);
  });

  test('swapping: stores dragged piece and returns previous held piece to that slot', () => {
    const game = createHoldState();
    // First hold PIECE_A
    game.holdFromTray(0);

    // Now place a piece on board so hold is re-enabled
    game.placePieceFromTray(1);
    expect(game.canHold).toBe(true);

    // Now swap PIECE_C (slot 2) with held PIECE_A
    const swapSuccess = game.holdFromTray(2);
    expect(swapSuccess).toBe(true);
    expect(game.heldPiece).toEqual(PIECE_C);
    // PIECE_A returned to slot 2!
    expect(game.trayPieces[2]).toEqual(PIECE_A);
    expect(game.canHold).toBe(false);
  });

  test('placing a held piece on the board re-enables hold', () => {
    const game = createHoldState();
    game.holdFromTray(0);
    expect(game.canHold).toBe(false);

    // Player drags held piece to board
    game.placePieceFromHold();
    expect(game.heldPiece).toBeNull();
    expect(game.canHold).toBe(true);
  });

  test('tray refills when all 3 tray pieces are empty, even if hold slot is occupied', () => {
    const game = createHoldState();
    // Hold slot 0 (PIECE_A)
    game.holdFromTray(0);
    expect(game.trayPieces[0]).toBeNull();

    // Place slot 1 and slot 2 on board
    game.placePieceFromTray(1);
    expect(game.trayPieces[1]).toBeNull();
    game.placePieceFromTray(2);

    // Tray became empty, so tray refills!
    expect(game.trayPieces.every((p) => p !== null)).toBe(true);
    // Held piece is still preserved in hold slot
    expect(game.heldPiece).toEqual(PIECE_A);
  });
});
