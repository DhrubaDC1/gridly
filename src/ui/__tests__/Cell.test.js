jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  return {
    RoundedRect: (props) => React.createElement('RoundedRect', props),
    Circle: (props) => React.createElement('Circle', props),
    Line: (props) => React.createElement('Line', props),
    Path: (props) => React.createElement('Path', props),
    Group: ({ children, ...props }) =>
      React.createElement('Group', props, children),
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Cell from '../components/Cell';
import { resolveTheme } from '../theme';

describe('Cell component', () => {
  test('uses theme.ink token for lock cell border and inner ring (light and dark mode)', () => {
    const lightTheme = resolveTheme('light', 'light');
    const darkTheme = resolveTheme('dark', 'dark');

    // Light theme: theme.ink is #1B1F2A
    let lightTree;
    act(() => {
      lightTree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          cellRadius={7}
          color={0}
          kind="lock"
          hp={2}
          theme={lightTheme}
        />
      );
    });

    const lightRoot = lightTree.root;
    const lightLockRects = lightRoot
      .findAllByType('RoundedRect')
      .filter((r) => r.props.style === 'stroke');
    expect(lightLockRects.length).toBe(2);
    expect(lightLockRects[0].props.color).toBe(lightTheme.ink);
    expect(lightLockRects[0].props.color).toBe('#1B1F2A');
    expect(lightLockRects[1].props.color).toBe(lightTheme.ink);
    expect(lightLockRects[1].props.color).toBe('#1B1F2A');

    act(() => {
      lightTree.unmount();
    });

    // Dark theme: theme.ink is #ECEFF5
    let darkTree;
    act(() => {
      darkTree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          cellRadius={7}
          color={0}
          kind="lock"
          hp={2}
          theme={darkTheme}
        />
      );
    });

    const darkRoot = darkTree.root;
    const darkLockRects = darkRoot
      .findAllByType('RoundedRect')
      .filter((r) => r.props.style === 'stroke');
    expect(darkLockRects.length).toBe(2);
    expect(darkLockRects[0].props.color).toBe(darkTheme.ink);
    expect(darkLockRects[0].props.color).toBe('#ECEFF5');
    expect(darkLockRects[1].props.color).toBe(darkTheme.ink);
    expect(darkLockRects[1].props.color).toBe('#ECEFF5');

    act(() => {
      darkTree.unmount();
    });
  });

  test('renders normal and gem cells without error', () => {
    const theme = resolveTheme('light', 'light');
    let tree;
    act(() => {
      tree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          cellRadius={7}
          color={1}
          kind="gem"
          hp={1}
          theme={theme}
        />
      );
    });
    expect(tree.toJSON()).toBeDefined();
    act(() => {
      tree.unmount();
    });
  });
});
