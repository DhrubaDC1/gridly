jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockBack = jest.fn();

jest.mock('expo-router', () => {
  const React = require('react');
  return {
    useRouter: () => ({
      push: mockPush,
      replace: mockReplace,
      back: mockBack,
    }),
    useLocalSearchParams: () => ({ level: '1' }),
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
import AdventureMapScreen from '../../../app/adventure/index';
import AdventureLevelScreen from '../../../app/adventure/[level]';
import GameOver from '../components/GameOver';
import { useProgress } from '../../store/useProgress';
import levelsData from '../../../assets/levels/levels.json';

describe('Adventure Mode UI Screens and Overlays', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProgress.getState().resetProgress();
  });

  describe('app/adventure/index.js (Level Map)', () => {
    test('renders grid of level nodes with level numbers and stars', () => {
      useProgress.getState().setAdventureProgress({
        unlocked: 3,
        levelId: 1,
        stars: 3,
        score: 1500,
      });

      let tree;
      act(() => {
        tree = renderer.create(<AdventureMapScreen />);
      });

      const root = tree.root;
      // All levels from levels.json are rendered
      levelsData.forEach((level) => {
        const node = root.findByProps({ testID: `level-node-${level.id}` });
        expect(node).toBeDefined();
      });

      // Level 1: unlocked and has 3 stars
      const node1 = root.findByProps({ testID: 'level-node-1' });
      expect(node1.props.accessibilityState.disabled).toBe(false);
      expect(node1.props.accessibilityLabel).toContain('3 of 3 stars');

      // Tapping level 1 navigates to /adventure/1
      act(() => {
        node1.props.onPress();
      });
      expect(mockPush).toHaveBeenCalledWith('/adventure/1');

      // Level 4: locked (above unlocked 3)
      const node4 = root.findByProps({ testID: 'level-node-4' });
      expect(node4.props.accessibilityState.disabled).toBe(true);
      expect(node4.props.accessibilityLabel).toContain('locked');

      act(() => {
        tree.unmount();
      });
    });
  });

  describe('app/adventure/[level].js (Play Level)', () => {
    test('renders GameScreen in adventure mode displaying goal chips instead of best score', () => {
      let tree;
      act(() => {
        tree = renderer.create(<AdventureLevelScreen />);
      });

      const root = tree.root;

      // Header title shows Level 1
      const stackScreen = root.findByType('StackScreen');
      expect(stackScreen.props.options.title).toBe('Level 1');

      // Best score text is NOT rendered
      const texts = root.findAllByType('Text').map((t) => t.props.children);
      const hasBestScoreText = texts.some(
        (t) => typeof t === 'string' && t.startsWith('best ')
      );
      expect(hasBestScoreText).toBe(false);

      // Adventure goal chips container exists
      const goalsContainer = root.findByProps({ testID: 'adventure-goals' });
      expect(goalsContainer).toBeDefined();

      act(() => {
        tree.unmount();
      });
    });
  });

  describe('GameOver in Adventure mode', () => {
    test('on levelComplete: shows "Level complete", earned stars, "Next level", "Replay", and "Map"', () => {
      const onNextLevel = jest.fn();
      const onReplay = jest.fn();
      const onMap = jest.fn();

      let tree;
      act(() => {
        tree = renderer.create(
          <GameOver
            visible={true}
            mode="adventure"
            overReason="levelComplete"
            score={2400}
            stars={2}
            onNextLevel={onNextLevel}
            onReplay={onReplay}
            onMap={onMap}
          />
        );
      });

      const root = tree.root;
      const texts = root.findAllByType('Text').map((t) => t.props.children);
      expect(texts).toContain('Level complete');
      expect(texts).toContain('2,400');

      // StarRow accessible label
      const starRow = root.findByProps({ accessibilityLabel: '2 of 3 stars' });
      expect(starRow).toBeDefined();

      // Check buttons: Next level, Replay, Map
      const nextBtn = root.findByProps({ accessibilityLabel: 'Next level' });
      expect(nextBtn).toBeDefined();
      act(() => {
        nextBtn.props.onPress();
      });
      expect(onNextLevel).toHaveBeenCalledTimes(1);

      const replayBtn = root.findByProps({ accessibilityLabel: 'Replay' });
      expect(replayBtn).toBeDefined();
      act(() => {
        replayBtn.props.onPress();
      });
      expect(onReplay).toHaveBeenCalledTimes(1);

      const mapBtn = root.findByProps({ accessibilityLabel: 'Map' });
      expect(mapBtn).toBeDefined();
      act(() => {
        mapBtn.props.onPress();
      });
      expect(onMap).toHaveBeenCalledTimes(1);

      act(() => {
        tree.unmount();
      });
    });

    test('on failure outOfMoves: shows "Out of moves", "Try again", and "Map"', () => {
      const onPlayAgain = jest.fn();
      const onMap = jest.fn();

      let tree;
      act(() => {
        tree = renderer.create(
          <GameOver
            visible={true}
            mode="adventure"
            overReason="outOfMoves"
            score={800}
            onPlayAgain={onPlayAgain}
            onMap={onMap}
          />
        );
      });

      const root = tree.root;
      const texts = root.findAllByType('Text').map((t) => t.props.children);
      expect(texts).toContain('Out of moves');
      expect(texts).not.toContain('Level complete');

      const tryAgainBtn = root.findByProps({ accessibilityLabel: 'Try again' });
      expect(tryAgainBtn).toBeDefined();
      act(() => {
        tryAgainBtn.props.onPress();
      });
      expect(onPlayAgain).toHaveBeenCalledTimes(1);

      const mapBtn = root.findByProps({ accessibilityLabel: 'Map' });
      expect(mapBtn).toBeDefined();
      act(() => {
        mapBtn.props.onPress();
      });
      expect(onMap).toHaveBeenCalledTimes(1);

      act(() => {
        tree.unmount();
      });
    });

    test('on failure noMoves: shows "No moves left", "Try again", and "Map"', () => {
      const onPlayAgain = jest.fn();
      const onMap = jest.fn();

      let tree;
      act(() => {
        tree = renderer.create(
          <GameOver
            visible={true}
            mode="adventure"
            overReason="noMoves"
            score={500}
            onPlayAgain={onPlayAgain}
            onMap={onMap}
          />
        );
      });

      const root = tree.root;
      const texts = root.findAllByType('Text').map((t) => t.props.children);
      expect(texts).toContain('No moves left');

      const tryAgainBtn = root.findByProps({ accessibilityLabel: 'Try again' });
      expect(tryAgainBtn).toBeDefined();

      const mapBtn = root.findByProps({ accessibilityLabel: 'Map' });
      expect(mapBtn).toBeDefined();

      act(() => {
        tree.unmount();
      });
    });
  });
});
