import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../src/ui/theme';

export default function BlitzScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.bg }]}>
      <View style={[styles.card, { backgroundColor: theme.surface }]}>
        <Text style={[styles.title, { color: theme.ink }]}>Blitz mode</Text>
        <Text style={[styles.body, { color: theme.inkMuted }]}>
          90-second sprint. Each clear adds +2s up to 120s max. Quick drops earn
          a speed bonus.
        </Text>
        <Text style={[styles.status, { color: theme.accent }]}>
          Fast-paced timer action arriving in Phase 3.
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
