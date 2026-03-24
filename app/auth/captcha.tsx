import { useState } from 'react';
import { Alert, Linking, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Appbar, Button, Card, Text, TextInput, useTheme } from 'react-native-paper';
import { getCaptchaBaseUrl } from '@/lib/api/client';

export default function CaptchaScreen(): JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const [captchaUrl, setCaptchaUrl] = useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  async function executeLoadCaptchaUrl(): Promise<void> {
    setIsLoading(true);
    try {
      const baseUrl: string = await getCaptchaBaseUrl();
      const url: string = `${baseUrl}/auth/captcha`;
      setCaptchaUrl(url);
      await Linking.openURL(url);
    } catch (error) {
      Alert.alert('加载失败', error instanceof Error ? error.message : '无法获取 Captcha 地址');
    } finally {
      setIsLoading(false);
    }
  }

  function executeCopyTip(): void {
    if (!captchaToken.trim()) {
      Alert.alert('提示', '请先输入 token。');
      return;
    }
    Alert.alert('已记录', '请手动复制该 token 到登录/注册页面。');
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
            <Text variant="bodyMedium">按 v3 流程，先打开 `/auth/captcha` 页面完成验证，再把 `captcha_tk` 填入登录或注册流程。</Text>
            <Button mode="contained" onPress={executeLoadCaptchaUrl} loading={isLoading} disabled={isLoading}>
              打开验证码页面
            </Button>
            {captchaUrl ? <Text variant="bodySmall">当前地址：{captchaUrl}</Text> : null}
            <TextInput
              label="粘贴 captcha_tk"
              value={captchaToken}
              onChangeText={setCaptchaToken}
              autoCapitalize="none"
            />
            <Button mode="contained-tonal" onPress={executeCopyTip}>
              我已复制 Token
            </Button>
          </Card.Content>
        </Card>
      </View>
    </View>
  );
}
