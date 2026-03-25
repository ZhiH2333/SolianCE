import { useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Button, Card, TextInput, useTheme } from 'react-native-paper';

export default function RegisterScreen(): ReactElement {
  const theme = useTheme();
  const router = useRouter();

  type RegisterParams = { captchaToken?: string | string[] };
  const params = useLocalSearchParams<RegisterParams>();
  const derivedCaptchaToken: string = typeof params.captchaToken === 'string' ? params.captchaToken : '';

  const [name, setName] = useState<string>('');
  const [nick, setNick] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string>(derivedCaptchaToken);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    setCaptchaToken(derivedCaptchaToken);
  }, [derivedCaptchaToken]);

  const canSubmitName: boolean = useMemo(() => {
    const trimmed: string = name.trim();
    if (trimmed.length < 4 || trimmed.length > 32) {
      return false;
    }
    return /^[a-zA-Z0-9_]+$/.test(trimmed);
  }, [name]);

  const canSubmitNick: boolean = useMemo(() => {
    const trimmed: string = nick.trim();
    return trimmed.length >= 4 && trimmed.length <= 32;
  }, [nick]);

  const canSubmitEmail: boolean = useMemo(() => {
    const trimmed: string = email.trim();
    if (!trimmed) {
      return false;
    }
    const emailRegex: RegExp = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed);
  }, [email]);

  const canSubmitPassword: boolean = useMemo(() => {
    const trimmed: string = password.trim();
    return trimmed.length >= 8;
  }, [password]);

  const canSubmit: boolean = useMemo(() => {
    return canSubmitName && canSubmitNick && canSubmitEmail && canSubmitPassword && captchaToken.trim().length > 0;
  }, [canSubmitEmail, canSubmitName, canSubmitNick, canSubmitPassword, captchaToken]);

  async function executeRegister(): Promise<void> {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      // mock: 模拟服务端校验通过并创建账号
      await new Promise<void>((resolve) => setTimeout(resolve, 650));

      Alert.alert('注册成功', '账号已创建，请返回登录页面继续。', [
        {
          text: '去登录',
          onPress: () => router.replace('/auth/login' as any),
        },
      ]);
    } catch (error) {
      Alert.alert('注册失败', error instanceof Error ? error.message : '创建账号失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="创建账号" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card mode="elevated" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <Card.Content style={{ gap: 12 }}>
            <TextInput label="用户名" value={name} onChangeText={setName} autoCapitalize="none" />
            <TextInput label="昵称" value={nick} onChangeText={setNick} />
            <TextInput label="邮箱" value={email} onChangeText={setEmail} autoCapitalize="none" keyboardType="email-address" />
            <TextInput label="密码（至少 8 位）" value={password} onChangeText={setPassword} secureTextEntry autoCapitalize="none" />
            <TextInput
              label="验证码 token"
              value={captchaToken}
              onChangeText={setCaptchaToken}
              autoCapitalize="none"
            />
            <Button
              mode="contained-tonal"
              onPress={() => {
                setCaptchaToken('');
                router.push('/auth/captcha' as any);
              }}
            >
              打开 Captcha 页面
            </Button>
            <Button mode="contained" onPress={executeRegister} disabled={!canSubmit || isSubmitting}>
              注册
            </Button>
            {isSubmitting && <ActivityIndicator />}
          </Card.Content>
        </Card>
        <Link href="/auth/login" asChild>
          <Button mode="text">已有账号？去登录</Button>
        </Link>
      </ScrollView>
    </View>
  );
}
