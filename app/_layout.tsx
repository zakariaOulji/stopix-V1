import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { SpaceGrotesk_500Medium, SpaceGrotesk_700Bold } from '@expo-google-fonts/space-grotesk';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useAuthStore, useTourneeStore } from '@/stores';
import { initAuthToken } from '@/api';
import { ENV } from '@/config/env';
import { colors } from '@/theme';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });
  const hydrated = useAuthStore((s) => s._hasHydrated);
  const ready = (fontsLoaded || fontError) && hydrated;

  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // Restore token + Supabase session on startup.
  useEffect(() => {
    initAuthToken();
    useAuthStore.getState().restore();
  }, []);

  // In Supabase mode, load real tournées once authenticated.
  useEffect(() => {
    if (isAuthenticated && !ENV.USE_MOCKS) {
      useTourneeStore.getState().load().catch(() => {});
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaProvider>
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background },
            animation: 'slide_from_right',
          }}
        >
          <Stack.Screen name="index" />
          <Stack.Screen name="onboarding" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="notifications" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="tournees/[id]/index" />
          <Stack.Screen
            name="tournees/[id]/execute"
            options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
          />
          <Stack.Screen name="tournees/create/index" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="tournees/[id]/reuse" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="tournees/[id]/edit" options={{ animation: 'slide_from_bottom' }} />
          <Stack.Screen name="tournees/[id]/map" options={{ animation: 'slide_from_bottom' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
