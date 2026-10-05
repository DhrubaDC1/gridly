import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../../src/ui/theme';

export default function ProfileScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Profile</Text>
        <Text style={[styles.body, { color: theme.inkMuted }]}>
          Keep your progress safe across devices, link email or Apple ID, and
          manage your player name.
        </Text>
        <Text style={[styles.status, { color: theme.accent }]}>
          Account linking and cloud sync arriving in Phase 4.
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
