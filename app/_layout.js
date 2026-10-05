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
import { useEffect } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useTheme } from '../src/ui/theme';
import Toast from '../src/ui/components/Toast';
import BackButton from '../src/ui/components/BackButton';
import {
  startBackgroundMusic,
  setMusicTrack,
  trackForPath,
} from '../src/services/music';

// Keep the native splash up until fonts are ready, then fade into Home.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions?.({ duration: 300, fade: true });

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Figtree_400Regular,
    Figtree_500Medium,
    Figtree_600SemiBold,
    Unbounded_600SemiBold,
    Unbounded_700Bold,
  });

  const theme = useTheme();

  // Mounted once at the root so screen re-renders never restart the track
  useEffect(() => startBackgroundMusic(), []);
  const pathname = usePathname();
  useEffect(() => setMusicTrack(trackForPath(pathname)), [pathname]);

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded]);

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
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="classic" options={{ title: 'Classic' }} />
        <Stack.Screen name="blitz" options={{ title: 'Blitz' }} />
        <Stack.Screen name="adventure/index" options={{ headerShown: false }} />
        <Stack.Screen name="adventure/[level]" options={{ title: 'Adventure' }} />
        <Stack.Screen name="settings" options={{ headerShown: false }} />
      </Stack>
      <Toast />
    </GestureHandlerRootView>
  );
}
