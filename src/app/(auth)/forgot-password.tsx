// ============================================================
// جرب حظك — استعادة الحساب (كلمة المرور / اسم المستخدم)
// شاشة واحدة بطورين عبر query param: mode=username يبدّل الغرض.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Input from '../../components/ui/Input';
import { BackIcon, LogoMark } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';

export default function ForgotPasswordScreen() {
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const isUsername = mode === 'username';

  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const forgotPassword = useAuthStore((s) => s.forgotPassword);
  const forgotUsername = useAuthStore((s) => s.forgotUsername);

  const canSubmit = email.trim().length > 0 && !busy;

  const submit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSuccess(null);
    setBusy(true);
    try {
      if (isUsername) {
        const res = await forgotUsername(email.trim());
        setSuccess(
          res.found
            ? `وجدنا حسابك — اسم المستخدم: ${res.usernameMasked ?? ''}`
            : 'لا يوجد حساب مرتبط بهذا البريد الإلكتروني'
        );
      } else {
        await forgotPassword(email.trim());
        setSuccess('إذا كان البريد مسجلًا سيصلك رابط الاستعادة خلال دقائق');
      }
    } catch (e: any) {
      if (e?.message === 'EMAIL_INVALID') {
        setError('البريد الإلكتروني غير صالح');
      } else if (e?.message === 'EMAIL_SERVICE_UNAVAILABLE') {
        setError('خدمة البريد غير مهيأة بعد — أبلغ المطور');
      } else {
        setError('تعذّر إرسال الطلب — تأكد من اتصالك ثم أعد المحاولة');
      }
    } finally {
      setBusy(false);
    }
  };

  const title = isUsername ? 'نسيت اسم المستخدم؟' : 'نسيت كلمة المرور؟';
  const subtitle = isUsername
    ? 'أدخل بريدك الإلكتروني وسنذكّرك باسم المستخدم'
    : 'أدخل بريدك الإلكتروني وسنرسل لك رابط استعادة كلمة المرور';
  const buttonTitle = isUsername ? 'تذكير باسم المستخدم' : 'إرسال رابط الاستعادة';

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
            <LogoMark size={48} />
          </View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>{subtitle}</Text>

          <View style={styles.form}>
            {!!error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorBannerText}>{error}</Text>
              </View>
            )}
            {!!success && (
              <View style={styles.successBanner}>
                <Text style={styles.successBannerText}>{success}</Text>
              </View>
            )}

            <Input
              label="البريد الإلكتروني"
              placeholder="you@example.com"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
              onSubmitEditing={submit}
            />
          </View>

          <GoldButton
            title={busy ? 'جارٍ الإرسال…' : buttonTitle}
            onPress={submit}
            disabled={!canSubmit}
            loading={busy}
          />

          <View style={styles.backRow}>
            <Pressable
              onPress={() => router.replace('/(auth)/login' as Href)}
              hitSlop={8}
            >
              <Text style={styles.backLink}>رجوع إلى تسجيل الدخول</Text>
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
  successBanner: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: 'rgba(143,203,180,0.35)',
    backgroundColor: 'rgba(143,203,180,0.08)',
  },
  successBannerText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.emerald,
    textAlign: 'center',
  },
  backRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.xl,
  },
  backLink: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.gold,
  },
});
