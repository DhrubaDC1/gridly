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

    // Verify all 25 cards have dimmed opacity (0.45)
    for (const ach of ACHIEVEMENTS) {
      const card = tree.root.findByProps({ testID: `achievement-card-${ach.id}` });
      const flat = Array.isArray(card.props.style)
        ? Object.assign({}, ...card.props.style)
        : card.props.style;
      expect(flat.opacity).toBe(0.45);
    }

    act(() => {
      tree.unmount();
    });
  });

  test('renders unlocked achievements with unlock date and normal opacity', () => {
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

    // Card opacity checks: first_clear and double are opacity 1, others are opacity 0.45
    const firstClearCard = tree.root.findByProps({ testID: 'achievement-card-first_clear' });
    const firstClearFlat = Array.isArray(firstClearCard.props.style)
      ? Object.assign({}, ...firstClearCard.props.style)
      : firstClearCard.props.style;
    expect(firstClearFlat.opacity).toBe(1);

    const doubleCard = tree.root.findByProps({ testID: 'achievement-card-double' });
    const doubleFlat = Array.isArray(doubleCard.props.style)
      ? Object.assign({}, ...doubleCard.props.style)
      : doubleCard.props.style;
    expect(doubleFlat.opacity).toBe(1);

    const quadCard = tree.root.findByProps({ testID: 'achievement-card-quad' });
    const quadFlat = Array.isArray(quadCard.props.style)
      ? Object.assign({}, ...quadCard.props.style)
      : quadCard.props.style;
    expect(quadFlat.opacity).toBe(0.45);

    act(() => {
      tree.unmount();
    });
  });
});
