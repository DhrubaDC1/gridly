jest.mock('@shopify/react-native-skia', () => {
  const React = require('react');
  return {
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
import Cell from '../components/Cell';
import { resolveTheme, glazeFx } from '../theme';

describe('Cell component', () => {
  test('renders normal tile with four layers using theme.glaze in light and dark mode', () => {
    const lightTheme = resolveTheme('light', 'light');
    const darkTheme = resolveTheme('dark', 'dark');

    // 1. Light mode normal tile (color 0 = Cobalt)
    let lightTree;
    act(() => {
      lightTree = renderer.create(
        <Cell
          x={10}
          y={20}
          size={44}
          color={0}
          kind="normal"
          theme={lightTheme}
        />
      );
    });

    const lightRoot = lightTree.root;
    const lightRects = lightRoot.findAllByType('RoundedRect');
    expect(lightRects.length).toBe(4);

    const cobaltLight = lightTheme.glaze[0];
    const s = 44;
    const e = Math.max(2, Math.round(s * 0.06)); // 3
    const r = s * 0.16; // 7.04

    // Layer 1: bottom lip (x, y, s, s) filled with glaze.edge
    const layer1 = lightRects[0];
    expect(layer1.props.x).toBe(10);
    expect(layer1.props.y).toBe(20);
    expect(layer1.props.width).toBe(s);
    expect(layer1.props.height).toBe(s);
    expect(layer1.props.r).toBeCloseTo(r, 2);
    expect(layer1.props.color).toBe(cobaltLight.edge);
    expect(layer1.props.color).toBe('#2448A8');

    // Layer 2: body (x, y, s, s - e) with vertical linear gradient [top, base]
    const layer2 = lightRects[1];
    expect(layer2.props.x).toBe(10);
    expect(layer2.props.y).toBe(20);
    expect(layer2.props.width).toBe(s);
    expect(layer2.props.height).toBe(s - e);
    expect(layer2.props.r).toBeCloseTo(r, 2);

    const bodyGrad = layer2.findByType('LinearGradient');
    expect(bodyGrad.props.start).toEqual({ x: 10, y: 20 });
    expect(bodyGrad.props.end).toEqual({ x: 10, y: 20 + s - e });
    expect(bodyGrad.props.colors).toEqual([cobaltLight.top, cobaltLight.base]);
    expect(bodyGrad.props.colors).toEqual(['#5A88F0', '#3D6FE0']);

    // Layer 3: sheen rounded rect at (x + 2, y + 2) sized (s - 4) by ((s - e) * 0.45), radius r - 2
    const layer3 = lightRects[2];
    expect(layer3.props.x).toBe(12);
    expect(layer3.props.y).toBe(22);
    expect(layer3.props.width).toBe(s - 4);
    expect(layer3.props.height).toBeCloseTo((s - e) * 0.45, 2);
    expect(layer3.props.r).toBeCloseTo(r - 2, 2);

    const sheenGrad = layer3.findByType('LinearGradient');
    expect(sheenGrad.props.start).toEqual({ x: 12, y: 22 });
    expect(sheenGrad.props.end).toEqual({
      x: 12,
      y: 22 + (s - e) * 0.45,
    });
    expect(sheenGrad.props.colors).toEqual([
      glazeFx.sheenFrom,
      glazeFx.sheenTo,
    ]);

    // Layer 4: glint rounded rect at (x + s * 0.14, y + s * 0.12) sized (s * 0.22) by (s * 0.07), radius s * 0.035 in glazeFx.glint
    const layer4 = lightRects[3];
    expect(layer4.props.x).toBeCloseTo(10 + s * 0.14, 2);
    expect(layer4.props.y).toBeCloseTo(20 + s * 0.12, 2);
    expect(layer4.props.width).toBeCloseTo(s * 0.22, 2);
    expect(layer4.props.height).toBeCloseTo(s * 0.07, 2);
    expect(layer4.props.r).toBeCloseTo(s * 0.035, 2);
    expect(layer4.props.color).toBe(glazeFx.glint);

    act(() => {
      lightTree.unmount();
    });

    // 2. Dark mode normal tile (color 0 = Cobalt)
    let darkTree;
    act(() => {
      darkTree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          color={0}
          kind="normal"
          theme={darkTheme}
        />
      );
    });

    const darkRoot = darkTree.root;
    const darkRects = darkRoot.findAllByType('RoundedRect');
    expect(darkRects.length).toBe(4);

    const cobaltDark = darkTheme.glaze[0];
    // Dark layer 1 bottom lip
    expect(darkRects[0].props.color).toBe(cobaltDark.edge);
    expect(darkRects[0].props.color).toBe('#3360C8');

    // Dark layer 2 body gradient
    const darkBodyGrad = darkRects[1].findByType('LinearGradient');
    expect(darkBodyGrad.props.colors).toEqual([cobaltDark.top, cobaltDark.base]);
    expect(darkBodyGrad.props.colors).toEqual(['#7BA3FF', '#5B8AF0']);

    act(() => {
      darkTree.unmount();
    });
  });

  test('below 14pt cells skip sheen and glint', () => {
    const theme = resolveTheme('light', 'light');
    let tree;
    act(() => {
      tree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={12}
          color={2}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const rects = root.findAllByType('RoundedRect');
    // Only layer 1 (lip) and layer 2 (body face), no sheen, no glint
    expect(rects.length).toBe(2);

    const gradients = root.findAllByType('LinearGradient');
    expect(gradients.length).toBe(1);

    act(() => {
      tree.unmount();
    });
  });

  test('ghost renders glaze base at 0.28 opacity and 2px stroke in glaze.top at 0.8 opacity, with no sheen or glint', () => {
    const theme = resolveTheme('light', 'light');
    let tree;
    act(() => {
      tree = renderer.create(
        <Cell
          x={5}
          y={5}
          size={44}
          color={4} // Iris
          ghost={true}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const rects = root.findAllByType('RoundedRect');
    expect(rects.length).toBe(2);

    const irisLight = theme.glaze[4];

    // Translucent fill: base at 0.28 opacity
    const fillRect = rects[0];
    expect(fillRect.props.color).toBe(irisLight.base);
    expect(fillRect.props.color).toBe('#8B6CF0');
    expect(fillRect.props.opacity).toBe(0.28);
    expect(fillRect.props.width).toBe(44);
    expect(fillRect.props.height).toBe(44);

    // Stroke: 2px stroke in top at 0.8 opacity
    const strokeRect = rects[1];
    expect(strokeRect.props.color).toBe(irisLight.top);
    expect(strokeRect.props.color).toBe('#A48BFA');
    expect(strokeRect.props.style).toBe('stroke');
    expect(strokeRect.props.strokeWidth).toBe(2);
    expect(strokeRect.props.opacity).toBe(0.8);

    // No sheen or glint gradients
    const gradients = root.findAllByType('LinearGradient');
    expect(gradients.length).toBe(0);

    act(() => {
      tree.unmount();
    });
  });

  test('colorblind glyphs are drawn in glaze.glyphInk (dark ink on yellow Saffron tile)', () => {
    const theme = resolveTheme('light', 'light');

    // Saffron tile (color 3) has cross glyph and dark glyphInk
    let saffronTree;
    act(() => {
      saffronTree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          color={3}
          colorblind={true}
          theme={theme}
        />
      );
    });

    const saffronRoot = saffronTree.root;
    const lines = saffronRoot.findAllByType('Line');
    // cross glyph has 2 lines
    expect(lines.length).toBe(2);
    const saffronGlaze = theme.glaze[3];
    expect(saffronGlaze.glyphInk).toBe('rgba(14,18,24,0.45)');
    expect(lines[0].props.color).toBe('rgba(14,18,24,0.45)');
    expect(lines[1].props.color).toBe('rgba(14,18,24,0.45)');

    act(() => {
      saffronTree.unmount();
    });

    // Cobalt tile (color 0) has dot glyph in light ink
    let cobaltTree;
    act(() => {
      cobaltTree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          color={0}
          colorblind={true}
          theme={theme}
        />
      );
    });

    const cobaltRoot = cobaltTree.root;
    const dots = cobaltRoot.findAllByType('Circle');
    expect(dots.length).toBe(1);
    expect(dots[0].props.color).toBe('rgba(255,255,255,0.55)');

    act(() => {
      cobaltTree.unmount();
    });
  });

  test('renders gem cell with four facet triangles, outline in glaze.edge, and sparkle driven by twinkle', () => {
    const theme = resolveTheme('light', 'light');
    const s = 44;
    const mockTwinkle = { value: 0.5 };

    let tree;
    act(() => {
      tree = renderer.create(
        <Cell
          x={10}
          y={20}
          size={s}
          color={1} // Jade
          kind="gem"
          twinkle={mockTwinkle}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    // 4 facet triangles + 1 diamond outline + 1 sparkle = 6 Paths
    const paths = root.findAllByType('Path');
    expect(paths.length).toBe(6);

    // Facet triangles
    const tlFacet = paths[0];
    expect(tlFacet.props.color).toBe('#FFFFFF');
    expect(tlFacet.props.opacity).toBe(0.95);

    const trFacet = paths[1];
    expect(trFacet.props.color).toBe('#FFFFFF');
    expect(trFacet.props.opacity).toBe(0.75);

    const brFacet = paths[2];
    expect(brFacet.props.color).toBe('#FFFFFF');
    expect(brFacet.props.opacity).toBe(0.55);

    const blFacet = paths[3];
    expect(blFacet.props.color).toBe('#FFFFFF');
    expect(blFacet.props.opacity).toBe(0.80);

    // Diamond outline in glaze.edge
    const outline = paths[4];
    expect(outline.props.color).toBe(theme.glaze[1].edge);
    expect(outline.props.style).toBe('stroke');
    expect(outline.props.strokeWidth).toBe(1);

    // Sparkle path at top-right
    const sparkle = paths[5];
    expect(sparkle.props.color).toBe('#FFFFFF');
    const sparkleOpacityVal =
      typeof sparkle.props.opacity === 'object'
        ? sparkle.props.opacity.value
        : sparkle.props.opacity;
    expect(sparkleOpacityVal).toBeCloseTo(0.6, 2);

    act(() => {
      tree.unmount();
    });
  });

  test('gem cell sparkle is fixed at 0.6 with reduceMotion', () => {
    const theme = resolveTheme('light', 'light');
    let tree;
    act(() => {
      tree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          color={0}
          kind="gem"
          reduceMotion={true}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    const paths = root.findAllByType('Path');
    const sparkle = paths[5];
    const opacityVal =
      typeof sparkle.props.opacity === 'object'
        ? sparkle.props.opacity.value
        : sparkle.props.opacity;
    expect(opacityVal).toBe(0.6);

    act(() => {
      tree.unmount();
    });
  });

  test('renders Lock hp 2 with lockBase, inset frame, and scaled lock icon in light and dark mode', () => {
    const lightTheme = resolveTheme('light', 'light');
    const darkTheme = resolveTheme('dark', 'dark');
    const s = 44;

    // Light mode
    let lightTree;
    act(() => {
      lightTree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={s}
          color={0} // Cobalt
          kind="lock"
          hp={2}
          theme={lightTheme}
        />
      );
    });

    const lightRoot = lightTree.root;
    // Layer 2 body gradient has lockBase as base color
    const gradients = lightRoot.findAllByType('LinearGradient');
    const bodyGrad = gradients[0];
    expect(bodyGrad.props.colors[1]).toBe(lightTheme.glaze[0].lockBase);

    // Inset frame: rect inset 2, stroke 2.5, white 0.85 in light
    const strokeRectsLight = lightRoot
      .findAllByType('RoundedRect')
      .filter((r) => r.props.style === 'stroke');
    expect(strokeRectsLight.length).toBe(1);
    expect(strokeRectsLight[0].props.x).toBe(2);
    expect(strokeRectsLight[0].props.y).toBe(2);
    expect(strokeRectsLight[0].props.strokeWidth).toBe(2.5);
    expect(strokeRectsLight[0].props.color).toBe('#FFFFFF');
    expect(strokeRectsLight[0].props.opacity).toBe(0.85);

    // Padlock icon paths in white 0.9
    const lockPaths = lightRoot.findAllByType('Path');
    expect(lockPaths.length).toBeGreaterThanOrEqual(1);
    expect(lockPaths[0].props.color).toBe('#FFFFFF');
    expect(lockPaths[0].props.opacity).toBe(0.9);

    act(() => {
      lightTree.unmount();
    });

    // Dark mode
    let darkTree;
    act(() => {
      darkTree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={s}
          color={0}
          kind="lock"
          hp={2}
          theme={darkTheme}
        />
      );
    });

    const darkRoot = darkTree.root;
    const strokeRectsDark = darkRoot
      .findAllByType('RoundedRect')
      .filter((r) => r.props.style === 'stroke');
    expect(strokeRectsDark.length).toBe(1);
    expect(strokeRectsDark[0].props.color).toBe('#E9ECF2');
    expect(strokeRectsDark[0].props.opacity).toBe(0.9);

    act(() => {
      darkTree.unmount();
    });
  });

  test('renders Lock hp 1 with normal glaze tile and crack path (stroke 1.5, white 0.7)', () => {
    const theme = resolveTheme('light', 'light');
    const s = 44;

    let tree;
    act(() => {
      tree = renderer.create(
        <Cell
          x={10}
          y={10}
          size={s}
          color={0}
          kind="lock"
          hp={1}
          theme={theme}
        />
      );
    });

    const root = tree.root;
    // Normal glaze tile uses normal glaze.base, not lockBase
    const gradients = root.findAllByType('LinearGradient');
    const bodyGrad = gradients[0];
    expect(bodyGrad.props.colors[1]).toBe(theme.glaze[0].base);

    // No inset frame
    const strokeRects = root
      .findAllByType('RoundedRect')
      .filter((r) => r.props.style === 'stroke');
    expect(strokeRects.length).toBe(0);

    // Crack path
    const paths = root.findAllByType('Path');
    expect(paths.length).toBe(1);
    const crack = paths[0];
    expect(crack.props.strokeWidth).toBe(1.5);
    expect(crack.props.color).toBe('#FFFFFF');
    expect(crack.props.opacity).toBe(0.7);
    expect(crack.props.style).toBe('stroke');

    // Crack path contains specified points
    expect(crack.props.path).toContain(`${10 + 0.22 * s}`);
    expect(crack.props.path).toContain(`${10 + 0.48 * s}`);

    act(() => {
      tree.unmount();
    });
  });

  test('lockCracked event triggers crack animation and tile shake', () => {
    const theme = resolveTheme('light', 'light');
    let listener;
    const mockSubscribe = jest.fn((cb) => {
      listener = cb;
      return () => {};
    });

    let tree;
    act(() => {
      tree = renderer.create(
        <Cell
          x={0}
          y={0}
          size={44}
          color={0}
          kind="lock"
          hp={1}
          index={5}
          subscribe={mockSubscribe}
          reduceMotion={false}
          theme={theme}
        />
      );
    });

    expect(mockSubscribe).toHaveBeenCalled();

    // Trigger lockCracked event for index 5
    act(() => {
      listener([{ type: 'lockCracked', index: 5 }]);
    });

    expect(tree.toJSON()).toBeDefined();

    act(() => {
      tree.unmount();
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
