import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Button, Card, TextInput, useTheme } from 'react-native-paper';
import { registerAccount, validateRegister } from '@/lib/api/client';

export default function RegisterScreen(): JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const [name, setName] = useState<string>('');
  const [nick, setNick] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canSubmit: boolean = useMemo(() => {
    return (
      name.trim().length >= 3 &&
      nick.trim().length >= 2 &&
      email.trim().includes('@') &&
      password.trim().length >= 8 &&
      captchaToken.trim().length > 0
    );
  }, [name, nick, email, password, captchaToken]);

  async function executeRegister(): Promise<void> {
    if (!canSubmit) {
      return;
    }
    setIsSubmitting(true);
    try {
      await validateRegister({ name: name.trim() });
      await validateRegister({ email: email.trim() });
      await registerAccount({
        captchaToken: captchaToken.trim(),
        name: name.trim(),
        nick: nick.trim(),
        email: email.trim(),
        password: password.trim(),
        language: 'zh-CN',
      });
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
        <Card mode="elevated">
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
            <Button mode="contained-tonal" onPress={() => router.push('/auth/captcha' as any)}>
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
