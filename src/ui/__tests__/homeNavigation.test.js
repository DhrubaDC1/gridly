import React from 'react';
import renderer, { act } from 'react-test-renderer';
import HomeScreen from '../../../app/(tabs)/index';
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
    useIsFocused: () => true,
  };
});

describe('HomeScreen navigation links', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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

  test('Play Classic button text uses theme.onAccent (dark in dark mode, white in light mode) and subtitle has 0.8 opacity', () => {
    const { useSettings } = require('../../store/useSettings');
    const { StyleSheet } = require('react-native');

    // Test in dark mode
    act(() => {
      useSettings.getState().setTheme('dark');
    });

    let darkTree;
    act(() => {
      darkTree = renderer.create(<HomeScreen />);
    });
    const classicBtnDark = darkTree.root.findByProps({ accessibilityLabel: 'Play Classic mode' });
    const textsDark = classicBtnDark.findAllByType('Text');
    const titleTextDark = textsDark.find((t) => t.props.children === 'Play Classic');
    const subTextDark = textsDark.find((t) => t.props.children === 'Endless relaxing puzzle');

    const titleStyleDark = StyleSheet.flatten(titleTextDark.props.style);
    expect(titleStyleDark.color).toBe('#0E1218');

    const subStyleDark = StyleSheet.flatten(subTextDark.props.style);
    expect(subStyleDark.color).toBe('#0E1218');
    expect(subStyleDark.opacity).toBe(0.8);

    act(() => {
      darkTree.unmount();
    });

    // Test in light mode
    act(() => {
      useSettings.getState().setTheme('light');
    });

    let lightTree;
    act(() => {
      lightTree = renderer.create(<HomeScreen />);
    });
    const classicBtnLight = lightTree.root.findByProps({ accessibilityLabel: 'Play Classic mode' });
    const textsLight = classicBtnLight.findAllByType('Text');
    const titleTextLight = textsLight.find((t) => t.props.children === 'Play Classic');
    const subTextLight = textsLight.find((t) => t.props.children === 'Endless relaxing puzzle');

    const titleStyleLight = StyleSheet.flatten(titleTextLight.props.style);
    expect(titleStyleLight.color).toBe('#FFFFFF');

    const subStyleLight = StyleSheet.flatten(subTextLight.props.style);
    expect(subStyleLight.color).toBe('#FFFFFF');
    expect(subStyleLight.opacity).toBe(0.8);

    act(() => {
      lightTree.unmount();
    });
  });

  test('mounts Backdrop component with pointerEvents="none" behind HomeScreen content', () => {
    let tree;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    const backdrop = tree.root.findByProps({ testID: 'backdrop' });
    expect(Boolean(backdrop)).toBe(true);
    expect(backdrop.props.pointerEvents).toBe('none');

    act(() => {
      tree.unmount();
    });
  });
});

