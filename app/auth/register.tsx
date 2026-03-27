import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement } from 'react';
import { Alert, Linking, Pressable, ScrollView, View } from 'react-native';
import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Appbar, Checkbox, Text, TextInput, TouchableRipple } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { registerAccount, validateRegister } from '@/lib/api/http-client';
import { clearRegisterDraft, peekRegisterDraft, saveRegisterDraft } from '@/lib/auth/register-draft';
import { resolveRegisterLanguageTag } from '@/lib/auth/register-language';
import { V3_AUTH, V3_ICON_CIRCLE_SIZE, V3_PILL_RADIUS } from '@/lib/auth/v3-auth-theme';

type RegisterStep = 0 | 1 | 2 | 3 | 4;

/** 避免 React Strict Mode 下 effect 重复触发导致重复 POST */
const completedCaptchaResumeKeys: Set<string> = new Set();

export default function RegisterScreen(): ReactElement {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  type RegisterParams = { captchaToken?: string | string[] };
  const params = useLocalSearchParams<RegisterParams>();
  const derivedCaptchaToken: string = typeof params.captchaToken === 'string' ? params.captchaToken : '';

  const [step, setStep] = useState<RegisterStep>(0);
  const [email, setEmail] = useState<string>('');
  const [affiliationSpell, setAffiliationSpell] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [name, setName] = useState<string>('');
  const [nick, setNick] = useState<string>('');
  const [termsAccepted, setTermsAccepted] = useState<boolean>(false);
  const [captchaToken, setCaptchaToken] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const executeSubmitRegistration = useCallback(
    async (paramsSubmit: {
      email: string;
      password: string;
      name: string;
      nick: string;
      captchaToken: string;
    }): Promise<void> => {
      setIsSubmitting(true);
      try {
        await validateRegister({ email: paramsSubmit.email.trim(), name: paramsSubmit.name.trim() });
        await registerAccount({
          captchaToken: paramsSubmit.captchaToken.trim(),
          name: paramsSubmit.name.trim(),
          nick: paramsSubmit.nick.trim(),
          email: paramsSubmit.email.trim(),
          password: paramsSubmit.password,
          language: resolveRegisterLanguageTag(),
        });
        clearRegisterDraft();
        Alert.alert(
          'Welcome',
          'Your account has been created. Please check your email to activate your account, then sign in.',
          [{ text: 'Login', onPress: () => router.replace('/auth/login' as any) }],
        );
      } catch (err) {
        Alert.alert('Registration failed', err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setIsSubmitting(false);
      }
    },
    [router],
  );

  const emailValid: boolean = useMemo(() => {
    const t: string = email.trim();
    if (!t) {
      return false;
    }
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t);
  }, [email]);

  const canStep0: boolean = emailValid;
  const canStep1: boolean = password.trim().length > 0;
  const canStep2: boolean = useMemo(() => {
    const u: string = name.trim();
    const n: string = nick.trim();
    if (u.length < 4 || u.length > 32 || !/^[a-zA-Z0-9_]+$/.test(u)) {
      return false;
    }
    return n.length >= 4 && n.length <= 32;
  }, [name, nick]);
  const canStep3: boolean = termsAccepted;
  const canFinish: boolean = captchaToken.trim().length > 0;

  useEffect(() => {
    if (!derivedCaptchaToken) {
      return;
    }
    const draft = peekRegisterDraft();
    if (!draft) {
      setCaptchaToken(derivedCaptchaToken);
      return;
    }
    const resumeKey: string = `${derivedCaptchaToken}\n${draft.email}\n${draft.name}`;
    const isDuplicateResume: boolean = completedCaptchaResumeKeys.has(resumeKey);
    setEmail(draft.email);
    setAffiliationSpell(draft.affiliationSpell);
    setPassword(draft.password);
    setName(draft.name);
    setNick(draft.nick);
    setTermsAccepted(draft.termsAccepted);
    setCaptchaToken(derivedCaptchaToken);
    setStep(4);
    if (!isDuplicateResume) {
      completedCaptchaResumeKeys.add(resumeKey);
      void executeSubmitRegistration({
        email: draft.email,
        password: draft.password,
        name: draft.name,
        nick: draft.nick,
        captchaToken: derivedCaptchaToken,
      });
    }
  }, [derivedCaptchaToken, executeSubmitRegistration]);

  function executeThirdPartySignUp(provider: string): void {
    Alert.alert(provider, 'Third-party sign-up is not available in this app yet.');
  }

  const executeOpenCaptcha = useCallback(async (): Promise<void> => {
    setIsSubmitting(true);
    try {
      await validateRegister({ email: email.trim(), name: name.trim() });
      saveRegisterDraft({
        email: email.trim(),
        affiliationSpell: affiliationSpell.trim(),
        password,
        name: name.trim(),
        nick: nick.trim(),
        termsAccepted,
      });
      router.push('/auth/captcha' as any);
    } catch (err) {
      Alert.alert('Cannot continue', err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsSubmitting(false);
    }
  }, [affiliationSpell, email, name, nick, password, router, termsAccepted]);

  const pillOutline = {
    borderRadius: V3_PILL_RADIUS,
    backgroundColor: '#FFFFFF',
  };

  const progress: number = (step + 1) / 5;

  const stepTitles: Record<RegisterStep, string> = {
    0: 'Create an Account',
    1: 'Create an Account',
    2: 'Create an Account',
    3: 'Create an Account',
    4: 'Create an Account',
  };

  const headlines: Record<RegisterStep, string> = {
    0: 'Create an Account',
    1: 'Password',
    2: 'Create your profile',
    3: 'Review Terms & Conditions',
    4: 'Almost There',
  };

  const headerIcons: Record<RegisterStep, string> = {
    0: 'email-outline',
    1: 'form-textbox-password',
    2: 'account-outline',
    3: 'file-document-outline',
    4: 'check-circle-outline',
  };

  return (
    <View style={{ flex: 1, backgroundColor: V3_AUTH.pageBg }}>
      <SafeAreaView edges={['top']} style={{ backgroundColor: V3_AUTH.pageBg }}>
        <Appbar.Header
          mode="center-aligned"
          style={{ backgroundColor: V3_AUTH.pageBg, elevation: 0, marginTop: 0 }}
          statusBarHeight={0}
        >
          <Appbar.BackAction onPress={() => (step > 0 ? setStep((s) => (s - 1) as RegisterStep) : router.back())} />
          <Appbar.Content
            title={stepTitles[step]}
            titleStyle={{ fontWeight: '600', color: V3_AUTH.textPrimary, fontSize: 17 }}
          />
        </Appbar.Header>
        <View style={{ height: 3, backgroundColor: V3_AUTH.progressTrack }}>
          <View style={{ height: 3, width: `${Math.max(0.08, progress) * 100}%`, backgroundColor: V3_AUTH.progressActive }} />
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
          <MaterialCommunityIcons name={headerIcons[step] as any} size={26} color={V3_AUTH.tealDark} />
        </View>
        <Text variant="headlineMedium" style={{ fontWeight: '800', color: V3_AUTH.textPrimary, marginBottom: 20 }}>
          {headlines[step]}
        </Text>

        {step === 0 && (
          <>
            <TextInput
              mode="outlined"
              label="Email"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              style={pillOutline}
              outlineStyle={{ borderRadius: V3_PILL_RADIUS, borderColor: V3_AUTH.inputBorder }}
            />
            <TextInput
              mode="outlined"
              label="Affiliation Spell"
              value={affiliationSpell}
              onChangeText={setAffiliationSpell}
              style={{ ...pillOutline, marginTop: 14 }}
              outlineStyle={{ borderRadius: V3_PILL_RADIUS, borderColor: V3_AUTH.inputBorder }}
            />
            <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, marginTop: 8, marginBottom: 16 }}>
              If you have an affiliation spell, enter it here.
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, flex: 1 }}>
                Or create with
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {(['github', 'google', 'apple'] as const).map((p) => (
                  <TouchableRipple
                    key={p}
                    borderless
                    onPress={() => executeThirdPartySignUp(p)}
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 20,
                      backgroundColor: V3_AUTH.iconCircleBg,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    <MaterialCommunityIcons
                      name={p === 'github' ? 'github' : p === 'google' ? 'google' : 'apple'}
                      size={18}
                      color={V3_AUTH.tealDark}
                    />
                  </TouchableRipple>
                ))}
              </View>
            </View>
            <View style={{ alignItems: 'flex-end', marginTop: 8 }}>
              <Pressable onPress={() => (canStep0 ? setStep(1) : null)} disabled={!canStep0}>
                <Text style={{ color: canStep0 ? V3_AUTH.tealDark : V3_AUTH.textMuted, fontWeight: '700', fontSize: 16 }}>
                  Next &gt;
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 1 && (
          <>
            <TextInput
              mode="outlined"
              label="Password"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              style={pillOutline}
              outlineStyle={{ borderRadius: V3_PILL_RADIUS, borderColor: V3_AUTH.inputBorder }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Pressable onPress={() => setStep(0)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={V3_AUTH.textMuted} />
                <Text style={{ color: V3_AUTH.textMuted, fontWeight: '600' }}>Back</Text>
              </Pressable>
              <Pressable onPress={() => (canStep1 ? setStep(2) : null)} disabled={!canStep1}>
                <Text style={{ color: canStep1 ? V3_AUTH.tealDark : V3_AUTH.textMuted, fontWeight: '700', fontSize: 16 }}>
                  Next &gt;
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 2 && (
          <>
            <TextInput
              mode="outlined"
              label="Username"
              value={name}
              onChangeText={setName}
              autoCapitalize="none"
              style={pillOutline}
              outlineStyle={{ borderRadius: V3_PILL_RADIUS, borderColor: V3_AUTH.inputBorder }}
            />
            <Text variant="bodySmall" style={{ color: V3_AUTH.textMuted, marginTop: 8, marginBottom: 14 }}>
              Username cannot be updated after created.
            </Text>
            <TextInput
              mode="outlined"
              label="Nickname"
              value={nick}
              onChangeText={setNick}
              style={pillOutline}
              outlineStyle={{ borderRadius: V3_PILL_RADIUS, borderColor: V3_AUTH.inputBorder }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Pressable onPress={() => setStep(1)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={V3_AUTH.textMuted} />
                <Text style={{ color: V3_AUTH.textMuted, fontWeight: '600' }}>Back</Text>
              </Pressable>
              <Pressable onPress={() => (canStep2 ? setStep(3) : null)} disabled={!canStep2}>
                <Text style={{ color: canStep2 ? V3_AUTH.tealDark : V3_AUTH.textMuted, fontWeight: '700', fontSize: 16 }}>
                  Next &gt;
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 3 && (
          <>
            <View
              style={{
                backgroundColor: V3_AUTH.termsCardBg,
                borderRadius: V3_PILL_RADIUS,
                padding: 16,
                marginBottom: 16,
              }}
            >
              <Text style={{ fontWeight: '700', color: V3_AUTH.textPrimary, marginBottom: 12 }}>
                Things you need to know before you create an account:
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 10 }}>
                <Text style={{ color: V3_AUTH.textMuted, lineHeight: 22 }}>
                  • By continuing, you agree to our terms of services and other terms and conditions.{' '}
                </Text>
                <Pressable onPress={() => Linking.openURL('https://solsynth.dev/terms')} style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={{ color: V3_AUTH.tealDark, fontWeight: '600', lineHeight: 22 }}>Check them out</Text>
                  <MaterialCommunityIcons name="open-in-new" size={14} color={V3_AUTH.tealDark} style={{ marginLeft: 4 }} />
                </Pressable>
              </View>
              <Text style={{ color: V3_AUTH.textMuted, marginBottom: 10, lineHeight: 22 }}>
                • After your account being created, you need go to your email inbox to active your account to get permission to use all
                features.
              </Text>
              <Text style={{ color: V3_AUTH.textMuted, lineHeight: 22 }}>
                • Multiple or alternative accounts are banned from the Solar Network, that will violates our terms of services.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Checkbox.Android
                status={termsAccepted ? 'checked' : 'unchecked'}
                onPress={() => setTermsAccepted(!termsAccepted)}
                color={V3_AUTH.tealDark}
              />
              <Text style={{ flex: 1, color: V3_AUTH.textPrimary, fontSize: 15 }}>
                I&apos;ve read these terms and agree to the terms of service.
              </Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 20 }}>
              <Pressable onPress={() => setStep(2)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={V3_AUTH.textMuted} />
                <Text style={{ color: V3_AUTH.textMuted, fontWeight: '600' }}>Back</Text>
              </Pressable>
              <Pressable onPress={() => (canStep3 ? setStep(4) : null)} disabled={!canStep3}>
                <Text style={{ color: canStep3 ? V3_AUTH.tealDark : V3_AUTH.textMuted, fontWeight: '700', fontSize: 16 }}>
                  Next &gt;
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {step === 4 && (
          <>
            <Text style={{ color: V3_AUTH.textMuted, lineHeight: 22, marginBottom: 24 }}>
              You&apos;re one step away from joining the Solar Network! Please solve the captcha puzzle shows next.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 }}>
              <Pressable onPress={() => setStep(3)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MaterialCommunityIcons name="chevron-left" size={20} color={V3_AUTH.textMuted} />
                <Text style={{ color: V3_AUTH.textMuted, fontWeight: '600' }}>Back</Text>
              </Pressable>
              <Pressable
                onPress={() => {
                  if (canFinish) {
                    void executeSubmitRegistration({
                      email,
                      password,
                      name,
                      nick,
                      captchaToken,
                    });
                  } else {
                    void executeOpenCaptcha();
                  }
                }}
                disabled={isSubmitting}
              >
                <Text style={{ color: V3_AUTH.tealDark, fontWeight: '700', fontSize: 16 }}>
                  {canFinish ? 'Finish &gt;' : 'Create an Account &gt;'}
                </Text>
              </Pressable>
            </View>
          </>
        )}

        {isSubmitting ? <ActivityIndicator style={{ marginTop: 20 }} color={V3_AUTH.tealDark} /> : null}

        <Link href="/auth/login" asChild>
          <Pressable style={{ marginTop: 28, alignItems: 'center' }}>
            <Text style={{ color: V3_AUTH.tealDark, fontWeight: '600' }}>Already have an account? Login</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
  );
}
