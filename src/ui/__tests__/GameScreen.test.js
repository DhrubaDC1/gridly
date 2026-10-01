let mockControllerOverride = null;
jest.mock('../../game/useGameController', () => {
  const actual = jest.requireActual('../../game/useGameController');
  const mockFn = (args) => {
    if (mockControllerOverride) {
      return mockControllerOverride;
    }
    return (actual.useGameController || actual.default)(args);
  };
  return {
    __esModule: true,
    ...actual,
    default: mockFn,
    useGameController: mockFn,
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
    }),
    Stack: {
      Screen: (props) => React.createElement('StackScreen', props),
    },
  };
});

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

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View: (props) => React.createElement(View, props),
      createAnimatedComponent: (Comp) => Comp,
    },
    useSharedValue: (init) => ({ value: init }),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => fn(),
    useAnimatedProps: (fn) => fn(),
    withTiming: (toValue) => toValue,
    withSpring: (toValue) => toValue,
    withRepeat: (anim) => anim,
    withDelay: (_d, anim) => anim,
    cancelAnimation: jest.fn(),
    withSequence: (...animations) => animations[animations.length - 1],
    runOnJS: (fn) => fn,
    Easing: {
      linear: (t) => t,
      out: (fn) => fn,
      in: (fn) => fn,
      inOut: (fn) => fn,
      quad: (t) => t,
      cubic: (t) => t,
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
import GameScreen from '../GameScreen';
import { useProgress } from '../../store/useProgress';

describe('GameScreen component', () => {
  beforeEach(() => {
    useProgress.getState().resetProgress();
  });

  test('renders in classic mode: header title Classic, no timer bar', () => {
    let tree;
    act(() => {
      tree = renderer.create(<GameScreen mode="classic" />);
    });

    const root = tree.root;
    const stackScreen = root.findByType('StackScreen');
    expect(stackScreen.props.options.title).toBe('Classic');

    // No timer progressbar in classic mode
    const progressBars = root.findAllByProps({ accessibilityRole: 'progressbar' });
    expect(progressBars).toHaveLength(0);

    act(() => {
      tree.unmount();
    });
  });

  test('renders in blitz mode: header title Blitz, timer bar and seconds remaining text', () => {
    let tree;
    act(() => {
      tree = renderer.create(<GameScreen mode="blitz" />);
    });

    const root = tree.root;
    const stackScreen = root.findByType('StackScreen');
    expect(stackScreen.props.options.title).toBe('Blitz');

    // Progressbar exists in blitz mode
    const progressBar = root.findByProps({ accessibilityRole: 'progressbar' });
    expect(progressBar).toBeDefined();
    expect(progressBar.props.accessibilityValue.now).toBe(90);

    // Seconds remaining text
    const texts = root.findAllByType('Text').map((t) => t.props.children);
    expect(texts).toContain('90s');

    act(() => {
      tree.unmount();
    });
  });

  test('pausing sets board and tray to opacity 0, shows PauseMenu, and resuming restores opacity 1', () => {
    let tree;
    act(() => {
      tree = renderer.create(<GameScreen mode="classic" />);
    });

    const root = tree.root;
    const { StyleSheet } = require('react-native');
    const PauseMenu = require('../components/PauseMenu').default;
    const Board = require('../components/Board').default;
    const Tray = require('../components/Tray').default;

    // Initially not paused: PauseMenu visible is false, board and tray opacity 1
    const pauseMenu = root.findByType(PauseMenu);
    expect(pauseMenu.props.visible).toBe(false);

    const board = root.findByType(Board);
    const boardContainer = board.parent;
    expect(StyleSheet.flatten(boardContainer.props.style).opacity).toBe(1);

    const tray = root.findByType(Tray.type || Tray);
    const bottomRow = tray.parent;
    expect(StyleSheet.flatten(bottomRow.props.style).opacity).toBe(1);
    expect(StyleSheet.flatten(tray.props.style).opacity).toBe(1);

    // Pause the game via headerRight
    const stackScreen = root.findByType('StackScreen');
    const headerRight = stackScreen.props.options.headerRight();
    act(() => {
      headerRight.props.onPress();
    });

    // When paused: PauseMenu visible is true, board and tray opacity are 0
    expect(pauseMenu.props.visible).toBe(true);
    expect(StyleSheet.flatten(boardContainer.props.style).opacity).toBe(0);
    expect(StyleSheet.flatten(bottomRow.props.style).opacity).toBe(0);
    expect(StyleSheet.flatten(tray.props.style).opacity).toBe(0);

    // Resume via PauseMenu onResume
    act(() => {
      pauseMenu.props.onResume();
    });

    expect(pauseMenu.props.visible).toBe(false);
    expect(StyleSheet.flatten(boardContainer.props.style).opacity).toBe(1);
    expect(StyleSheet.flatten(bottomRow.props.style).opacity).toBe(1);
    expect(StyleSheet.flatten(tray.props.style).opacity).toBe(1);

    act(() => {
      tree.unmount();
    });
  });

  test('moves left goal chip uses theme.danger when movesLeft <= 3', () => {
    mockControllerOverride = {
      state: {
        mode: 'adventure',
        score: 100,
        movesLeft: 2,
        goals: [{ type: 'lines', count: 3, completed: false }],
        tray: [null, null, null],
        hold: null,
        holdUsed: false,
        over: false,
        board: Array(64).fill(null),
      },
      clearing: null,
      onClearingComplete: jest.fn(),
      place: jest.fn(),
      hold: jest.fn(),
      restart: jest.fn(),
      subscribe: jest.fn(() => () => {}),
      isPaused: false,
      pause: jest.fn(),
      resume: jest.fn(),
    };

    let tree;
    act(() => {
      tree = renderer.create(<GameScreen mode="adventure" levelId={12} />);
    });

    const root = tree.root;
    const { StyleSheet } = require('react-native');
    const chip = root.findByProps({ accessibilityLabel: '2 moves left' });
    expect(chip).toBeDefined();

    const chipStyle = StyleSheet.flatten(chip.props.style);
    const theme = require('../theme').resolveTheme('light');
    expect(chipStyle.borderColor).toBe(theme.danger);
    expect(chipStyle.borderColor).toBe('#C8372D');

    const text = chip.findByType('Text');
    const textStyle = StyleSheet.flatten(text.props.style);
    expect(textStyle.color).toBe(theme.danger);
    expect(textStyle.color).toBe('#C8372D');

    mockControllerOverride = null;
    act(() => {
      tree.unmount();
    });
  });

  test('pause button renders 40pt circle in theme.surfaceSunken with Icon "pause" size 20 in theme.ink and 44pt hit area', () => {
    let tree;
    act(() => {
      tree = renderer.create(<GameScreen mode="classic" />);
    });

    const root = tree.root;
    const { StyleSheet } = require('react-native');
    const { resolveTheme } = require('../theme');
    const theme = resolveTheme('light');
    const Icon = require('../components/Icon').default;

    const stackScreen = root.findByType('StackScreen');
    const headerRight = stackScreen.props.options.headerRight();

    expect(headerRight.props.accessibilityRole).toBe('button');
    expect(headerRight.props.accessibilityLabel).toBeDefined();

    // 44pt hit area via hitSlop: 40 + 2 + 2 = 44
    expect(headerRight.props.hitSlop).toBe(2);

    const flatStyle = StyleSheet.flatten(headerRight.props.style);
    expect(flatStyle.width).toBe(40);
    expect(flatStyle.height).toBe(40);
    expect(flatStyle.borderRadius).toBe(20);
    expect(flatStyle.backgroundColor).toBe(theme.surfaceSunken);

    // Icon "pause" size 20 in theme.ink
    const iconElement = headerRight.props.children;
    expect(iconElement.type).toBe(Icon);
    expect(iconElement.props.name).toBe('pause');
    expect(iconElement.props.size).toBe(20);
    expect(iconElement.props.color).toBe(theme.ink);

    act(() => {
      tree.unmount();
    });
  });
});
