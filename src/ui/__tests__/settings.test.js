import React from 'react';
import { Switch } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import SettingsScreen from '../../../app/settings';
import { useSettings } from '../../store/useSettings';
import { useProgress } from '../../store/useProgress';
import Segmented from '../components/Segmented';
import levelsData from '../../../assets/levels/levels.json';

function triggerPress(node) {
  if (typeof node.props.onPress === 'function') {
    node.props.onPress();
  } else if (typeof node.props.onClick === 'function') {
    node.props.onClick();
  } else if (typeof node.props.onResponderRelease === 'function') {
    node.props.onResponderRelease();
  }
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    act(() => {
      useSettings.getState().resetSettings();
      useProgress.getState().resetProgress();
    });
  });

  test('renders all 5 setting rows with plain labels', () => {
    let tree;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);

    expect(texts).toContain('Settings');
    expect(texts).toContain('Sound');
    expect(texts).toContain('Haptics');
    expect(texts).toContain('Colorblind mode');
    expect(texts).toContain('Theme');
    expect(texts).toContain('Reduce motion');

    act(() => {
      tree.unmount();
    });
  });

  test('renders switches for Sound, Haptics, and Colorblind mode with accessibility labels', () => {
    let tree;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const root = tree.root;
    const switches = root.findAllByType(Switch);
    expect(switches.length).toBe(3);

    const labels = switches.map((s) => s.props.accessibilityLabel);
    expect(labels).toContain('Sound');
    expect(labels).toContain('Haptics');
    expect(labels).toContain('Colorblind mode');

    act(() => {
      tree.unmount();
    });
  });

  test('toggling switches updates useSettings', () => {
    let tree;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const root = tree.root;
    const switches = root.findAllByType(Switch);

    const soundSwitch = switches.find((s) => s.props.accessibilityLabel === 'Sound');
    const hapticsSwitch = switches.find((s) => s.props.accessibilityLabel === 'Haptics');
    const colorblindSwitch = switches.find((s) => s.props.accessibilityLabel === 'Colorblind mode');

    expect(useSettings.getState().sound).toBe(true);
    act(() => {
      soundSwitch.props.onValueChange(false);
    });
    expect(useSettings.getState().sound).toBe(false);

    expect(useSettings.getState().haptics).toBe(true);
    act(() => {
      hapticsSwitch.props.onValueChange(false);
    });
    expect(useSettings.getState().haptics).toBe(false);

    expect(useSettings.getState().colorblind).toBe(false);
    act(() => {
      colorblindSwitch.props.onValueChange(true);
    });
    expect(useSettings.getState().colorblind).toBe(true);

    act(() => {
      tree.unmount();
    });
  });

  test('renders segmented controls for Theme and Reduce motion', () => {
    let tree;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const root = tree.root;
    const segmentedControls = root.findAllByType(Segmented);
    expect(segmentedControls.length).toBe(2);

    expect(segmentedControls[0].props.accessibilityLabel).toBe('Theme');
    expect(segmentedControls[1].props.accessibilityLabel).toBe('Reduce motion');

    act(() => {
      tree.unmount();
    });
  });

  test('selecting theme option updates useSettings and theme tokens', () => {
    let tree;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const root = tree.root;
    const segmentedControls = root.findAllByType(Segmented);
    const themeSegmented = segmentedControls.find(
      (s) => s.props.accessibilityLabel === 'Theme'
    );

    act(() => {
      themeSegmented.props.onChange('dark');
    });
    expect(useSettings.getState().theme).toBe('dark');

    act(() => {
      themeSegmented.props.onChange('light');
    });
    expect(useSettings.getState().theme).toBe('light');

    act(() => {
      tree.unmount();
    });
  });

  test('selecting reduce motion option updates useSettings', () => {
    let tree;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const root = tree.root;
    const segmentedControls = root.findAllByType(Segmented);
    const reduceMotionSegmented = segmentedControls.find(
      (s) => s.props.accessibilityLabel === 'Reduce motion'
    );

    act(() => {
      reduceMotionSegmented.props.onChange('on');
    });
    expect(useSettings.getState().reduceMotion).toBe('on');

    act(() => {
      reduceMotionSegmented.props.onChange('off');
    });
    expect(useSettings.getState().reduceMotion).toBe('off');

    act(() => {
      tree.unmount();
    });
  });

  test('renders "Unlock all levels" row when __DEV__ is true and tapping it unlocks all levels', () => {
    let tree;
    act(() => {
      tree = renderer.create(<SettingsScreen />);
    });

    const root = tree.root;
    const texts = root.findAllByType('Text').map((t) => t.props.children);
    expect(texts).toContain('Unlock all levels');

    expect(useProgress.getState().adventure.unlocked).toBe(1);

    const unlockBtn = root.findByProps({
      accessibilityLabel: 'Unlock all levels',
    });
    expect(unlockBtn).toBeDefined();

    act(() => {
      unlockBtn.props.onPress();
    });

    expect(useProgress.getState().adventure.unlocked).toBe(levelsData.length);

    act(() => {
      tree.unmount();
    });
  });

  test('does not render "Unlock all levels" row when __DEV__ is false', () => {
    const originalDev = global.__DEV__;
    try {
      global.__DEV__ = false;
      let tree;
      act(() => {
        tree = renderer.create(<SettingsScreen />);
      });

      const root = tree.root;
      const texts = root.findAllByType('Text').map((t) => t.props.children);
      expect(texts).not.toContain('Unlock all levels');

      const unlockButtons = root.findAllByProps({
        accessibilityLabel: 'Unlock all levels',
      });
      expect(unlockButtons.length).toBe(0);

      act(() => {
        tree.unmount();
      });
    } finally {
      global.__DEV__ = originalDev;
    }
  });
});
