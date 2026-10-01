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
});
