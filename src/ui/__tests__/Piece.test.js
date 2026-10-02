jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  return {
    Canvas: ({ children, style }) =>
      React.createElement('Canvas', { style }, children),
    RoundedRect: ({ children, ...props }) =>
      React.createElement('RoundedRect', props, children),
    Circle: (props) => React.createElement('Circle', props),
    Line: (props) => React.createElement('Line', props),
    Path: (props) => React.createElement('Path', props),
    Group: ({ children, ...props }) =>
      React.createElement('Group', props, children),
    LinearGradient: (props) => React.createElement('LinearGradient', props),
  };
});

import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Piece from '../components/Piece';
import Cell from '../components/Cell';
import { resolveTheme } from '../theme';

describe('Piece component', () => {
  const theme = resolveTheme('light', 'light');

  test('renders tray piece cells matching glazed tile layers', () => {
    // 1x2 piece with 2 cells
    const cells = [
      [0, 0],
      [0, 1],
    ];

    let tree;
    act(() => {
      tree = renderer.create(
        <Piece
          cells={cells}
          color={1} // Jade
          cellSize={40}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const cellComponents = root.findAllByType(Cell);
    expect(cellComponents.length).toBe(2);
    expect(cellComponents[0].props.color).toBe(1);
    expect(cellComponents[1].props.color).toBe(1);

    // Each cell has 4 RoundedRects (glazed layers)
    const roundedRects = root.findAllByType('RoundedRect');
    expect(roundedRects.length).toBe(8); // 4 layers * 2 cells

    const jadeGlaze = theme.glaze[1];
    // Check first cell layer 1 bottom lip
    expect(roundedRects[0].props.color).toBe(jadeGlaze.edge);
    expect(roundedRects[0].props.color).toBe('#1B7655');

    // Check first cell layer 2 body gradient
    const bodyGrad = roundedRects[1].findByType('LinearGradient');
    expect(bodyGrad.props.colors).toEqual([jadeGlaze.top, jadeGlaze.base]);

    act(() => {
      tree.unmount();
    });
  });

  test('renders ghost piece with translucent base and stroke', () => {
    const cells = [[0, 0]];

    let tree;
    act(() => {
      tree = renderer.create(
        <Piece
          cells={cells}
          color={0} // Cobalt
          cellSize={40}
          ghost={true}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const cellComponents = root.findAllByType(Cell);
    expect(cellComponents.length).toBe(1);
    expect(cellComponents[0].props.ghost).toBe(true);

    const roundedRects = root.findAllByType('RoundedRect');
    expect(roundedRects.length).toBe(2);
    // Fill
    expect(roundedRects[0].props.opacity).toBe(0.28);
    // Stroke
    expect(roundedRects[1].props.style).toBe('stroke');
    expect(roundedRects[1].props.strokeWidth).toBe(2);
    expect(roundedRects[1].props.opacity).toBe(0.8);

    act(() => {
      tree.unmount();
    });
  });

  test('returns null for empty or invalid cells', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <Piece
          cells={[]}
          color={0}
          cellSize={40}
          theme={theme}
        />
      );
    });
    expect(tree.toJSON()).toBeNull();

    act(() => {
      tree.unmount();
    });
  });
});
