import { StyleSheet, Text, View, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '../../src/ui/theme';

export default function AdventureMapScreen() {
  const router = useRouter();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Adventure</Text>
        <Text style={[styles.body, { color: theme.inkMuted }]}>
          50 handcrafted levels with gems, locks, move limits, and 3-star
          challenges.
        </Text>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Play Level 1"
          style={({ pressed }) => [
            styles.button,
            {
              backgroundColor: theme.accent,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
          onPress={() => router.push('/adventure/1')}
        >
          <Text style={styles.buttonText}>Play level 1</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
  },
  title: {
    fontFamily: 'Unbounded_600SemiBold',
    fontSize: 24,
    marginBottom: 12,
  },
  body: {
    fontFamily: 'Figtree_400Regular',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  button: {
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 14,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: 'Figtree_600SemiBold',
    fontSize: 16,
    color: '#FFFFFF',
  },
});
