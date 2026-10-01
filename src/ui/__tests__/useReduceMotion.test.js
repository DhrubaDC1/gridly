import React from 'react';
import { AccessibilityInfo } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import { useSettings } from '../../store/useSettings';
import useReduceMotion from '../useReduceMotion';

describe('useReduceMotion', () => {
  beforeEach(() => {
    act(() => {
      useSettings.getState().resetSettings();
    });
    jest.restoreAllMocks();
  });

  test('returns true when reduceMotion setting is "on"', () => {
    act(() => {
      useSettings.getState().setReduceMotion('on');
    });
    let value;
    function TestComponent() {
      value = useReduceMotion();
      return null;
    }
    let tree;
    act(() => {
      tree = renderer.create(<TestComponent />);
    });
    expect(value).toBe(true);
    act(() => {
      tree.unmount();
    });
  });

  test('returns false when reduceMotion setting is "off"', () => {
    act(() => {
      useSettings.getState().setReduceMotion('off');
    });
    let value;
    function TestComponent() {
      value = useReduceMotion();
      return null;
    }
    let tree;
    act(() => {
      tree = renderer.create(<TestComponent />);
    });
    expect(value).toBe(false);
    act(() => {
      tree.unmount();
    });
  });

  test('dynamically updates when setting changes between on, off, and system', () => {
    let value;
    function TestComponent() {
      value = useReduceMotion();
      return null;
    }
    let tree;
    act(() => {
      tree = renderer.create(<TestComponent />);
    });
    expect(value).toBe(false);

    act(() => {
      useSettings.getState().setReduceMotion('on');
    });
    expect(value).toBe(true);

    act(() => {
      useSettings.getState().setReduceMotion('off');
    });
    expect(value).toBe(false);

    act(() => {
      useSettings.getState().setReduceMotion('system');
    });
    expect(value).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  test('follows system setting when reduceMotion is "system"', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    let value;
    function TestComponent() {
      value = useReduceMotion();
      return null;
    }
    let tree;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
    });
    expect(value).toBe(true);
    act(() => {
      tree.unmount();
    });
  });

  test('updates when system reduce motion changed event fires in "system" mode', () => {
    let changeHandler;
    jest.spyOn(AccessibilityInfo, 'addEventListener').mockImplementation((event, handler) => {
      if (event === 'reduceMotionChanged') {
        changeHandler = handler;
      }
      return { remove: jest.fn() };
    });

    let value;
    function TestComponent() {
      value = useReduceMotion();
      return null;
    }
    let tree;
    act(() => {
      tree = renderer.create(<TestComponent />);
    });
    expect(value).toBe(false);

    act(() => {
      changeHandler?.(true);
    });
    expect(value).toBe(true);

    act(() => {
      changeHandler?.(false);
    });
    expect(value).toBe(false);

    act(() => {
      tree.unmount();
    });
  });

  test('"off" overrides system preference even if system reduce motion is true', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(true);
    act(() => {
      useSettings.getState().setReduceMotion('off');
    });
    let value;
    function TestComponent() {
      value = useReduceMotion();
      return null;
    }
    let tree;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
    });
    expect(value).toBe(false);
    act(() => {
      tree.unmount();
    });
  });

  test('"on" overrides system preference even if system reduce motion is false', async () => {
    jest.spyOn(AccessibilityInfo, 'isReduceMotionEnabled').mockResolvedValue(false);
    act(() => {
      useSettings.getState().setReduceMotion('on');
    });
    let value;
    function TestComponent() {
      value = useReduceMotion();
      return null;
    }
    let tree;
    await act(async () => {
      tree = renderer.create(<TestComponent />);
    });
    expect(value).toBe(true);
    act(() => {
      tree.unmount();
    });
  });
});
