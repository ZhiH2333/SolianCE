import { useMemo, useState } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Button, Card, HelperText, Text, TextInput, useTheme } from 'react-native-paper';
import type { AuthFactor } from '@/lib/api/types';
import {
  createAuthChallenge,
  createDefaultChallengePayload,
  exchangeAuthorizationCode,
  getChallengeFactors,
  patchAuthChallenge,
  triggerChallengeFactor,
} from '@/lib/api/client';
import { useAuthContext } from '@/lib/auth/auth-context';
import { getFactorLabel } from '@/lib/auth/factor';

type LoginStep = 'lookup' | 'factor' | 'verify';

export default function LoginScreen(): JSX.Element {
  const theme = useTheme();
  const router = useRouter();
  const { executeSignIn } = useAuthContext();
  const [step, setStep] = useState<LoginStep>('lookup');
  const [account, setAccount] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [stepRemain, setStepRemain] = useState<number>(0);
  const [factors, setFactors] = useState<AuthFactor[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<AuthFactor | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canSubmitAccount: boolean = useMemo(() => account.trim().length > 0, [account]);
  const canSubmitVerify: boolean = useMemo(
    () => challengeId.length > 0 && selectedFactor !== null && secret.trim().length > 0,
    [challengeId, selectedFactor, secret],
  );

  async function executeLookup(): Promise<void> {
    if (!canSubmitAccount) {
      return;
    }
    setIsSubmitting(true);
    try {
      const challenge = await createAuthChallenge(createDefaultChallengePayload(account.trim()));
      const items = await getChallengeFactors(challenge.id);
      setChallengeId(challenge.id);
      setStepRemain(challenge.stepRemain);
      setFactors(items);
      if (items.length === 1) {
        setSelectedFactor(items[0]);
        await triggerChallengeFactor(challenge.id, items[0].id);
        setStep('verify');
      } else {
        setStep('factor');
      }
    } catch (error) {
      Alert.alert('登录失败', error instanceof Error ? error.message : '创建登录挑战失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function executeChooseFactor(item: AuthFactor): Promise<void> {
    setIsSubmitting(true);
    try {
      await triggerChallengeFactor(challengeId, item.id);
      setSelectedFactor(item);
      setSecret('');
      setStep('verify');
    } catch (error) {
      Alert.alert('选择因子失败', error instanceof Error ? error.message : '触发认证因子失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function executeVerify(): Promise<void> {
    if (!selectedFactor || !canSubmitVerify) {
      return;
    }
    setIsSubmitting(true);
    try {
      const challengeResult = await patchAuthChallenge(challengeId, {
        factorId: selectedFactor.id,
        password: secret.trim(),
      });
      const remains: number = challengeResult.stepRemain;
      setStepRemain(remains);
      if (remains > 0) {
        setStep('factor');
        setSecret('');
        return;
      }
      const pair = await exchangeAuthorizationCode(challengeResult.id);
      await executeSignIn(pair);
      router.replace('/(drawer)/(tabs)/' as any);
    } catch (error) {
      Alert.alert('验证失败', error instanceof Error ? error.message : '认证校验失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: theme.colors.background }}>
      <Appbar.Header style={{ backgroundColor: theme.colors.surface }}>
        <Appbar.Content title="登录" />
      </Appbar.Header>
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12 }}>
        <Card mode="elevated">
          <Card.Content style={{ gap: 12 }}>
            {step === 'lookup' && (
              <>
                <Text variant="titleMedium">输入账户</Text>
                <TextInput label="用户名 / 邮箱" value={account} onChangeText={setAccount} autoCapitalize="none" />
                <HelperText type="info">将调用 /padlock/auth/challenge 创建登录挑战。</HelperText>
                <Button mode="contained" onPress={executeLookup} disabled={!canSubmitAccount || isSubmitting}>
                  继续
                </Button>
              </>
            )}

            {step === 'factor' && (
              <>
                <Text variant="titleMedium">选择认证因子</Text>
                <HelperText type="info">剩余认证步骤：{stepRemain}</HelperText>
                {factors.map((factor) => (
                  <Button
                    key={`${factor.id}-${factor.type}`}
                    mode={selectedFactor?.id === factor.id ? 'contained' : 'outlined'}
                    onPress={() => executeChooseFactor(factor)}
                    disabled={isSubmitting}
                  >
                    {getFactorLabel(factor.type)}
                  </Button>
                ))}
              </>
            )}

            {step === 'verify' && (
              <>
                <Text variant="titleMedium">输入验证信息</Text>
                <HelperText type="info">
                  当前因子：{selectedFactor ? getFactorLabel(selectedFactor.type) : '未选择'}
                </HelperText>
                <TextInput
                  label={selectedFactor?.type === 0 ? '密码' : '验证码 / PIN'}
                  value={secret}
                  onChangeText={setSecret}
                  secureTextEntry={selectedFactor?.type === 0}
                  autoCapitalize="none"
                />
                <Button mode="contained" onPress={executeVerify} disabled={!canSubmitVerify || isSubmitting}>
                  完成登录
                </Button>
              </>
            )}

            {isSubmitting && <ActivityIndicator />}
          </Card.Content>
        </Card>

        <Button mode="text" onPress={() => router.push('/auth/captcha' as any)}>
          获取验证码 Token
        </Button>
        <Link href="/auth/register" asChild>
          <Button mode="text">还没有账号？去注册</Button>
        </Link>
      </ScrollView>
    </View>
  );
}
