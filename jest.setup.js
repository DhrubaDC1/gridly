/* eslint-env jest */
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

jest.mock('expo-audio', () => ({
  createAudioPlayer: jest.fn(() => ({
    play: jest.fn(),
    pause: jest.fn(),
    seekTo: jest.fn(() => Promise.resolve()),
    replace: jest.fn(),
  })),
  setAudioModeAsync: jest.fn(() => Promise.resolve()),
  setIsAudioActiveAsync: jest.fn(() => Promise.resolve()),
}));

jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(() => Promise.resolve()),
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: {
    Light: 'light',
    Medium: 'medium',
    Heavy: 'heavy',
  },
  NotificationFeedbackType: {
    Success: 'success',
    Warning: 'warning',
    Error: 'error',
  },
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View: (props) => React.createElement(View, props),
    },
    useSharedValue: (init) => ({ value: init }),
    useDerivedValue: (fn) => ({ value: fn() }),
    useAnimatedStyle: (fn) => fn(),
    withTiming: (toValue, _config, cb) => {
      if (cb) cb(true);
      return toValue;
    },
    withRepeat: (anim) => anim,
    withSequence: (...animations) => animations[animations.length - 1],
    runOnJS: (fn) => fn,
    Easing: {
      linear: (t) => t,
      out: (fn) => fn,
      in: (fn) => fn,
      quad: (t) => t,
      inOut: (fn) => fn,
      ease: (t) => t,
    },
  };
});

jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  return {
    Canvas: ({ children, style, testID, pointerEvents, ...props }) =>
      React.createElement(
        'Canvas',
        { style, testID, pointerEvents, ...props },
        children
      ),
    Rect: ({ children, ...props }) =>
      React.createElement('Rect', props, children),
    RoundedRect: ({ children, ...props }) =>
      React.createElement('RoundedRect', props, children),
    Circle: (props) => React.createElement('Circle', props),
    Line: (props) => React.createElement('Line', props),
    Path: (props) => React.createElement('Path', props),
    Shadow: (props) => React.createElement('Shadow', props),
    Picture: (props) => React.createElement('Picture', props),
    Group: ({ children, ...props }) =>
      React.createElement('Group', props, children),
    LinearGradient: (props) => React.createElement('LinearGradient', props),
    RadialGradient: (props) => React.createElement('RadialGradient', props),
    SweepGradient: (props) => React.createElement('SweepGradient', props),
    createPicture: jest.fn(),
    Skia: {
      Paint: () => ({
        setColor: jest.fn(),
        setStrokeWidth: jest.fn(),
        setStyle: jest.fn(),
      }),
      Color: (c) => c,
      RRectXY: jest.fn(),
      XYWHRect: jest.fn(),
      Path: {
        MakeFromSVGString: jest.fn(() => ({})),
      },
    },
    vec: (x, y) => ({ x, y }),
  };
});
