import { useFonts } from 'expo-font';
import {
  Figtree_400Regular,
  Figtree_500Medium,
  Figtree_600SemiBold,
} from '@expo-google-fonts/figtree';
import {
  Unbounded_600SemiBold,
  Unbounded_700Bold,
} from '@expo-google-fonts/unbounded';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../src/ui/theme';
import Toast from '../src/ui/components/Toast';
import BackButton from '../src/ui/components/BackButton';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
  });

  const theme = useTheme();

  if (!fontsLoaded) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: theme.bg }}>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: theme.bg },
          headerTintColor: theme.ink,
          headerTitleAlign: 'center',
          headerLeft: () => <BackButton />,
          headerTitleStyle: {
            fontFamily: 'Figtree_600SemiBold',
            fontSize: 16,
          },
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.bg },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="classic" options={{ title: 'Classic' }} />
        <Stack.Screen name="blitz" options={{ title: 'Blitz' }} />
        <Stack.Screen name="adventure/index" options={{ title: 'Adventure' }} />
        <Stack.Screen name="adventure/[level]" options={{ title: 'Adventure' }} />
        <Stack.Screen name="leaderboards" options={{ title: 'Leaderboards' }} />
        <Stack.Screen name="achievements" options={{ title: 'Achievements' }} />
        <Stack.Screen name="stats" options={{ title: 'Stats' }} />
        <Stack.Screen name="settings" options={{ title: 'Settings' }} />
        <Stack.Screen name="profile" options={{ title: 'Profile' }} />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
  );
}
