import { Stack } from 'expo-router';
import { usePathname, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { PaperProvider } from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import 'react-native-reanimated';
import { AppDarkTheme, AppLightTheme } from '@/lib/theme';
import { AuthProvider, useAuthContext } from '@/lib/auth/auth-context';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(drawer)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return <RootLayoutNav />;
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();
  const paperTheme = colorScheme === 'dark' ? AppDarkTheme : AppLightTheme;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider theme={paperTheme}>
        <AuthProvider>
          <AuthGate />
        </AuthProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

function AuthGate(): JSX.Element {
  const router = useRouter();
  const pathname = usePathname();
  const { isHydrating, isAuthenticated } = useAuthContext();

  useEffect(() => {
    if (isHydrating) {
      return;
    }
    const isAuthRoute: boolean = pathname.startsWith('/auth');
    if (!isAuthenticated && !isAuthRoute) {
      router.replace('/auth/login' as any);
      return;
    }
    if (isAuthenticated && isAuthRoute) {
      router.replace('/(drawer)/(tabs)/' as any);
    }
  }, [isHydrating, isAuthenticated, pathname, router]);

  return (
    <Stack>
      <Stack.Screen name="(drawer)" options={{ headerShown: false }} />
      <Stack.Screen name="post/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="auth" options={{ headerShown: false }} />
    </Stack>
  );
}
