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
    Easing: {
      out: jest.fn((fn) => fn),
      in: jest.fn((fn) => fn),
      quad: jest.fn(),
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Toast from '../components/Toast';
import { useToast } from '../../store/useToast';
import * as Reanimated from 'react-native-reanimated';

describe('Toast component', () => {
  let activeTree = null;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    act(() => {
      useToast.getState().clearAll();
    });
  });

  afterEach(() => {
    if (activeTree) {
      act(() => {
        activeTree.unmount();
      });
      activeTree = null;
    }
    act(() => {
      useToast.getState().clearAll();
    });
    jest.useRealTimers();
  });

  test('renders null when no toast is active', () => {
    act(() => {
      activeTree = renderer.create(<Toast current={null} />);
    });
    expect(activeTree.toJSON()).toBeNull();
  });

  test('renders "Achievement unlocked" title and achievement name when active', () => {
    const toastItem = {
      id: 'toast-1',
      title: 'Achievement unlocked',
      message: 'First clear',
      duration: 2500,
    };

    act(() => {
      activeTree = renderer.create(<Toast current={toastItem} onDismiss={jest.fn()} />);
    });

    const root = activeTree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);

    expect(texts).toContain('Achievement unlocked');
    expect(texts).toContain('First clear');
  });

  test('has accessibility role "alert" and label', () => {
    const toastItem = {
      id: 'toast-1',
      title: 'Achievement unlocked',
      message: 'Double clear',
    };

    act(() => {
      activeTree = renderer.create(<Toast current={toastItem} onDismiss={jest.fn()} />);
    });

    const card = activeTree.root.findByProps({ testID: 'toast-card' });
    expect(card.props.accessibilityRole).toBe('alert');
    expect(card.props.accessibilityLabel).toBe('Achievement unlocked: Double clear');
  });

  test('animates opacity and translateY normally when reduceMotion is false', () => {
    const toastItem = { id: 'toast-1', message: 'First clear' };

    act(() => {
      activeTree = renderer.create(
        <Toast current={toastItem} reduceMotion={false} onDismiss={jest.fn()} />
      );
    });

    // Both opacity (to 1) and translateY (to 0) animate with timing
    expect(Reanimated.withTiming).toHaveBeenCalledWith(1, { duration: 250 });
    expect(Reanimated.withTiming).toHaveBeenCalledWith(0, expect.objectContaining({ duration: 250 }));
  });

  test('fades only with Reduce Motion (no translateY animation)', () => {
    const toastItem = { id: 'toast-1', message: 'First clear' };

    act(() => {
      activeTree = renderer.create(
        <Toast current={toastItem} reduceMotion={true} onDismiss={jest.fn()} />
      );
    });

    // Opacity animates with timing (fade only)
    expect(Reanimated.withTiming).toHaveBeenCalledWith(1, { duration: 150 });
    // translateY was not animated to 0
    expect(Reanimated.withTiming).not.toHaveBeenCalledWith(0, expect.anything());
  });

  test('calls onDismiss after 2.5s duration plus fade-out duration', () => {
    const onDismiss = jest.fn();
    const toastItem = { id: 'toast-1', message: 'First clear', duration: 2500 };

    act(() => {
      activeTree = renderer.create(
        <Toast current={toastItem} reduceMotion={false} onDismiss={onDismiss} />
      );
    });

    expect(onDismiss).not.toHaveBeenCalled();

    // Advance 2500ms (end of display duration)
    act(() => {
      jest.advanceTimersByTime(2500);
    });

    // Still in fade-out
    expect(onDismiss).not.toHaveBeenCalled();

    // Advance fade-out duration (200ms)
    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  test('integrates with useToast store when mounted with no props', () => {
    act(() => {
      useToast.getState().showAchievementToast('first_clear');
      activeTree = renderer.create(<Toast />);
    });

    const root = activeTree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);

    expect(texts).toContain('Achievement unlocked');
    expect(texts).toContain('First clear');
  });
});
