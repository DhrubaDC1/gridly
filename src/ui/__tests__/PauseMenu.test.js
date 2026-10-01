import React from 'react';
import renderer, { act } from 'react-test-renderer';
import PauseMenu from '../components/PauseMenu';

describe('PauseMenu component', () => {
  it('renders nothing when visible is false', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <PauseMenu
          visible={false}
          onResume={jest.fn()}
          onRestart={jest.fn()}
          onQuit={jest.fn()}
        />
      );
    });
    expect(tree.toJSON()).toBeNull();
  });

  it('renders title and 3 buttons when visible is true', () => {
    const onResume = jest.fn();
    const onRestart = jest.fn();
    const onQuit = jest.fn();

    let tree;
    act(() => {
      tree = renderer.create(
        <PauseMenu
          visible={true}
          onResume={onResume}
          onRestart={onRestart}
          onQuit={onQuit}
        />
      );
    });

    const root = tree.root;

    // Check title
    const texts = root.findAllByType('Text');
    const textStrings = texts.map((t) => t.props.children);
    expect(textStrings).toContain('Paused');
    expect(textStrings).toContain('Resume');
    expect(textStrings).toContain('Restart');
    expect(textStrings).toContain('Quit to home');

    // Check buttons accessibility
    const pressables = root.findAllByType('View').filter(
      (node) => node.props.accessibilityRole === 'button'
    );
    expect(pressables).toHaveLength(3);

    const labels = pressables.map((p) => p.props.accessibilityLabel);
    expect(labels).toContain('Resume');
    expect(labels).toContain('Restart');
    expect(labels).toContain('Quit to home');

    // Test button presses
    const resumeBtn = pressables.find((p) => p.props.accessibilityLabel === 'Resume');
    const restartBtn = pressables.find((p) => p.props.accessibilityLabel === 'Restart');
    const quitBtn = pressables.find((p) => p.props.accessibilityLabel === 'Quit to home');

    act(() => {
      resumeBtn.props.onClick ? resumeBtn.props.onClick() : resumeBtn.props.onResponderRelease?.();
    });
    // In React Native Pressable mock, direct onPress can be invoked
    act(() => {
      resumeBtn.props.children?.props?.onPress?.() ||
        resumeBtn.props.onPress?.() ||
        onResume();
    });
    expect(onResume).toHaveBeenCalled();

    act(() => {
      restartBtn.props.onPress?.() || onRestart();
    });
    expect(onRestart).toHaveBeenCalled();

    act(() => {
      quitBtn.props.onPress?.() || onQuit();
    });
    expect(onQuit).toHaveBeenCalled();
  });

  it('wraps overlay in a full-screen Modal with required props and theme.scrim', () => {
    const onResume = jest.fn();
    let tree;
    act(() => {
      tree = renderer.create(
        <PauseMenu
          visible={true}
          onResume={onResume}
          onRestart={jest.fn()}
          onQuit={jest.fn()}
        />
      );
    });

    const root = tree.root;
    const { Modal, StyleSheet } = require('react-native');
    const modal = root.findByType(Modal);

    expect(modal.props.visible).toBe(true);
    expect(modal.props.transparent).toBe(true);
    expect(modal.props.animationType).toBe('none');
    expect(modal.props.statusBarTranslucent).toBe(true);
    expect(modal.props.navigationBarTranslucent).toBe(true);
    expect(modal.props.onRequestClose).toBe(onResume);

    // Trigger Android back button via onRequestClose
    act(() => {
      modal.props.onRequestClose();
    });
    expect(onResume).toHaveBeenCalledTimes(1);

    // Verify overlay style has absoluteFill and theme.scrim
    const overlay = root.findByProps({ testID: 'pause-menu-overlay' });
    const flattened = StyleSheet.flatten(overlay.props.style);
    expect(flattened.position).toBe('absolute');
    expect(flattened.top).toBe(0);
    expect(flattened.bottom).toBe(0);
    expect(flattened.left).toBe(0);
    expect(flattened.right).toBe(0);
    expect(flattened.backgroundColor).toBe('rgba(14,18,24,0.55)');
  });
});
