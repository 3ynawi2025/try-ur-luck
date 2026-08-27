// ============================================================
// جرب حظك — تعيين كلمة مرور جديدة (عبر رابط الاستعادة العميق)
// يقرأ access_token و refresh_token من الرابط (query عند type=recovery)،
// يثبّت الجلسة، ثم يسمح بحفظ كلمة مرور جديدة عبر Supabase.
// ============================================================

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as Linking from 'expo-linking';
import { router, type Href } from 'expo-router';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Input from '../../components/ui/Input';
import { BackIcon, LogoMark } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS } from '../../constants/theme';
import { getSupabase } from '../../lib/supabase';

/** استخراج توكنَي الاستعادة من رابط عميق — يدعم query وfragment معًا (Supabase يضعها في #fragment) */
function extractTokens(url: string | null): { access_token: string; refresh_token: string } | null {
  if (!url) return null;
  try {
    // يجمع بارامترات query وfragment معًا
    const fragIdx = url.indexOf('#');
    const queryPart = url.split('?')[1] ?? '';
    const fragPart = fragIdx >= 0 ? url.slice(fragIdx + 1) : '';
    const q = new URLSearchParams(`${queryPart}&${fragPart}`);
    const access = q.get('access_token');
    const refresh = q.get('refresh_token');
    if (access && refresh) {
      return { access_token: access, refresh_token: refresh };
    }
  } catch {
    /* تجاهل — الرابط غير صالح */
  }
  return null;
}

export default function ResetPasswordScreen() {
  const [state, setState] = useState<'loading' | 'ready' | 'invalid'>('loading');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  // قراءة الرابط الأولي + الاستماع للروابط اللاحقة (عند فتح التطبيق وهو يعمل)
  useEffect(() => {
    let active = true;

    const applyUrl = async (url: string | null) => {
      const tokens = extractTokens(url);
      if (!tokens) {
        if (active) setState('invalid');
        return;
      }
      try {
        await getSupabase().auth.setSession({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
        });
        if (active) setState('ready');
      } catch {
        if (active) setState('invalid');
      }
    };

    const sub = Linking.addEventListener('url', (event) => {
      applyUrl(event.url);
    });

    Linking.getInitialURL()
      .then(applyUrl)
      .catch(() => {
        if (active) setState('invalid');
      });

    return () => {
      active = false;
      sub.remove();
    };
  }, []);

  const canSubmit = password.length >= 6 && password === confirm && !busy;

  const submit = async () => {
    if (password.length < 6) {
      setError('كلمة المرور ٦ أحرف على الأقل');
      return;
    }
    if (password !== confirm) {
      setError('كلمتا المرور غير متطابقتين');
      return;
    }
    setError(null);
    setBusy(true);
    try {
      const { error: updateError } = await getSupabase().auth.updateUser({ password });
      if (updateError) throw updateError;
      setSuccess('تم حفظ كلمة المرور بنجاح');
      setTimeout(() => router.replace('/(auth)/login' as Href), 1400);
    } catch {
      setError('تعذّر حفظ كلمة المرور — أعد المحاولة أو اطلب رابطًا جديدًا');
      setBusy(false);
    }
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable
            style={styles.back}
            onPress={() => router.replace('/(auth)/login' as Href)}
            hitSlop={8}
          >
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

          {state === 'loading' && (
            <View style={styles.centerBlock}>
              <ActivityIndicator color={COLORS.gold} size="large" />
              <Text style={styles.centerText}>جارٍ التحقق من الرابط…</Text>
            </View>
          )}

          {state === 'invalid' && (
            <View style={styles.centerBlock}>
              <Text style={styles.invalidTitle}>الرابط غير صالح أو منتهي</Text>
              <Text style={styles.invalidSub}>اطلب رابطًا جديدًا ثم أعد المحاولة</Text>
              <GoldButton
                title="طلب رابط جديد"
                onPress={() => router.replace('/(auth)/forgot-password' as Href)}
                style={styles.invalidBtn}
              />
            </View>
          )}

          {state === 'ready' && (
            <>
              <Text style={styles.title}>تعيين كلمة مرور جديدة</Text>
              <Text style={styles.subtitle}>
                أدخل كلمة مرور جديدة (٦ أحرف على الأقل) ثم أكّدها
              </Text>

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
                  label="كلمة المرور الجديدة"
                  placeholder="••••••••"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  error={
                    password.length > 0 && password.length < 6
                      ? 'ستة أحرف على الأقل'
                      : undefined
                  }
                />

                <Input
                  label="تأكيد كلمة المرور"
                  placeholder="••••••••"
                  value={confirm}
                  onChangeText={setConfirm}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                  textContentType="newPassword"
                  onSubmitEditing={submit}
                  error={
                    confirm.length > 0 && confirm !== password
                      ? 'كلمتا المرور غير متطابقتين'
                      : undefined
                  }
                />
              </View>

              <GoldButton
                title={busy ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
                onPress={submit}
                disabled={!canSubmit}
                loading={busy}
              />
            </>
          )}
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
  centerBlock: {
    alignItems: 'center',
    gap: SPACING.lg,
    paddingVertical: SPACING.xxl,
  },
  centerText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  invalidTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
    textAlign: 'center',
  },
  invalidSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  invalidBtn: {
    marginTop: SPACING.md,
    alignSelf: 'stretch',
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
});
