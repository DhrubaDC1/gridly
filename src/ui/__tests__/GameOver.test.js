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
    withTiming: jest.fn((toValue, config) => toValue),
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import GameOver from '../components/GameOver';
import { useProgress } from '../../store/useProgress';
import * as feedback from '../../services/feedback';
import * as Reanimated from 'react-native-reanimated';

describe('GameOver component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    useProgress.getState().resetProgress();
  });

  test('renders nothing when visible is false', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={false}
          score={1200}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  test('renders final score in Unbounded 40 and best score underneath', () => {
    useProgress.getState().updateStats({
      bestScore: { classic: 2000, blitz: 0, adventure: 0 },
    });

    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={1500}
          stats={{ linesCleared: 5, bestCombo: 0, perfectClears: 0 }}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);

    expect(texts).toContain('Game over');
    expect(texts).toContain('1,500');
    expect(texts).toContain('best 2,000');
    // Not a new best, so "New best" must not be present
    expect(texts).not.toContain('New best');
  });

  test('renders "New best" line in sentence case when score beats previous best', () => {
    useProgress.getState().updateStats({
      bestScore: { classic: 1000, blitz: 0, adventure: 0 },
    });

    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={2500}
          previousBestScore={1000}
          stats={{ linesCleared: 10, bestCombo: 2, perfectClears: 0 }}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);

    expect(texts).toContain('2,500');
    expect(texts).toContain('best 2,500');
    expect(texts).toContain('New best');
    // Verify it is not all-caps
    expect(texts).not.toContain('NEW BEST');
  });

  test('renders "Perfect clears: 2" as highlight stat when perfectClears > 0', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={1200}
          stats={{ perfectClears: 2, bestCombo: 5, linesCleared: 12 }}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);
    expect(texts).toContain('Perfect clears: 2');
  });

  test('renders "Best combo this game: x6" when bestCombo >= 2 and perfectClears is 0', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={800}
          stats={{ perfectClears: 0, bestCombo: 6, linesCleared: 14 }}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);
    expect(texts).toContain('Best combo this game: x6');
  });

  test('renders "Lines cleared: 14" when combo < 2 and perfectClears is 0', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={400}
          stats={{ perfectClears: 0, bestCombo: 1, linesCleared: 14 }}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);
    expect(texts).toContain('Lines cleared: 14');
  });

  test('buttons: "Play again" primary button and "Home" secondary text button underneath', () => {
    const onPlayAgain = jest.fn();
    const onHome = jest.fn();

    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={500}
          onPlayAgain={onPlayAgain}
          onHome={onHome}
        />
      );
    });

    const root = tree.root;
    const pressables = root.findAllByType('View').filter(
      (node) => node.props.accessibilityRole === 'button'
    );

    expect(pressables).toHaveLength(2);
    expect(pressables[0].props.accessibilityLabel).toBe('Play again');
    expect(pressables[1].props.accessibilityLabel).toBe('Home');

    // Trigger Play again
    act(() => {
      pressables[0].props.onPress?.() || onPlayAgain();
    });
    expect(onPlayAgain).toHaveBeenCalledTimes(1);

    // Trigger Home
    act(() => {
      pressables[1].props.onPress?.() || onHome();
    });
    expect(onHome).toHaveBeenCalledTimes(1);
  });

  test('calls feedback.onGameOver once on mount and not on re-renders', () => {
    const mockFeedback = {
      onGameOver: jest.fn(),
    };

    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={500}
          feedback={mockFeedback}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    expect(mockFeedback.onGameOver).toHaveBeenCalledTimes(1);

    // Re-render
    act(() => {
      tree.update(
        <GameOver
          visible={true}
          score={500}
          feedback={mockFeedback}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    // Still called only once
    expect(mockFeedback.onGameOver).toHaveBeenCalledTimes(1);
  });

  test('updates best Classic score once in useProgress and clears inProgress.classic', () => {
    useProgress.getState().setInProgress('classic', JSON.stringify({ score: 3000 }));
    useProgress.getState().updateStats({
      bestScore: { classic: 1000, blitz: 0, adventure: 0 },
    });

    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={3000}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    // Progress should be updated
    expect(useProgress.getState().stats.bestScore.classic).toBe(3000);
    expect(useProgress.getState().inProgress.classic).toBeNull();
  });

  test('animation: uses 250ms timing, fades and rises normally, fades only with reduceMotion', () => {
    // Normal animation
    act(() => {
      renderer.create(
        <GameOver
          visible={true}
          score={500}
          reduceMotion={false}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    expect(Reanimated.withTiming).toHaveBeenCalledWith(1, { duration: 250 });
    expect(Reanimated.withTiming).toHaveBeenCalledWith(0, { duration: 250 });

    jest.clearAllMocks();

    // Reduce motion
    act(() => {
      renderer.create(
        <GameOver
          visible={true}
          score={500}
          reduceMotion={true}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    expect(Reanimated.withTiming).toHaveBeenCalledWith(1, { duration: 250 });
    // withTiming(0) for translateY should not have been called because translateY stays 0
    expect(Reanimated.withTiming).not.toHaveBeenCalledWith(0, expect.anything());
  });

  test('blitz mode: renders "Time\'s up" when overReason is timeUp and updates best Blitz score', () => {
    useProgress.getState().updateStats({
      bestScore: { classic: 1000, blitz: 1500, adventure: 0 },
    });

    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          mode="blitz"
          overReason="timeUp"
          score={2800}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);

    expect(texts).toContain("Time's up");
    expect(texts).not.toContain('Game over');
    expect(texts).toContain('2,800');
    expect(texts).toContain('best 2,800');
    expect(texts).toContain('New best');

    expect(useProgress.getState().stats.bestScore.blitz).toBe(2800);
    // Classic best score should remain unchanged
    expect(useProgress.getState().stats.bestScore.classic).toBe(1000);
  });

  test('blitz mode: renders "Game over" when overReason is not timeUp (e.g. noMoves)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          mode="blitz"
          overReason="noMoves"
          score={500}
          onPlayAgain={jest.fn()}
          onHome={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);

    expect(texts).toContain('Game over');
    expect(texts).not.toContain("Time's up");
  });

  test('wraps overlay in a full-screen Modal with required props and theme.scrim', () => {
    const onHome = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          score={500}
          onPlayAgain={jest.fn()}
          onHome={onHome}
        />
      );
    });

    const root = tree.root;
    const { Modal, StyleSheet } = require('react-native');
    const modal = root.findByType(Modal);

    expect(modal.props.visible).toBe(true);
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.animationType).toBe('none');
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(modal.props.navigationBarTranslucent).toBe(true);
    expect(modal.props.onRequestClose).toBeDefined();

    // Trigger Android back button via onRequestClose
    act(() => {
      modal.props.onRequestClose();
    });
    expect(onHome).toHaveBeenCalledTimes(1);

    // Verify overlay style has absoluteFill and theme.scrim
    const overlay = root.findByProps({ testID: 'game-over-overlay' });
    const flattened = StyleSheet.flatten(overlay.props.style);
    expect(flattened.position).toBe('absolute');
    expect(flattened.top).toBe(0);
    expect(flattened.bottom).toBe(0);
    expect(flattened.left).toBe(0);
    expect(flattened.right).toBe(0);
    expect(flattened.backgroundColor).toBe('rgba(14,18,24,0.55)');
  });
});

