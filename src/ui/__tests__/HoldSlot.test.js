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
    RoundedRect: ({ children, ...props }) =>
      React.createElement('RoundedRect', props, children),
    Circle: (props) => React.createElement('Circle', props),
    Line: (props) => React.createElement('Line', props),
    Path: (props) => React.createElement('Path', props),
    Group: ({ children, opacity }) =>
      React.createElement('Group', { opacity }, children),
    LinearGradient: (props) => React.createElement('LinearGradient', props),
  };
});

import React from 'react';
import { StyleSheet } from 'react-native';
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

  test('uses theme surfaceSunken socket background and line dashed border', () => {
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
        v.props.style.some((s) => s && s.backgroundColor === theme.surfaceSunken)
    );
    expect(bgView).toBeDefined();
    expect(bgView.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: theme.surfaceSunken,
          opacity: 0.6,
        }),
      ])
    );

    const slotWrapper = root.findByProps({ accessibilityLabel: 'Hold slot, empty' });
    expect(slotWrapper.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderColor: theme.line,
        }),
      ])
    );
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
        expect.objectContaining({ opacity: 0.4 }),
      ])
    );

    const Icon = require('../components/Icon').default;
    const lockIcons = root.findAllByType(Icon).filter((i) => i.props.name === 'lock');
    expect(lockIcons).toHaveLength(1);
    expect(lockIcons[0].props.size).toBe(14);
    expect(lockIcons[0].props.color).toBe(theme.inkMuted);
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

  test('has idle elevation of 0 so no Android shadow appears', () => {
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
    const slotWrapper = root.findByProps({ accessibilityLabel: 'Hold slot, empty' });
    expect(slotWrapper.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ elevation: 0 }),
      ])
    );
  });

  test('applies calculated restScale to 1x5 piece so it sits fully inside HoldSlot', () => {
    const piece1x5 = {
      id: 'line_1x5',
      color: 1,
      cells: [
        [0, 0],
        [0, 1],
        [0, 2],
        [0, 3],
        [0, 4],
      ],
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <HoldSlot
          piece={piece1x5}
          slotWidth={90}
          slotHeight={96}
          cellSize={44}
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
    // pieceWidth = 5 * 44 + 4 * 3 = 232. expected restScale = (90 - 16) / 232 = 74 / 232 ≈ 0.3189655
    const views = root.findAllByType(require('react-native').View);
    const pieceWrapper = views.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some(
          (s) =>
            s &&
            Array.isArray(s.transform) &&
            s.transform.some((t) => typeof t.scale === 'number')
        )
    );
    expect(pieceWrapper).toBeDefined();
    const transformStyle = pieceWrapper.props.style.find(
      (s) => s && Array.isArray(s.transform)
    );
    const scaleObj = transformStyle.transform.find((t) => typeof t.scale === 'number');
    expect(scaleObj.scale).toBeCloseTo(74 / 232, 5);
    expect(scaleObj.scale).toBeLessThan(0.55);
  });

  test('renders arrow-left-right icon of size 18 when empty, and hides it when piece is held', () => {
    const Icon = require('../components/Icon').default;

    // 1. Empty slot
    let emptyTree;
    act(() => {
      emptyTree = renderer.create(
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

    const emptyIcons = emptyTree.root
      .findAllByType(Icon)
      .filter((i) => i.props.name === 'arrow-left-right');
    expect(emptyIcons).toHaveLength(1);
    expect(emptyIcons[0].props.size).toBe(18);
    expect(emptyIcons[0].props.color).toBe(theme.inkMuted);

    // 2. Occupied slot
    let occupiedTree;
    act(() => {
      occupiedTree = renderer.create(
        <HoldSlot
          piece={{ color: 0, cells: [[0, 0]] }}
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

    const occupiedSwapIcons = occupiedTree.root
      .findAllByType(Icon)
      .filter((i) => i.props.name === 'arrow-left-right');
    expect(occupiedSwapIcons).toHaveLength(0);

    // "Hold" label is still rendered below
    const holdLabel = occupiedTree.root.findByProps({ children: 'Hold' });
    expect(holdLabel).toBeDefined();
    const flatLabel = StyleSheet.flatten(holdLabel.props.style);
    expect(flatLabel.fontFamily).toBe('Figtree_500Medium');
    expect(flatLabel.fontSize).toBe(12);
    expect(flatLabel.marginTop).toBe(4);
    expect(flatLabel.color).toBe(theme.inkMuted);
  });

  test('renders socket background with opacity 1.0 in dark mode', () => {
    const darkTheme = resolveTheme('dark');
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
          theme={darkTheme}
        />
      );
    });

    const views = tree.root.findAllByType(require('react-native').View);
    const bgView = views.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some((s) => s && s.backgroundColor === darkTheme.surfaceSunken)
    );
    expect(bgView).toBeDefined();
    expect(bgView.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          backgroundColor: darkTheme.surfaceSunken,
          opacity: 1.0,
        }),
      ])
    );
  });

  test('hover highlight overlay uses theme.accent border and theme.accentSoft background', () => {
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
          isHovered={{ value: true }}
          theme={theme}
        />
      );
    });

    const views = tree.root.findAllByType(require('react-native').View);
    const highlight = views.find(
      (v) =>
        Array.isArray(v.props.style) &&
        v.props.style.some((s) => s && s.borderColor === theme.accent)
    );
    expect(highlight).toBeDefined();
    expect(highlight.props.style).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          borderColor: theme.accent,
          backgroundColor: theme.accentSoft,
        }),
      ])
    );
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
