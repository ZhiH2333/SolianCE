import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Button, Card, HelperText, Text, TextInput, TouchableRipple, useTheme } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import type { AuthFactor } from '@/lib/api/types';
import type { TokenPair } from '@/lib/api/types';
import { useAuthContext } from '@/lib/auth/auth-context';
import { getFactorLabel } from '@/lib/auth/factor';

type LoginStep = 'lookup' | 'factor' | 'verify';

const MOCK_AUTH_ENABLED: boolean = true;
const MOCK_ACCESS_TOKEN_TTL_MS: number = 15 * 60 * 1000;
const MOCK_REFRESH_TOKEN_TTL_MS: number = 7 * 24 * 60 * 60 * 1000;

function createMockChallengeId(account: string): string {
  return `mock_challenge_${account}_${Date.now()}`;
}

function generateMockToken(prefix: string): string {
  const randomPart: string = Math.random().toString(36).slice(2);
  return `${prefix}.${Date.now()}.${randomPart}`;
}

function createMockTokenPair(): TokenPair {
  const nowMs: number = Date.now();
  return {
    token: generateMockToken('mock_access_token'),
    refreshToken: generateMockToken('mock_refresh_token'),
    expiresAt: new Date(nowMs + MOCK_ACCESS_TOKEN_TTL_MS).toISOString(),
    refreshExpiresAt: new Date(nowMs + MOCK_REFRESH_TOKEN_TTL_MS).toISOString(),
  };
}

function createMockFactors(): AuthFactor[] {
  return [
    { id: 1, type: 0, name: '密码' },
    { id: 2, type: 3, name: 'TOTP 动态码' },
    { id: 3, type: 4, name: 'PIN 码' },
  ];
}

interface FactorRowProps {
  factor: AuthFactor;
  isSelected: boolean;
  isDisabled: boolean;
  onPress: (factor: AuthFactor) => void;
}

function FactorRow({ factor, isSelected, isDisabled, onPress }: FactorRowProps): ReactElement {
  const theme = useTheme();
  const checkboxIconName: string = isSelected ? 'checkbox-marked' : 'checkbox-blank-outline';
  const iconName: string =
    factor.type === 0 ? 'lock' : factor.type === 3 ? 'timer-outline' : factor.type === 4 ? 'credit-card-outline' : 'help';
  return (
    <TouchableRipple
      onPress={() => onPress(factor)}
      disabled={isDisabled}
      rippleColor={theme.colors.primary + '22'}
      style={{
        borderRadius: 12,
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginVertical: 4,
        borderWidth: 1,
        borderColor: isSelected ? 'transparent' : theme.colors.outlineVariant,
        backgroundColor: theme.colors.surfaceVariant,
      }}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <MaterialCommunityIcons name={iconName as any} size={18} color={theme.colors.onSurfaceVariant} />
          <Text variant="bodyLarge" style={{ color: theme.colors.onSurface, fontWeight: '600' }}>
            {getFactorLabel(factor.type)}
          </Text>
        </View>
        <MaterialCommunityIcons
          name={checkboxIconName as any}
          size={20}
          color={isSelected ? theme.colors.primary : theme.colors.outline}
        />
      </View>
    </TouchableRipple>
  );
}

export default function LoginScreen(): ReactElement {
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
      if (!MOCK_AUTH_ENABLED) {
        return;
      }
      const mockChallengeId: string = createMockChallengeId(account.trim());
      const mockStepRemain: number = 1;
      const items: AuthFactor[] = createMockFactors();

      setChallengeId(mockChallengeId);
      setStepRemain(mockStepRemain);
      setFactors(items);
      setSelectedFactor(null);
      setSecret('');

      if (items.length === 1) {
        setSelectedFactor(items[0]);
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
      // mock: 验证当前选中的因子一次即可完成登录（不再进入多轮校验）
      await new Promise<void>((resolve) => setTimeout(resolve, 650));
      setStepRemain(0);

      const pair: TokenPair = createMockTokenPair();
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
        <Card mode="elevated" style={{ borderRadius: 16, overflow: 'hidden' }}>
          <Card.Content style={{ gap: 12 }}>
            {step === 'lookup' && (
              <>
                <Text variant="titleMedium">输入账户</Text>
                <TextInput label="用户名 / 邮箱" value={account} onChangeText={setAccount} autoCapitalize="none" />
                <Button mode="contained" onPress={executeLookup} disabled={!canSubmitAccount || isSubmitting}>
                  继续
                </Button>
              </>
            )}

            {step === 'factor' && (
              <>
                <Text variant="titleMedium">选择认证因子</Text>
                <HelperText type="info">
                  {stepRemain === 1 ? '1 step left' : `${stepRemain} steps left`}
                </HelperText>
                <View style={{ flexDirection: 'column' }}>
                  {factors.map((factor) => (
                    <FactorRow
                      key={`${factor.id}-${factor.type}`}
                      factor={factor}
                      isSelected={selectedFactor?.id === factor.id}
                      isDisabled={isSubmitting}
                      onPress={executeChooseFactor}
                    />
                  ))}
                </View>
              </>
            )}

            {step === 'verify' && (
              <>
                <Text variant="titleMedium">
                  {selectedFactor?.type === 0 ? 'Enter the code' : 'Enter the code'}
                </Text>
                <HelperText type="info">
                  {selectedFactor?.type === 0 ? 'The password you set when you registered.' : 'Enter the code provided by your factor.'}
                </HelperText>
                <TextInput
                  label={selectedFactor?.type === 0 ? 'Password' : selectedFactor?.type === 4 ? 'PIN' : 'Code'}
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

        <Link href="/auth/register" asChild>
          <Button mode="text">还没有账号？去注册</Button>
        </Link>
      </ScrollView>
    </View>
  );
}
