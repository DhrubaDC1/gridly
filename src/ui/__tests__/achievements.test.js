import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AchievementsScreen from '../../../app/(tabs)/achievements';
import { useProgress } from '../../store/useProgress';
import { ACHIEVEMENTS } from '../../engine/achievements';

jest.mock('expo-router', () => {
  const pushMock = jest.fn();
  const backMock = jest.fn();
  const replaceMock = jest.fn();
  const canGoBackMock = jest.fn(() => true);
  return {
    useRouter: jest.fn(() => ({
      push: pushMock,
      back: backMock,
      replace: replaceMock,
      canGoBack: canGoBackMock,
    })),
    Stack: {
      Screen: jest.fn(({ options }) => {
        const HeaderLeft = options?.headerLeft;
        return HeaderLeft ? <HeaderLeft /> : null;
      }),
    },
  };
});

function getAllText(root) {
  return root.findAllByType('Text').map((node) => {
    const children = node.props.children;
    if (Array.isArray(children)) {
      return children.join('');
    }
    return String(children ?? '');
  });
}

describe('AchievementsScreen', () => {
  beforeEach(() => {
    act(() => {
      useProgress.getState().resetProgress();
    });
    jest.clearAllMocks();
  });

  test('renders header with "0 of 25 unlocked" and all 25 achievements locked', () => {
    let tree;
    act(() => {
      tree = renderer.create(<AchievementsScreen />);
    });

    const texts = getAllText(tree.root);
    expect(texts).toContain('Achievements');
    expect(texts).toContain('0 of 25 unlocked');

    // Verify all 25 achievements are present by name and description
    for (const ach of ACHIEVEMENTS) {
      expect(texts).toContain(ach.name);
      expect(texts).toContain(ach.description);
    }

    // Verify all 25 cards read as locked
    for (const ach of ACHIEVEMENTS) {
      const card = tree.root.findByProps({ testID: `achievement-card-${ach.id}` });
      expect(card.props.accessibilityLabel).toContain(', locked.');
    }

    act(() => {
      tree.unmount();
    });
  });

  test('renders unlocked achievements with unlock date', () => {
    act(() => {
      useProgress.getState().unlockAchievement('first_clear', '2026-10-01T12:00:00Z');
      useProgress.getState().unlockAchievement('double', '2026-10-02T15:30:00Z');
    });

    let tree;
    act(() => {
      tree = renderer.create(<AchievementsScreen />);
    });

    const texts = getAllText(tree.root);
    expect(texts).toContain('2 of 25 unlocked');

    // Unlock dates should be visible for unlocked achievements
    expect(texts).toContain('Unlocked Oct 1, 2026');
    expect(texts).toContain('Unlocked Oct 2, 2026');

    // first_clear and double read as unlocked, quad as locked
    const firstClearCard = tree.root.findByProps({ testID: 'achievement-card-first_clear' });
    expect(firstClearCard.props.accessibilityLabel).toContain('unlocked');

    const doubleCard = tree.root.findByProps({ testID: 'achievement-card-double' });
    expect(doubleCard.props.accessibilityLabel).toContain('unlocked');

    const quadCard = tree.root.findByProps({ testID: 'achievement-card-quad' });
    expect(quadCard.props.accessibilityLabel).toContain(', locked.');

    act(() => {
      tree.unmount();
    });
  });
});
