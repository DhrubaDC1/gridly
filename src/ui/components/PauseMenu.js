import React from 'react';
import { StyleSheet, View, Text, Pressable, Modal } from 'react-native';
import { useTheme } from '../theme';

/**
 * PauseMenu overlay displaying "Resume", "Restart", and "Quit to home" buttons.
 *
 * @param {Object} props
 * @param {boolean} props.visible
 * @param {() => void} props.onResume
 * @param {() => void} props.onRestart
 * @param {() => void} props.onQuit
 * @param {any} [props.theme]
 */
export default function PauseMenu({
  visible,
  onResume,
  onRestart,
  onQuit,
  theme: customTheme,
}) {
  const defaultTheme = useTheme();
  const theme = customTheme || defaultTheme;

  return (
    <Modal
      visible={Boolean(visible)}
      transparent
      animationType="none"
      statusBarTranslucent
      navigationBarTranslucent
      onRequestClose={onResume}
    >
      <View
        style={[styles.overlay, { backgroundColor: theme.scrim }]}
        testID="pause-menu-overlay"
      >
        <View style={[styles.card, { backgroundColor: theme.surface }]}>
          <Text style={[styles.title, { color: theme.ink }]}>Paused</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Resume"
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.accent,
                opacity: pressed ? 0.9 : 1,
              },
            ]}
            onPress={onResume}
          >
            <Text style={[styles.primaryButtonText, { color: theme.onAccent }]}>
              Resume
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restart"
            style={({ pressed }) => [
              styles.button,
              {
                backgroundColor: theme.well,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={onRestart}
          >
            <Text style={[styles.secondaryButtonText, { color: theme.ink }]}>
              Restart
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Quit to home"
            style={({ pressed }) => [
              styles.button,
              styles.tertiaryButton,
              {
                opacity: pressed ? 0.7 : 1,
              },
            ]}
            onPress={onQuit}
          >
            <Text style={[styles.tertiaryButtonText, { color: theme.inkMuted }]}>
              Quit to home
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 320,
    borderRadius: 24,
    paddingVertical: 32,
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 20,
    marginBottom: 24,
  },
  button: {
    width: '100%',
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  primaryButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  secondaryButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
  tertiaryButton: {
    backgroundColor: 'transparent',
  },
  tertiaryButtonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
  },
});
