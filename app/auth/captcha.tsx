import { useCallback, useEffect, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, View } from 'react-native';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Text } from 'react-native-paper';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { WebViewMessageEvent, WebViewNavigation } from 'react-native-webview';
import { WebView } from 'react-native-webview';
import { fetchPublicSiteBaseUrl } from '@/lib/api/http-client';
import { REGISTER_CAPTCHA_REDIRECT_URI } from '@/lib/auth/captcha-constants';
import { extractCaptchaTokenFromNavigationUrl, extractCaptchaTokenFromPostMessage } from '@/lib/auth/captcha-token';
import { V3_AUTH, V3_PILL_RADIUS } from '@/lib/auth/v3-auth-theme';

function buildCaptchaPageUri(siteBaseUrl: string): string {
  const base: string = siteBaseUrl.replace(/\/$/, '');
  const redirect: string = encodeURIComponent(REGISTER_CAPTCHA_REDIRECT_URI);
  return `${base}/auth/captcha?redirect_uri=${redirect}`;
}

export default function CaptchaScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [captchaUri, setCaptchaUri] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled: boolean = false;
    void (async (): Promise<void> => {
      try {
        const siteBase: string = await fetchPublicSiteBaseUrl();
        if (!cancelled) {
          setCaptchaUri(buildCaptchaPageUri(siteBase));
        }
      } catch (err) {
        if (!cancelled) {
          setLoadError(err instanceof Error ? err.message : '无法加载站点配置');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const executeReturnWithToken = useCallback(
    (token: string): void => {
      const trimmed: string = token.trim();
      if (!trimmed) {
        return;
      }
      router.replace(`/auth/register?captchaToken=${encodeURIComponent(trimmed)}` as any);
    },
    [router],
  );

  const handleShouldStartLoadWithRequest = useCallback(
    (request: WebViewNavigation): boolean => {
      const url: string = request.url;
      if (url.startsWith('soliance://')) {
        const token: string | null = extractCaptchaTokenFromNavigationUrl(url);
        if (token) {
          executeReturnWithToken(token);
        } else {
          Alert.alert('Verification', 'Could not read captcha token from redirect.');
        }
        return false;
      }
      return true;
    },
    [executeReturnWithToken],
  );

  const handleWebViewMessage = useCallback(
    (event: WebViewMessageEvent): void => {
      const token: string | null = extractCaptchaTokenFromPostMessage(String(event.nativeEvent.data ?? ''));
      if (token) {
        executeReturnWithToken(token);
      }
    },
    [executeReturnWithToken],
  );

  const handleNavigationStateChange = useCallback(
    (event: WebViewNavigation): void => {
      const url: string = event.url ?? '';
      if (!url.startsWith('soliance://')) {
        return;
      }
      const token: string | null = extractCaptchaTokenFromNavigationUrl(url);
      if (token) {
        executeReturnWithToken(token);
      }
    },
    [executeReturnWithToken],
  );

  return (
    <View style={{ flex: 1, backgroundColor: V3_AUTH.pageBg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: V3_AUTH.pageBg }}>
        <Appbar.Header
          mode="center-aligned"
          style={{ backgroundColor: V3_AUTH.pageBg, elevation: 0, marginTop: 0 }}
          statusBarHeight={0}
        >
          <Appbar.BackAction onPress={() => router.back()} />
          <Appbar.Content title="Anti-Robot" titleStyle={{ fontWeight: '600', color: V3_AUTH.textPrimary }} />
        </Appbar.Header>
      </SafeAreaView>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16, paddingBottom: insets.bottom + 16 }}>
        <Text variant="bodyMedium" style={{ color: V3_AUTH.textMuted, marginBottom: 16, lineHeight: 22 }}>
          Complete the verification below. After verification, you will return to create your account.
        </Text>
        <View
          style={{
            flex: 1,
            minHeight: 280,
            borderRadius: V3_PILL_RADIUS,
            borderWidth: 1,
            borderColor: V3_AUTH.inputBorder,
            backgroundColor: '#FFFFFF',
            overflow: 'hidden',
          }}
        >
          {loadError ? (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', padding: 16 }}>
              <Text style={{ color: V3_AUTH.textMuted, textAlign: 'center' }}>{loadError}</Text>
            </View>
          ) : captchaUri ? (
            <WebView
              source={{ uri: captchaUri }}
              style={{ flex: 1 }}
              onShouldStartLoadWithRequest={handleShouldStartLoadWithRequest}
              onNavigationStateChange={handleNavigationStateChange}
              onMessage={handleWebViewMessage}
              javaScriptEnabled
              domStorageEnabled
              thirdPartyCookiesEnabled
              sharedCookiesEnabled
              setSupportMultipleWindows={false}
            />
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
              <ActivityIndicator size="large" color={V3_AUTH.tealDark} />
            </View>
          )}
        </View>
      </View>
    </View>
  );
}
