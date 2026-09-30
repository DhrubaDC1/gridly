import { StyleSheet, Text, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { useTheme } from '../../src/ui/theme';

export default function AdventureLevelScreen() {
  const { level } = useLocalSearchParams();
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Level {level}</Text>
        <Text style={[styles.body, { color: theme.inkMuted }]}>
          Complete the level goals within the move limit to earn up to 3 stars.
        </Text>
        <Text style={[styles.status, { color: theme.accent }]}>
          Level gameplay arriving in Phase 3.
        </Text>
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
    marginBottom: 16,
  },
  status: {
    fontFamily: 'Figtree_500Medium',
    fontSize: 14,
  },
});
