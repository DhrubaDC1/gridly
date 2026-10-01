import React from 'react';
import renderer, { act } from 'react-test-renderer';
import HomeScreen from '../../../app/index';
import { useRouter } from 'expo-router';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => {
  const pushMock = jest.fn();
  const replaceMock = jest.fn();
  const backMock = jest.fn();
  return {
    useRouter: jest.fn(() => ({
      push: pushMock,
      replace: replaceMock,
      back: backMock,
    })),
  };
});

describe('HomeScreen navigation links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('clicking Achievements link navigates to /achievements', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    const achBtn = tree.root.findByProps({
      accessibilityLabel: 'View Achievements',
    });
    expect(achBtn).toBeDefined();

    act(() => {
      achBtn.props.onPress();
    });

    const router = useRouter();
    expect(router.push).toHaveBeenCalledWith('/achievements');

    act(() => {
      tree.unmount();
    });
  });

  test('clicking Stats link navigates to /stats', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    const statsBtn = tree.root.findByProps({
      accessibilityLabel: 'View Stats',
    });
    expect(statsBtn).toBeDefined();

    act(() => {
      statsBtn.props.onPress();
    });

    const router = useRouter();
    expect(router.push).toHaveBeenCalledWith('/stats');

    act(() => {
      tree.unmount();
    });
  });

  test('clicking Play Blitz link navigates to /blitz', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    const blitzBtn = tree.root.findByProps({
      accessibilityLabel: 'Play Blitz mode',
    });
    expect(blitzBtn).toBeDefined();

    act(() => {
      blitzBtn.props.onPress();
    });

    const router = useRouter();
    expect(router.push).toHaveBeenCalledWith('/blitz');

    act(() => {
      tree.unmount();
    });
  });
});

