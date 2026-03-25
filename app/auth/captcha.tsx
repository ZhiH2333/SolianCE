import { useState } from 'react';
import type { ReactElement } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { Appbar, Button, Card, Text, useTheme } from 'react-native-paper';

function generateMockCaptchaToken(): string {
  const randomPart: string = Math.random().toString(36).slice(2);
  return `mock_captcha_tk.${Date.now()}.${randomPart}`;
}

export default function CaptchaScreen(): ReactElement {
  const theme = useTheme();
  const router = useRouter();
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [isCompletingCaptcha, setIsCompletingCaptcha] = useState<boolean>(false);

  async function executeCompleteCaptcha(): Promise<void> {
    setIsCompletingCaptcha(true);
    try {
      // mock: 模拟完成验证并获取 captcha_tk
      await new Promise<void>((resolve) => setTimeout(resolve, 500));
      const token: string = generateMockCaptchaToken();
      setCaptchaToken(token);
      router.replace(`/auth/register?captchaToken=${encodeURIComponent(token)}` as any);
    } finally {
      setIsCompletingCaptcha(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Captcha" />
      </Appbar.Header>
      <View style={{ padding: 16 }}>
        <Card mode="elevated">
          <Card.Content style={{ gap: 12 }}>
            <Text variant="bodyMedium">按 v2：完成 reCaptcha 验证后回传 `captcha_tk`（当前为 mock 流程）。</Text>
            <View
              style={{
                height: 240,
                borderRadius: 14,
                borderWidth: 1,
                borderColor: theme.colors.outlineVariant,
                backgroundColor: theme.colors.surfaceVariant,
                alignItems: 'center',
                justifyContent: 'center',
                padding: 12,
              }}
            >
              <Text variant="bodySmall">Captcha WebView 区域（mock）</Text>
            </View>
            <Button
              mode="contained"
              onPress={executeCompleteCaptcha}
              loading={isCompletingCaptcha}
              disabled={isCompletingCaptcha}
            >
              完成验证码
            </Button>
            {captchaToken ? <Text variant="bodySmall">captcha_tk 已生成：{captchaToken}</Text> : null}
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}
