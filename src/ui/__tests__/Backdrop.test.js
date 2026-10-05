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
    LinearGradient: (props) => React.createElement('LinearGradient', props),
    RadialGradient: (props) => React.createElement('RadialGradient', props),
    vec: (x, y) => ({ x, y }),
  };
});

import React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import Backdrop from '../components/Backdrop';
import { resolveTheme } from '../theme';

describe('Backdrop component', () => {
  const lightTheme = resolveTheme('light', 'light');
  const darkTheme = resolveTheme('dark', 'dark');

  test('renders static Skia Canvas with pointerEvents="none" and absolute positioning', () => {
    let tree;
    act(() => {
      tree = renderer.create(<Backdrop theme={lightTheme} />);
    });

    const canvas = tree.root.findByProps({ testID: 'backdrop' });
    expect(Boolean(canvas)).toBe(true);
    expect(canvas.props.pointerEvents).toBe('none');

    const flatStyle = StyleSheet.flatten(canvas.props.style);
    expect(flatStyle.position).toBe('absolute');
    expect(flatStyle.top).toBe(0);
    expect(flatStyle.left).toBe(0);
    expect(flatStyle.right).toBe(0);
    expect(flatStyle.bottom).toBe(0);
    expect(flatStyle.pointerEvents).toBe('none');

    act(() => {
      tree.unmount();
    });
  });

  test('draws vertical linear gradient from theme.bg to theme.bgDeep and radial gradient from theme.spotlight to transparent', () => {
    let tree;
    act(() => {
      tree = renderer.create(<Backdrop theme={lightTheme} boardCenterY={400} />);
    });

    const rects = tree.root.findAllByType('Rect');
    expect(rects.length).toBe(2);

    // First rect: vertical linear gradient
    const linearGrad = tree.root.findByType('LinearGradient');
    expect(Boolean(linearGrad)).toBe(true);
    expect(linearGrad.props.start.x).toBe(0);
    expect(linearGrad.props.start.y).toBe(0);
    expect(linearGrad.props.colors[0]).toBe(lightTheme.bg);
    expect(linearGrad.props.colors[1]).toBe(lightTheme.bgDeep);

    // Second rect: radial gradient
    const radialGrad = tree.root.findByType('RadialGradient');
    expect(Boolean(radialGrad)).toBe(true);
    expect(radialGrad.props.c.y).toBe(400);
    expect(radialGrad.props.colors[0]).toBe(lightTheme.spotlight);
    expect(radialGrad.props.colors[1]).toBe(`${lightTheme.spotlight}00`);

    act(() => {
      tree.unmount();
    });
  });

  test('radial gradient radius is 0.7 times screen width', () => {
    let tree;
    act(() => {
      tree = renderer.create(<Backdrop theme={lightTheme} />);
    });

    const radialGrad = tree.root.findByType('RadialGradient');
    const rect = tree.root.findAllByType('Rect')[0];
    const screenWidth = rect.props.width;

    expect(radialGrad.props.r).toBeCloseTo(screenWidth * 0.7, 1);
    expect(radialGrad.props.c.x).toBeCloseTo(screenWidth / 2, 1);

    act(() => {
      tree.unmount();
    });
  });

  test('uses dark theme colors in dark mode', () => {
    let tree;
    act(() => {
      tree = renderer.create(<Backdrop theme={darkTheme} />);
    });

    const linearGrad = tree.root.findByType('LinearGradient');
    expect(linearGrad.props.colors[0]).toBe(darkTheme.bg);
    expect(linearGrad.props.colors[1]).toBe(darkTheme.bgDeep);

    const radialGrad = tree.root.findByType('RadialGradient');
    expect(radialGrad.props.colors[0]).toBe(darkTheme.spotlight);
    expect(radialGrad.props.colors[1]).toBe(`${darkTheme.spotlight}00`);

    act(() => {
      tree.unmount();
    });
  });

  test('is memoized and preserves identity across parent re-renders with same props', () => {
    let renderCount = 0;
    const OriginalBackdrop = Backdrop.type; // Extract un-memoized component to wrap with spy

    function SpyBackdrop(props) {
      renderCount++;
      return <OriginalBackdrop {...props} />;
    }
    const MemoizedSpyBackdrop = React.memo(SpyBackdrop);

    function Parent({ count }) {
      return (
        <MemoizedSpyBackdrop
          theme={lightTheme}
          boardCenterY={500}
        />
      );
    }

    let tree;
    act(() => {
      tree = renderer.create(<Parent count={1} />);
    });
    expect(renderCount).toBe(1);

    // Re-render parent with changing state/props
    act(() => {
      tree.update(<Parent count={2} />);
    });
    // Memoized Backdrop must not re-render!
    expect(renderCount).toBe(1);

    act(() => {
      tree.update(<Parent count={3} />);
    });
    expect(renderCount).toBe(1);

    act(() => {
      tree.unmount();
    });
  });
});
