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
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { AuthFactor } from '@/lib/api/types';
import {
  createAuthChallenge,
  createDefaultChallengePayload,
  exchangeAuthorizationCode,
  getChallengeFactors,
  patchAuthChallenge,
  triggerChallengeFactor,
} from '@/lib/api/http-client';
import { useAuthContext } from '@/lib/auth/auth-context';
import { getFactorLabelEn } from '@/lib/auth/factor';
import { V3_AUTH, V3_ICON_CIRCLE_SIZE, V3_PILL_RADIUS } from '@/lib/auth/v3-auth-theme';

type LoginStep = 'lookup' | 'factor' | 'verify';

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

  async function executeLookup(): Promise<void> {
    if (!canSubmitAccount) {
      return;
    }
    const trimmedAccount: string = account.trim();
    setIsSubmitting(true);
    try {
      const challenge = await createAuthChallenge(createDefaultChallengePayload(trimmedAccount));
      setChallengeId(challenge.id);
      const items: AuthFactor[] = await getChallengeFactors(challenge.id);
      if (items.length === 0) {
        Alert.alert('Sign in failed', 'No sign-in methods are available for this account.');
        return;
      }
      if (challenge.stepRemain === 0) {
        const pair = await exchangeAuthorizationCode(challenge.id);
        await executeSignIn(pair);
        router.replace('/(drawer)/(tabs)/' as any);
        return;
      }
      setFactors(items);
      setSelectedFactor(null);
      setSecret('');
      setStep('factor');
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Could not start sign-in.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function executeFactorNext(): Promise<void> {
    if (!selectedFactor) {
      Alert.alert('Pick a factor', 'Please select one sign-in method.');
      return;
    }
    if (!challengeId) {
      return;
    }
    setIsSubmitting(true);
    try {
      try {
        await triggerChallengeFactor(challengeId, selectedFactor.id);
      } catch (triggerError) {
        const triggerMessage: string =
          triggerError instanceof Error ? triggerError.message : String(triggerError);
        if (!triggerMessage.includes('400')) {
          throw triggerError;
        }
      }
      setSecret('');
      setStep('verify');
    } catch (error) {
      Alert.alert('Sign in failed', error instanceof Error ? error.message : 'Could not prepare verification.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function executeVerify(): Promise<void> {
    if (!selectedFactor || !canSubmitVerify || !challengeId) {
      return;
    }
    setIsSubmitting(true);
    try {
      const patchResult = await patchAuthChallenge(challengeId, {
        factorId: selectedFactor.id,
        password: secret.trim(),
      });
      const nextChallengeId: string = patchResult.id;
      setChallengeId(nextChallengeId);
      if (patchResult.stepRemain > 0) {
        const nextFactors: AuthFactor[] = await getChallengeFactors(nextChallengeId);
        setFactors(nextFactors.length > 0 ? nextFactors : factors);
        setSelectedFactor(null);
        setSecret('');
        setStep('factor');
        return;
      }
      const pair = await exchangeAuthorizationCode(nextChallengeId);
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
    <View style={{ flex: 1, backgroundColor: V3_AUTH.pageBg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: V3_AUTH.pageBg }}>
        <Appbar.Header
          mode="center-aligned"
          style={{ backgroundColor: V3_AUTH.pageBg, elevation: 0, marginTop: 0 }}
          statusBarHeight={0}
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
      </SafeAreaView>

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
              <Pressable onPress={() => void executeLookup()} disabled={!canSubmitAccount || isSubmitting}>
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
                    borderless={false}
                  >
                    <View
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
                    </View>
                  </TouchableRipple>
                );
              })}
            </View>
            <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, marginLeft: 8, marginBottom: 16 }}>
              1 step left
            </Text>
            <View style={{ alignItems: 'flex-end' }}>
              <Pressable onPress={() => void executeFactorNext()} disabled={isSubmitting || !challengeId}>
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
              <Pressable onPress={() => void executeVerify()} disabled={!canSubmitVerify || isSubmitting}>
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
