import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StatsScreen from '../../../app/stats';
import { useProgress } from '../../store/useProgress';
import { useRouter } from 'expo-router';

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
        // Render headerLeft if provided so back button can be tested
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

describe('StatsScreen', () => {
  beforeEach(() => {
    act(() => {
      useProgress.getState().resetProgress();
    });
    jest.clearAllMocks();
  });

  test('renders empty-state line when no games were played', () => {
    let tree;
    act(() => {
      tree = renderer.create(<StatsScreen />);
    });

    const texts = getAllText(tree.root);
    expect(texts).toContain('Play a game to start your stats.');

    // Check dash for average classic score when no games
    expect(texts).toContain('—');

    act(() => {
      tree.unmount();
    });
  });

  test('does not show empty-state line when games have been played', () => {
    act(() => {
      useProgress.getState().setStats({
        gamesPlayed: { classic: 3, blitz: 1, adventure: 0 },
        bestScore: { classic: 2500, blitz: 1200, adventure: 0 },
        scoreTotals: { classic: 6000 },
        totalLinesCleared: 24,
        bestCombo: 4,
        perfectClears: 1,
        totalPlayTime: 11520000, // 3h 12m
        currentStreak: 3,
        bestStreak: 5,
      });
    });

    let tree;
    act(() => {
      tree = renderer.create(<StatsScreen />);
    });

    const texts = getAllText(tree.root);
    expect(texts).not.toContain('Play a game to start your stats.');

    // Verify all required stats are rendered
    expect(texts).toContain('Classic best');
    expect(texts).toContain('2,500');

    expect(texts).toContain('Blitz best');
    expect(texts).toContain('1,200');

    expect(texts).toContain('Average Classic score');
    expect(texts).toContain('2,000'); // 6000 / 3

    expect(texts).toContain('Games played');
    expect(texts).toContain('4'); // 3 + 1

    expect(texts).toContain('Total lines cleared');
    expect(texts).toContain('24');

    expect(texts).toContain('Best combo');
    expect(texts).toContain('×4');

    expect(texts).toContain('Perfect clears');
    expect(texts).toContain('1');

    expect(texts).toContain('Total play time');
    expect(texts).toContain('3h 12m');

    expect(texts).toContain('Current day streak');
    expect(texts).toContain('3');

    expect(texts).toContain('Best day streak');
    expect(texts).toContain('5');

    act(() => {
      tree.unmount();
    });
  });

  test('back button triggers navigation back', () => {
    let tree;
    act(() => {
      tree = renderer.create(<StatsScreen />);
    });

    const backButton = tree.root.findByProps({ accessibilityLabel: 'Back' });
    expect(backButton).toBeDefined();

    act(() => {
      backButton.props.onPress();
    });

    const router = useRouter();
    expect(router.back).toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  test('back button falls back to replace("/") if canGoBack is false', () => {
    const router = useRouter();
    router.canGoBack.mockReturnValueOnce(false);

    let tree;
    act(() => {
      tree = renderer.create(<StatsScreen />);
    });

    const backButton = tree.root.findByProps({ accessibilityLabel: 'Back' });

    act(() => {
      backButton.props.onPress();
    });

    expect(router.replace).toHaveBeenCalledWith('/');

    act(() => {
      tree.unmount();
    });
  });
});
