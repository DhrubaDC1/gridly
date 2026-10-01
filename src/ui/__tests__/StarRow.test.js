import React from 'react';
import renderer, { act } from 'react-test-renderer';
import StarRow from '../components/StarRow';
import { lightColors } from '../theme';

describe('StarRow component', () => {
  test('renders 3 stars by default with accessible label', () => {
    let tree;
    act(() => {
      tree = renderer.create(<StarRow stars={2} />);
    });

    const root = tree.root;
    const view = root.findByProps({ accessibilityRole: 'text' });
    expect(view.props.accessibilityLabel).toBe('2 of 3 stars');

    const starTexts = root.findAllByType('Text');
    expect(starTexts).toHaveLength(3);
    starTexts.forEach((t) => {
      expect(t.props.children).toBe('★');
    });

    // First two stars filled, third star empty
    const starFillColor = '#F2B33D';
    const starEmptyColor = lightColors.cellEmpty;

    const flatStyle0 = [].concat(starTexts[0].props.style).reduce((acc, s) => ({ ...acc, ...s }), {});
    const flatStyle1 = [].concat(starTexts[1].props.style).reduce((acc, s) => ({ ...acc, ...s }), {});
    const flatStyle2 = [].concat(starTexts[2].props.style).reduce((acc, s) => ({ ...acc, ...s }), {});

    expect(flatStyle0.color).toBe(starFillColor);
    expect(flatStyle1.color).toBe(starFillColor);
    expect(flatStyle2.color).toBe(starEmptyColor);
  });

  test('renders 0 stars when stars is 0', () => {
    let tree;
    act(() => {
      tree = renderer.create(<StarRow stars={0} />);
    });

    const root = tree.root;
    const view = root.findByProps({ accessibilityRole: 'text' });
    expect(view.props.accessibilityLabel).toBe('0 of 3 stars');

    const starTexts = root.findAllByType('Text');
    expect(starTexts).toHaveLength(3);
    const starEmptyColor = lightColors.cellEmpty;
    starTexts.forEach((t) => {
      const flatStyle = [].concat(t.props.style).reduce((acc, s) => ({ ...acc, ...s }), {});
      expect(flatStyle.color).toBe(starEmptyColor);
    });
  });

  test('renders 3 filled stars when stars is 3', () => {
    let tree;
    act(() => {
      tree = renderer.create(<StarRow stars={3} />);
    });

    const root = tree.root;
    const view = root.findByProps({ accessibilityRole: 'text' });
    expect(view.props.accessibilityLabel).toBe('3 of 3 stars');

    const starTexts = root.findAllByType('Text');
    const starFillColor = '#F2B33D';
    starTexts.forEach((t) => {
      const flatStyle = [].concat(t.props.style).reduce((acc, s) => ({ ...acc, ...s }), {});
      expect(flatStyle.color).toBe(starFillColor);
    });
  });
});
