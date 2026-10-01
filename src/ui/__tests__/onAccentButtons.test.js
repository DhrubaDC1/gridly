import React from 'react';
import { StyleSheet } from 'react-native';
import renderer, { act } from 'react-test-renderer';
import HomeScreen from '../../../app/index';
import PauseMenu from '../components/PauseMenu';
import GameOver from '../components/GameOver';
import Segmented from '../components/Segmented';
import HandHint from '../components/HandHint';
import Cell from '../components/Cell';
import { resolveTheme } from '../theme';
import { useSettings } from '../../store/useSettings';

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 44, bottom: 34, left: 0, right: 0 }),
}));

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
}));

jest.mock('react-native-reanimated', () => {
  const React = require('react');
  const View = require('react-native').View;
  return {
    __esModule: true,
    default: {
      View: (props) => React.createElement(View, props),
    },
    useSharedValue: (init) => ({ value: init }),
    useAnimatedStyle: (fn) => fn(),
    withRepeat: (anim) => anim,
    withSequence: (...anims) => anims[0],
    withTiming: (toValue) => toValue,
    withDelay: (_delay, anim) => anim,
    cancelAnimation: jest.fn(),
    Easing: {
      inOut: jest.fn(() => jest.fn()),
      cubic: jest.fn(),
    },
  };
});

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

describe('T03 - onAccent acceptance: in dark mode, text on periwinkle buttons is dark and crisp', () => {
  const darkTheme = resolveTheme('dark', 'dark');
  const lightTheme = resolveTheme('light', 'light');

  test('"Play Classic" button in dark mode has dark crisp text (#0E1218) and subtitle at 0.8 opacity', () => {
    act(() => {
      useSettings.getState().setTheme('dark');
    });

    let tree;
    act(() => {
      tree = renderer.create(<HomeScreen />);
    });

    const classicBtn = tree.root.findByProps({ accessibilityLabel: 'Play Classic mode' });
    const texts = classicBtn.findAllByType('Text');
    const titleText = texts.find((t) => t.props.children === 'Play Classic');
    const subText = texts.find((t) => t.props.children === 'Endless relaxing puzzle');

    const titleStyle = StyleSheet.flatten(titleText.props.style);
    expect(titleStyle.color).toBe(darkTheme.onAccent);
    expect(titleStyle.color).toBe('#0E1218');

    const subStyle = StyleSheet.flatten(subText.props.style);
    expect(subStyle.color).toBe(darkTheme.onAccent);
    expect(subStyle.color).toBe('#0E1218');
    expect(subStyle.opacity).toBe(0.8);

    act(() => {
      tree.unmount();
    });
  });

  test('"Resume" button in dark mode has dark crisp text (#0E1218)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <PauseMenu visible={true} theme={darkTheme} onResume={jest.fn()} onRestart={jest.fn()} onQuit={jest.fn()} />
      );
    });

    const resumeBtn = tree.root.findByProps({ accessibilityLabel: 'Resume' });
    const resumeText = resumeBtn.findByType('Text');
    const resumeStyle = StyleSheet.flatten(resumeText.props.style);

    expect(resumeStyle.color).toBe(darkTheme.onAccent);
    expect(resumeStyle.color).toBe('#0E1218');

    act(() => {
      tree.unmount();
    });
  });

  test('"Play again" button in dark mode has dark crisp text (#0E1218)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver visible={true} theme={darkTheme} score={1200} onPlayAgain={jest.fn()} onHome={jest.fn()} />
      );
    });

    const playAgainBtn = tree.root.findByProps({ accessibilityLabel: 'Play again' });
    const playAgainText = playAgainBtn.findByType('Text');
    const playAgainStyle = StyleSheet.flatten(playAgainText.props.style);

    expect(playAgainStyle.color).toBe(darkTheme.onAccent);
    expect(playAgainStyle.color).toBe('#0E1218');

    act(() => {
      tree.unmount();
    });
  });

  test('"Next level" button in dark mode has dark crisp text (#0E1218)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          mode="adventure"
          overReason="levelComplete"
          theme={darkTheme}
          score={2000}
          stars={3}
          onNextLevel={jest.fn()}
        />
      );
    });

    const nextLevelBtn = tree.root.findByProps({ accessibilityLabel: 'Next level' });
    const nextLevelText = nextLevelBtn.findByType('Text');
    const nextLevelStyle = StyleSheet.flatten(nextLevelText.props.style);

    expect(nextLevelStyle.color).toBe(darkTheme.onAccent);
    expect(nextLevelStyle.color).toBe('#0E1218');

    act(() => {
      tree.unmount();
    });
  });

  test('"Try again" button in dark mode has dark crisp text (#0E1218)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <GameOver
          visible={true}
          mode="adventure"
          overReason="outOfMoves"
          theme={darkTheme}
          score={800}
          onPlayAgain={jest.fn()}
        />
      );
    });

    const tryAgainBtn = tree.root.findByProps({ accessibilityLabel: 'Try again' });
    const tryAgainText = tryAgainBtn.findByType('Text');
    const tryAgainStyle = StyleSheet.flatten(tryAgainText.props.style);

    expect(tryAgainStyle.color).toBe(darkTheme.onAccent);
    expect(tryAgainStyle.color).toBe('#0E1218');

    act(() => {
      tree.unmount();
    });
  });

  test('Segmented selected option in dark mode has dark crisp text (#0E1218)', () => {
    let tree;
    act(() => {
      tree = renderer.create(
        <Segmented
          options={['System', 'Dark']}
          value="Dark"
          theme={darkTheme}
          onChange={jest.fn()}
        />
      );
    });

    const darkBtn = tree.root.findByProps({ accessibilityLabel: 'Dark' });
    const darkText = darkBtn.findByType('Text');
    const textStyle = StyleSheet.flatten(darkText.props.style);

    expect(textStyle.color).toBe(darkTheme.onAccent);
    expect(textStyle.color).toBe('#0E1218');

    act(() => {
      tree.unmount();
    });
  });

  test('HandHint border and inner dot use theme.onAccent (#0E1218 in dark, #FFFFFF in light)', () => {
    let darkTree;
    act(() => {
      darkTree = renderer.create(
        <HandHint
          visible={true}
          startPos={{ x: 50, y: 50 }}
          endPos={{ x: 100, y: 100 }}
          theme={darkTheme}
        />
      );
    });

    const darkCircle = darkTree.root.findByProps({ testID: 'hand-hint' });
    const darkCircleStyle = StyleSheet.flatten(darkCircle.props.style);
    expect(darkCircleStyle.borderColor).toBe(darkTheme.onAccent);
    expect(darkCircleStyle.borderColor).toBe('#0E1218');

    const darkDot = darkTree.root.findByProps({ testID: 'hand-hint-dot' });
    const darkDotStyle = StyleSheet.flatten(darkDot.props.style);
    expect(darkDotStyle.backgroundColor).toBe(darkTheme.onAccent);
    expect(darkDotStyle.backgroundColor).toBe('#0E1218');

    act(() => {
      darkTree.unmount();
    });

    let lightTree;
    act(() => {
      lightTree = renderer.create(
        <HandHint
          visible={true}
          startPos={{ x: 50, y: 50 }}
          endPos={{ x: 100, y: 100 }}
          theme={lightTheme}
        />
      );
    });

    const lightCircle = lightTree.root.findByProps({ testID: 'hand-hint' });
    const lightCircleStyle = StyleSheet.flatten(lightCircle.props.style);
    expect(lightCircleStyle.borderColor).toBe(lightTheme.onAccent);
    expect(lightCircleStyle.borderColor).toBe('#FFFFFF');

    const lightDot = lightTree.root.findByProps({ testID: 'hand-hint-dot' });
    const lightDotStyle = StyleSheet.flatten(lightDot.props.style);
    expect(lightDotStyle.backgroundColor).toBe(lightTheme.onAccent);
    expect(lightDotStyle.backgroundColor).toBe('#FFFFFF');

    act(() => {
      lightTree.unmount();
    });
  });

  test('Cell uses theme.ink token for lock cells', () => {
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
          hp={1}
          theme={darkTheme}
        />
      );
    });

    const strokeRect = darkTree.root.findAllByType('RoundedRect').find((r) => r.props.style === 'stroke');
    expect(strokeRect.props.color).toBe(darkTheme.ink);
    expect(strokeRect.props.color).toBe('#ECEFF5');

    act(() => {
      darkTree.unmount();
    });

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
          hp={1}
          theme={lightTheme}
        />
      );
    });

    const strokeRectLight = lightTree.root.findAllByType('RoundedRect').find((r) => r.props.style === 'stroke');
    expect(strokeRectLight.props.color).toBe(lightTheme.ink);
    expect(strokeRectLight.props.color).toBe('#1B1F2A');

    act(() => {
      lightTree.unmount();
    });
  });
});
