let mockRouter;
jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  const makeFromSVGString = jest.fn((str) => ({
    __type: 'SkPath',
    svgString: str,
  }));
  return {
    Canvas: ({ children, style }) =>
      React.createElement('Canvas', { style }, children),
    Path: (props) => React.createElement('Path', props),
    Group: ({ children, ...props }) =>
      React.createElement('Group', props, children),
    Skia: {
      Path: {
        MakeFromSVGString: makeFromSVGString,
      },
    },
  };
});

import React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import BackButton from '../components/BackButton';
import Icon from '../components/Icon';
import { resolveTheme } from '../theme';

describe('BackButton component', () => {
  beforeEach(() => {
    mockRouter = {
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: jest.fn(() => true),
    };
  });

  test('renders 44x44 pressable with accessibilityLabel "Back" and Icon "arrow-left"', () => {
    let tree;
    act(() => {
      tree = renderer.create(<BackButton />);
    });

    const root = tree.root;
    const pressable = root.findByProps({ accessibilityLabel: 'Back' });
    expect(pressable).toBeDefined();
    expect(pressable.props.accessibilityRole).toBe('button');

    const flatStyle = StyleSheet.flatten(pressable.props.style);
    expect(flatStyle.width).toBe(44);
    expect(flatStyle.height).toBe(44);
    expect(flatStyle.alignItems).toBe('center');
    expect(flatStyle.justifyContent).toBe('center');

    const icon = root.findByType(Icon);
    expect(icon).toBeDefined();
    expect(icon.props.name).toBe('arrow-left');
    expect(icon.props.size).toBe(24);

    const theme = resolveTheme('light');
    expect(icon.props.color).toBe(theme.ink);

    act(() => {
      tree.unmount();
    });
  });

  test('calls router.back() when router.canGoBack() is true', () => {
    mockRouter.canGoBack.mockReturnValue(true);

    let tree;
    act(() => {
      tree = renderer.create(<BackButton />);
    });

    const pressable = tree.root.findByProps({ accessibilityLabel: 'Back' });
    act(() => {
      pressable.props.onPress();
    });

    expect(mockRouter.back).toHaveBeenCalledTimes(1);
    expect(mockRouter.replace).not.toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  test('calls router.replace("/") when router.canGoBack() is false', () => {
    mockRouter.canGoBack.mockReturnValue(false);

    let tree;
    act(() => {
      tree = renderer.create(<BackButton />);
    });

    const pressable = tree.root.findByProps({ accessibilityLabel: 'Back' });
    act(() => {
      pressable.props.onPress();
    });

    expect(mockRouter.replace).toHaveBeenCalledWith('/');
    expect(mockRouter.back).not.toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  test('calls custom onPress if passed as prop', () => {
    const customOnPress = jest.fn();

    let tree;
    act(() => {
      tree = renderer.create(<BackButton onPress={customOnPress} />);
    });

    const pressable = tree.root.findByProps({ accessibilityLabel: 'Back' });
    act(() => {
      pressable.props.onPress();
    });

    expect(customOnPress).toHaveBeenCalledTimes(1);
    expect(mockRouter.back).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();

    act(() => {
      tree.unmount();
    });
  });

  test('applies custom style when passed', () => {
    let tree;
    act(() => {
      tree = renderer.create(<BackButton style={{ marginLeft: 8 }} />);
    });

    const pressable = tree.root.findByProps({ accessibilityLabel: 'Back' });
    const flatStyle = StyleSheet.flatten(pressable.props.style);
    expect(flatStyle.width).toBe(44);
    expect(flatStyle.height).toBe(44);
    expect(flatStyle.marginLeft).toBe(8);

    act(() => {
      tree.unmount();
    });
  });
});
