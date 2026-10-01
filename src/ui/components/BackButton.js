import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../theme';
import Icon from './Icon';

/**
 * Standard navigation back button with a 44x44 touch target and Lucide arrow-left icon.
 *
 * @param {Object} props
 * @param {import('react-native').StyleProp<import('react-native').ViewStyle>} [props.style]
 * @param {() => void} [props.onPress]
 */
export default function BackButton({ style, onPress }) {
  const router = useRouter();
  const theme = useTheme();

  const handlePress = () => {
    if (onPress) {
      onPress();
      return;
    }
    const canGoBack =
      typeof router.canGoBack === 'function'
        ? router.canGoBack()
        : Boolean(router.canGoBack);

    if (canGoBack) {
      router.back();
    } else {
      router.replace('/');
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={handlePress}
      style={[styles.button, style]}
    >
      <Icon name="arrow-left" size={24} color={theme.ink} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
