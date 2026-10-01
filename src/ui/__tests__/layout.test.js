let mockCapturedStackProps = null;
let mockCapturedScreens = [];

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
    Skia: {
      Path: {
        MakeFromSVGString: jest.fn(() => ({})),
      },
    },
  };
});

jest.mock('expo-font', () => ({
  useFonts: () => [true],
}));

jest.mock('expo-status-bar', () => ({
  StatusBar: () => null,
}));

jest.mock('react-native-gesture-handler', () => {
  const React = require('react');
  const { View } = require('react-native');
  return {
    GestureHandlerRootView: (props) => React.createElement(View, props),
  };
});

jest.mock('expo-router', () => {
  const React = require('react');
  const StackComponent = (props) => {
    mockCapturedStackProps = props;
    return React.createElement('Stack', props, props.children);
  };
  StackComponent.Screen = (props) => {
    mockCapturedScreens.push(props);
    return React.createElement('StackScreen', props);
  };
  return {
    Stack: StackComponent,
    useRouter: () => ({
      back: jest.fn(),
      replace: jest.fn(),
      canGoBack: jest.fn(() => true),
    }),
  };
});

jest.mock('../../store/useProgress', () => ({
  useProgress: (selector) => selector({ inProgress: { classic: null } }),
}));

jest.mock('../components/Toast', () => () => null);

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import RootLayout from '../../../app/_layout';
import BackButton from '../components/BackButton';

describe('RootLayout _layout.js', () => {
  beforeEach(() => {
    mockCapturedStackProps = null;
    mockCapturedScreens = [];
  });

  test('configures headerTitleAlign "center" and headerLeft with BackButton in screenOptions', () => {
    let tree;
    act(() => {
      tree = renderer.create(<RootLayout />);
    });

    expect(mockCapturedStackProps).toBeDefined();
    const { screenOptions } = mockCapturedStackProps;
    expect(screenOptions).toBeDefined();

    // headerTitleAlign centered globally
    expect(screenOptions.headerTitleAlign).toBe('center');

    // headerLeft returns BackButton
    expect(typeof screenOptions.headerLeft).toBe('function');
    const headerLeftElement = screenOptions.headerLeft();
    expect(headerLeftElement.type).toBe(BackButton);

    // Home screen has headerShown: false
    const indexScreen = mockCapturedScreens.find((s) => s.name === 'index');
    expect(indexScreen).toBeDefined();
    expect(indexScreen.options.headerShown).toBe(false);

    act(() => {
      tree.unmount();
    });
  });
});
