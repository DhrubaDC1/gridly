import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TabsLayout from '../../../app/(tabs)/_layout';

let mockTabsProps = null;
const mockScreens = [];

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => {
  const React = require('react');
  const Tabs = (props) => {
    mockTabsProps = props;
    return React.createElement('Tabs', null, props.children);
  };
  Tabs.Screen = (props) => {
    mockScreens.push(props);
    return null;
  };
  return { Tabs };
});

const NAMES = ['index', 'leaderboards', 'achievements', 'stats', 'profile'];

function renderTabBar(activeName) {
  const navigateToTab = jest.fn();
  const emitter = { emit: jest.fn(() => ({ defaultPrevented: false })) };
  const state = {
    index: NAMES.indexOf(activeName),
    routes: NAMES.map((name) => ({ key: `${name}-key`, name })),
  };
  let bar;
  act(() => {
    bar = renderer.create(mockTabsProps.tabBar({ state, emitter, navigateToTab }));
  });
  return { bar, navigateToTab, emitter };
}

describe('Tabs layout', () => {
  beforeAll(() => {
    act(() => {
      renderer.create(<TabsLayout />);
    });
  });

  test('registers the five tab screens, Home without a header', () => {
    expect(mockScreens.map((s) => s.name)).toEqual(NAMES);
    expect(mockScreens[0].options.headerShown).toBe(false);
    expect(mockScreens.find((s) => s.name === 'stats').options.headerShown).toBe(false);
  });

  test.each([
    ['View Leaderboards', 'leaderboards'],
    ['View Achievements', 'achievements'],
    ['View Stats', 'stats'],
    ['View Profile', 'profile'],
    ['Home', 'index'],
  ])('%s navigates to the %s tab', (label, name) => {
    const { bar, navigateToTab, emitter } = renderTabBar('stats');
    act(() => {
      bar.root.findByProps({ accessibilityLabel: label }).props.onPress();
    });
    expect(emitter.emit).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'tabPress', target: `${name}-key` })
    );
    if (name === 'stats') expect(navigateToTab).not.toHaveBeenCalled();
    else expect(navigateToTab).toHaveBeenCalledWith(`${name}-key`);
  });

  test('marks only the focused tab as selected on every tab', () => {
    for (const name of NAMES) {
      const { bar } = renderTabBar(name);
      const selected = bar.root
        .findAll((n) => n.props.accessibilityState?.selected === true && n.props.onPress)
        .filter((n, i, all) => all.findIndex((m) => m.props.accessibilityLabel === n.props.accessibilityLabel) === i);
      expect(selected).toHaveLength(1);
    }
  });
});
