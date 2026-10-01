import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { useSettings } from '../../store/useSettings';
import useReduceMotion from '../useReduceMotion';

describe('useReduceMotion', () => {
  beforeEach(() => {
    act(() => {
      useSettings.getState().resetSettings();
    });
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
});
