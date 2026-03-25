import { useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { Link, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Appbar,
  Checkbox,
  Text,
  TextInput,
  TouchableRipple,
} from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthFactor } from '@/lib/api/types';
import type { TokenPair } from '@/lib/api/types';
import { useAuthContext } from '@/lib/auth/auth-context';
import { getFactorLabelEn } from '@/lib/auth/factor';
import { V3_AUTH, V3_ICON_CIRCLE_SIZE, V3_PILL_RADIUS } from '@/lib/auth/v3-auth-theme';

type LoginStep = 'lookup' | 'factor' | 'verify';

const MOCK_ACCESS_TOKEN_TTL_MS: number = 15 * 60 * 1000;
const MOCK_REFRESH_TOKEN_TTL_MS: number = 7 * 24 * 60 * 60 * 1000;

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
  return [{ id: 1, type: 0, name: 'Password' }];
}

function getFactorDescriptionEn(type: number): string {
  switch (type) {
    case 0:
      return 'The password you set when you registered.';
    case 1:
      return 'A one-time code sent to your email.';
    case 2:
      return 'Confirm the sign-in request in the app.';
    case 3:
      return 'The 6-digit code from your authenticator app.';
    case 4:
      return 'Your account PIN.';
    default:
      return 'Complete verification for this factor.';
  }
}

function loginProgressForStep(step: LoginStep): number {
  if (step === 'lookup') {
    return 0.22;
  }
  if (step === 'factor') {
    return 0.48;
  }
  return 0.82;
}

export default function LoginScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { executeSignIn } = useAuthContext();
  const [step, setStep] = useState<LoginStep>('lookup');
  const [account, setAccount] = useState<string>('');
  const [challengeId, setChallengeId] = useState<string>('');
  const [factors, setFactors] = useState<AuthFactor[]>([]);
  const [selectedFactor, setSelectedFactor] = useState<AuthFactor | null>(null);
  const [secret, setSecret] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const canSubmitAccount: boolean = useMemo(() => account.trim().length > 0, [account]);
  const canSubmitVerify: boolean = useMemo(
    () => challengeId.length > 0 && selectedFactor !== null && secret.trim().length > 0,
    [challengeId, selectedFactor, secret],
  );

  function executeLookup(): void {
    if (!canSubmitAccount) {
      return;
    }
    setIsSubmitting(true);
    try {
      const mockChallengeId: string = `mock_challenge_${account.trim()}_${Date.now()}`;
      const items: AuthFactor[] = createMockFactors();
      setChallengeId(mockChallengeId);
      setFactors(items);
      setSelectedFactor(null);
      setSecret('');
      setStep('factor');
    } finally {
      setIsSubmitting(false);
    }
  }

  function executeFactorNext(): void {
    if (!selectedFactor) {
      Alert.alert('Pick a factor', 'Please select one sign-in method.');
      return;
    }
    setSecret('');
    setStep('verify');
  }

  async function executeVerify(): Promise<void> {
    if (!selectedFactor || !canSubmitVerify) {
      return;
    }
    setIsSubmitting(true);
    try {
      await new Promise<void>((resolve) => setTimeout(resolve, 450));
      const pair: TokenPair = createMockTokenPair();
      await executeSignIn(pair);
      router.replace('/(drawer)/(tabs)/' as any);
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Verification failed');
    } finally {
      setIsSubmitting(false);
    }
  }

  function executeMockSocial(provider: string): void {
    Alert.alert(provider, 'Third-party sign-in is not connected in this mock build.');
  }

  const pillOutline = {
    borderRadius: V3_PILL_RADIUS,
    backgroundColor: '#FFFFFF',
  };

  return (
    <View style={{ flex: 1, backgroundColor: V3_AUTH.pageBg, paddingTop: insets.top }}>
      <Appbar.Header
        mode="center-aligned"
        style={{ backgroundColor: V3_AUTH.pageBg, elevation: 0 }}
      >
        <Appbar.BackAction onPress={() => router.back()} />
        <Appbar.Content title="Login" titleStyle={{ fontWeight: '600', color: V3_AUTH.textPrimary }} />
      </Appbar.Header>
      <View style={{ height: 3, backgroundColor: V3_AUTH.progressTrack }}>
        <View
          style={{
            height: 3,
            width: `${loginProgressForStep(step) * 100}%`,
            backgroundColor: V3_AUTH.progressActive,
          }}
        />
      </View>

      <ScrollView
        contentContainerStyle={{
          paddingHorizontal: 24,
          paddingTop: 20,
          paddingBottom: insets.bottom + 24,
          maxWidth: 420,
          alignSelf: 'center',
          width: '100%',
        }}
        keyboardShouldPersistTaps="handled"
      >
        {step === 'lookup' && (
          <>
            <View
              style={{
                width: V3_ICON_CIRCLE_SIZE,
                height: V3_ICON_CIRCLE_SIZE,
                borderRadius: V3_ICON_CIRCLE_SIZE / 2,
                backgroundColor: V3_AUTH.iconCircleBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons name="login" size={26} color={V3_AUTH.tealDark} />
            </View>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '800', color: V3_AUTH.textPrimary, marginBottom: 20 }}
            >
              Welcome back!
            </Text>
            <TextInput
              mode="outlined"
              label="Username"
              value={account}
              onChangeText={setAccount}
              autoCapitalize="none"
              autoCorrect={false}
              style={pillOutline}
              outlineStyle={{ borderRadius: V3_PILL_RADIUS, borderColor: V3_AUTH.inputBorder }}
              contentStyle={{ borderRadius: V3_PILL_RADIUS }}
            />
            <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, marginTop: 8, marginBottom: 16 }}>
              We also take your email address.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, flex: 1 }}>
                Or login with third parties
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableRipple
                  borderless
                  onPress={() => executeMockSocial('GitHub')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: V3_AUTH.iconCircleBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="github" size={18} color={V3_AUTH.tealDark} />
                </TouchableRipple>
                <TouchableRipple
                  borderless
                  onPress={() => executeMockSocial('Google')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: V3_AUTH.iconCircleBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="google" size={18} color={V3_AUTH.tealDark} />
                </TouchableRipple>
                <TouchableRipple
                  borderless
                  onPress={() => executeMockSocial('Apple')}
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 20,
                    backgroundColor: V3_AUTH.iconCircleBg,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <MaterialCommunityIcons name="apple" size={18} color={V3_AUTH.tealDark} />
                </TouchableRipple>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
              <Pressable onPress={executeLookup} disabled={!canSubmitAccount || isSubmitting}>
                <Text style={{ color: V3_AUTH.tealDark, fontWeight: '700', fontSize: 16 }}>Next &gt;</Text>
              </Pressable>
            </View>
            <Pressable
              onPress={() => Alert.alert('Forgot password', 'Mock: password recovery is not available.')}
              style={{ alignSelf: 'flex-end', marginTop: 12, flexDirection: 'row', alignItems: 'center', gap: 4 }}
            >
              <Text style={{ color: V3_AUTH.textMuted, fontSize: 14 }}>Forgot password</Text>
              <MaterialCommunityIcons name="link-variant-off" size={16} color={V3_AUTH.textMuted} />
            </Pressable>
            <Text
              variant="bodySmall"
              style={{ color: V3_AUTH.textMuted, textAlign: 'center', marginTop: 32, lineHeight: 20 }}
            >
              By continuing, you agree to our terms of services and other terms and conditions.
            </Text>
            <Pressable
              onPress={() => Linking.openURL('https://solsynth.dev/terms')}
              style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 6, gap: 4 }}
            >
              <Text style={{ color: V3_AUTH.tealDark, fontWeight: '600' }}>Check them out</Text>
              <MaterialCommunityIcons name="open-in-new" size={14} color={V3_AUTH.tealDark} />
            </Pressable>
          </>
        )}

        {step === 'factor' && (
          <>
            <View
              style={{
                width: V3_ICON_CIRCLE_SIZE,
                height: V3_ICON_CIRCLE_SIZE,
                borderRadius: V3_ICON_CIRCLE_SIZE / 2,
                backgroundColor: V3_AUTH.iconCircleBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons name="lock-outline" size={26} color={V3_AUTH.tealDark} />
            </View>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '800', color: V3_AUTH.textPrimary, marginBottom: 16 }}
            >
              Pick a factor
            </Text>
            <View
              style={{
                backgroundColor: V3_AUTH.termsCardBg,
                borderRadius: V3_PILL_RADIUS,
                paddingVertical: 4,
                marginBottom: 12,
              }}
            >
              {factors.map((factor) => {
                const checked: boolean = selectedFactor?.id === factor.id;
                return (
                  <TouchableRipple
                    key={factor.id}
                    onPress={() => setSelectedFactor(factor)}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      borderRadius: V3_PILL_RADIUS,
                    }}
                  >
                    <MaterialCommunityIcons
                      name="form-textbox-password"
                      size={22}
                      color={V3_AUTH.tealDark}
                      style={{ marginRight: 12 }}
                    />
                    <Text style={{ flex: 1, fontSize: 16, fontWeight: '600', color: V3_AUTH.textPrimary }}>
                      {getFactorLabelEn(factor.type)}
                    </Text>
                    <Checkbox.Android
                      status={checked ? 'checked' : 'unchecked'}
                      onPress={() => setSelectedFactor(factor)}
                      color={V3_AUTH.tealDark}
                    />
                  </TouchableRipple>
                );
              })}
            </View>
            <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, marginLeft: 8, marginBottom: 16 }}>
              1 step left
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Pressable onPress={executeFactorNext} disabled={isSubmitting}>
                <Text style={{ color: V3_AUTH.tealDark, fontWeight: '700', fontSize: 16 }}>Next &gt;</Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 'verify' && selectedFactor && (
          <>
            <View
              style={{
                width: V3_ICON_CIRCLE_SIZE,
                height: V3_ICON_CIRCLE_SIZE,
                borderRadius: V3_ICON_CIRCLE_SIZE / 2,
                backgroundColor: V3_AUTH.iconCircleBg,
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 12,
              }}
            >
              <MaterialCommunityIcons name="asterisk" size={28} color={V3_AUTH.tealDark} />
            </View>
            <Text
              variant="headlineMedium"
              style={{ fontWeight: '800', color: V3_AUTH.textPrimary, marginBottom: 20 }}
            >
              Enter the code
            </Text>
            <TextInput
              mode="outlined"
              label={selectedFactor.type === 0 ? 'Password' : 'Code'}
              value={secret}
              onChangeText={setSecret}
              secureTextEntry={selectedFactor.type === 0}
              autoCapitalize="none"
              autoCorrect={false}
              style={pillOutline}
              outlineStyle={{ borderRadius: V3_PILL_RADIUS, borderColor: V3_AUTH.inputBorder }}
              contentStyle={{ borderRadius: V3_PILL_RADIUS }}
            />
            <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginTop: 16, gap: 12 }}>
              <MaterialCommunityIcons
                name="form-textbox-password"
                size={24}
                color={V3_AUTH.tealDark}
                style={{ marginTop: 2 }}
              />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 16, fontWeight: '700', color: V3_AUTH.textPrimary }}>
                  {getFactorLabelEn(selectedFactor.type)}
                </Text>
                <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, marginTop: 4, lineHeight: 20 }}>
                  {getFactorDescriptionEn(selectedFactor.type)}
                </Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 24 }}>
              <Pressable onPress={executeVerify} disabled={!canSubmitVerify || isSubmitting}>
                <Text style={{ color: V3_AUTH.tealDark, fontWeight: '700', fontSize: 16 }}>Next &gt;</Text>
              </Pressable>
            </View>
          </>
        )}

        {isSubmitting ? (
          <ActivityIndicator style={{ marginTop: 16 }} color={V3_AUTH.tealDark} />
        ) : null}

        {step === 'lookup' ? (
          <Link href="/auth/register" asChild>
            <Pressable style={{ marginTop: 24, alignItems: 'center' }}>
              <Text style={{ color: V3_AUTH.tealDark, fontWeight: '600' }}>Create an account</Text>
            </Pressable>
          </Link>
        ) : null}
      </ScrollView>
    </View>
  );
}
