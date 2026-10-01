import React from 'react';
import renderer, { act } from 'react-test-renderer';
import Segmented from '../components/Segmented';
import { resolveTheme } from '../theme';

function triggerPress(node) {
  if (typeof node.props.onPress === 'function') {
    node.props.onPress();
  } else if (typeof node.props.onClick === 'function') {
    node.props.onClick();
  } else if (typeof node.props.onResponderRelease === 'function') {
    node.props.onResponderRelease();
  }
}

describe('Segmented component', () => {
  const options = [
    { value: 'system', label: 'System' },
    { value: 'light', label: 'Light' },
    { value: 'dark', label: 'Dark' },
  ];

  test('renders all options with accessibility roles and labels', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <Segmented
          options={options}
          value="system"
          onChange={() => {}}
          accessibilityLabel="Theme"
        />
      );
    });

    const root = tree.root;
    const views = root.findAllByType('View');
    const pressableButtons = views.filter(
      (node) => node.props?.accessibilityRole === 'button'
    );
    expect(pressableButtons.length).toBe(3);

    expect(pressableButtons[0].props.accessibilityLabel).toBe('System');
    expect(pressableButtons[1].props.accessibilityLabel).toBe('Light');
    expect(pressableButtons[2].props.accessibilityLabel).toBe('Dark');

    expect(pressableButtons[0].props.accessibilityState).toEqual({ selected: true });
    expect(pressableButtons[1].props.accessibilityState).toEqual({ selected: false });
    expect(pressableButtons[2].props.accessibilityState).toEqual({ selected: false });

    act(() => {
      tree.unmount();
    });
  });

  test('fires onChange when an option is pressed', () => {
    const onChange = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <Segmented options={options} value="system" onChange={onChange} />
      );
    });

    const root = tree.root;
    const pressables = root.findAllByType('View').filter(
      (node) => node.props?.accessibilityRole === 'button'
    );
    const darkButton = pressables.find(
      (p) => p.props.accessibilityLabel === 'Dark'
    );

    act(() => {
      triggerPress(darkButton);
    });

    expect(onChange).toHaveBeenCalledWith('dark');

    act(() => {
      tree.unmount();
    });
  });

  test('supports string array options', () => {
    const stringOptions = ['System', 'On', 'Off'];
    const onChange = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <Segmented
          options={stringOptions}
          value="On"
          onChange={onChange}
        />
      );
    });

    const root = tree.root;
    const buttons = root.findAllByType('View').filter(
      (node) => node.props?.accessibilityRole === 'button'
    );
    expect(buttons.length).toBe(3);
    expect(buttons[1].props.accessibilityState).toEqual({ selected: true });

    act(() => {
      triggerPress(buttons[2]);
    });
    expect(onChange).toHaveBeenCalledWith('Off');

    act(() => {
      tree.unmount();
    });
  });

  test('applies theme colors correctly for dark theme', () => {
    const darkTheme = resolveTheme('dark', 'dark');
    let tree;
    act(() => {
      tree = renderer.create(
        <Segmented
          options={options}
          value="dark"
          onChange={() => {}}
          theme={darkTheme}
        />
      );
    });

    const root = tree.root;
    const buttons = root.findAllByType('View').filter(
      (node) => node.props?.accessibilityRole === 'button'
    );
    const selectedButton = buttons.find(
      (p) => p.props.accessibilityState?.selected === true
    );
    expect(selectedButton).toBeDefined();
    expect(selectedButton.props.accessibilityLabel).toBe('Dark');

    act(() => {
      tree.unmount();
    });
  });
});
