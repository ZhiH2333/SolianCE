import { useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Button, Text } from 'react-native-paper';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { V3_AUTH, V3_PILL_RADIUS } from '@/lib/auth/v3-auth-theme';

function generateMockCaptchaToken(): string {
  const randomPart: string = Math.random().toString(36).slice(2);
  return `mock_captcha_tk.${Date.now()}.${randomPart}`;
}

export default function CaptchaScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [isCompletingCaptcha, setIsCompletingCaptcha] = useState<boolean>(false);

  async function executeCompleteCaptcha(): Promise<void> {
    setIsCompletingCaptcha(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      const token: string = generateMockCaptchaToken();
      router.replace(`/auth/register?captchaToken=${encodeURIComponent(token)}` as any);
    } finally {
      setIsCompletingCaptcha(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: V3_AUTH.pageBg, paddingTop: insets.top }}>
      <Appbar.Header mode="center-aligned" style={{ backgroundColor: V3_AUTH.pageBg, elevation: 0 }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Anti-Robot" titleStyle={{ fontWeight: '600', color: V3_AUTH.textPrimary }} />
      </Appbar.Header>
      <View style={{ flex: 1, paddingHorizontal: 20, paddingTop: 16 }}>
        <Text variant="bodyMedium" style={{ color: V3_AUTH.textMuted, marginBottom: 16, lineHeight: 22 }}>
          Complete the verification below (mock WebView area). After verification, you will return to create your account.
        </Text>
        <View
          style={{
            flex: 1,
            minHeight: 280,
            borderRadius: V3_PILL_RADIUS,
            borderWidth: 1,
            borderColor: V3_AUTH.inputBorder,
            backgroundColor: '#FFFFFF',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
          }}
        >
          {isCompletingCaptcha ? (
            <ActivityIndicator size="large" color={V3_AUTH.tealDark} />
          ) : (
            <Text style={{ color: V3_AUTH.textMuted, textAlign: 'center' }}>Captcha puzzle (mock)</Text>
          )}
        </View>
        <Button
          mode="contained"
          onPress={executeCompleteCaptcha}
          loading={isCompletingCaptcha}
          disabled={isCompletingCaptcha}
          buttonColor={V3_AUTH.tealDark}
          textColor="#FFFFFF"
          style={{ marginTop: 20, borderRadius: V3_PILL_RADIUS }}
          contentStyle={{ paddingVertical: 8 }}
        >
          Complete verification
        </Button>
      </View>
    </View>
  );
}
