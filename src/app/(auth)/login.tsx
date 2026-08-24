// ============================================================
// جرب حظك — تسجيل الدخول
// الدخول باسم المستخدم وكلمة المرور (يعمل بعد إعادة التثبيت أو على جهاز آخر).
// ============================================================

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Input from '../../components/ui/Input';
import { BackIcon, LogoMark } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';

/** حقل كلمة مرور مع زر إظهار/إخفاء — يطابق نمط Input الحالي */
function PasswordInput({
  label,
  placeholder,
  value,
  onChangeText,
  error,
  onSubmitEditing,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
  onSubmitEditing?: () => void;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <View>
      <View style={styles.labelRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Pressable onPress={() => setVisible((v) => !v)} hitSlop={8}>
          <Text style={styles.toggle}>{visible ? 'إخفاء' : 'إظهار'}</Text>
        </Pressable>
      </View>
      <Input
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoCorrect={false}
        textContentType="password"
        error={error}
        onSubmitEditing={onSubmitEditing}
      />
    </View>
  );
}

export default function LoginScreen() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const login = useAuthStore((s) => s.login);
  const busy = useAuthStore((s) => s.busy);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // إذا كان المستخدم مسجلاً، ادخل مباشرة إلى التطبيق
  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/(app)');
    }
  }, [isAuthenticated]);

  const clean = username.replace(/^@/, '').toLowerCase();
  const canSubmit = clean.length >= 3 && password.length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      await login(clean, password);
      router.replace('/(app)');
    } catch (e: any) {
      if (e?.message === 'USER_NOT_FOUND') {
        setError('لا يوجد حساب بهذا الاسم — أنشئ حسابًا أولًا');
      } else if (e?.message === 'WRONG_PASSWORD') {
        setError('كلمة المرور غير صحيحة');
      } else if (e?.message === 'LOGIN_RATE_LIMITED') {
        setError('محاولات كثيرة فاشلة — انتظر قليلًا ثم أعد المحاولة');
      } else if (e?.message === 'PASSWORD_REQUIRED') {
        setError('أدخل كلمة المرور');
      } else {
        setError('تعذّر تسجيل الدخول. تأكد من بياناتك واتصالك ثم أعد المحاولة');
      }
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <BackIcon size={20} color={COLORS.text} />
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoWrap}>
            <LogoMark size={64} />
          </View>
          <Text style={styles.title}>أهلاً بعودتك</Text>
          <Text style={styles.subtitle}>
            سجّل دخولك باسم المستخدم وكلمة المرور لمتابعة اللعب
          </Text>

          <View style={styles.form}>
            {!!error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}

            <Input
              label="اسم المستخدم"
              prefix="@"
              placeholder="username"
              value={clean}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              error={
                username.length > 0 && clean.length < 3
                  ? 'ثلاثة أحرف على الأقل'
                  : undefined
              }
            />

            <PasswordInput
              label="كلمة المرور"
              placeholder="••••••••"
              value={password}
              onChangeText={setPassword}
              onSubmitEditing={submit}
            />
          </View>

          <GoldButton
            title={busy ? 'جارٍ الدخول…' : 'دخول'}
            onPress={submit}
            disabled={!canSubmit}
            loading={busy}
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchText}>ليس لديك حساب؟</Text>
            <Pressable onPress={() => router.push('/(auth)/profile-setup')} hitSlop={8}>
              <Text style={styles.switchLink}>أنشئ حسابًا</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.sm,
    alignItems: 'flex-end',
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.screenPadding,
    paddingVertical: SPACING.xl,
  },
  logoWrap: {
    alignSelf: 'center',
    marginBottom: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.display.fontSize,
    lineHeight: TYPE.display.lineHeight,
    color: COLORS.text,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
    marginTop: SPACING.xs,
    lineHeight: TYPE.body.lineHeight,
  },
  form: {
    marginTop: SPACING.xxl,
  },
  labelRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  fieldLabel: {
    flex: 1,
    color: COLORS.textDim,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    fontFamily: FONTS.ar.medium,
    textAlign: 'right',
  },
  toggle: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.gold,
  },
  errorBanner: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(232,169,160,0.35)',
    backgroundColor: 'rgba(232,169,160,0.08)',
  },
  errorBannerText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.crimson,
    textAlign: 'center',
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.xl,
  },
  switchText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.textDim,
  },
  switchLink: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.gold,
  },
});
