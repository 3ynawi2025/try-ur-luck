// ============================================================
// جرب حظك — إنشاء الحساب
// اختيار اسم مستخدم واسم معروض، ثم دخول فوري (بدون رقم هاتف).
// يرتبط بسيرفر Supabase لفحص تفرّد اسم المستخدم عالمياً.
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
import { router, useLocalSearchParams } from 'expo-router';
import * as Linking from 'expo-linking';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import Input from '../../components/ui/Input';
import { BackIcon, PlusIcon } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS } from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';

/** حقل كلمة مرور مع زر إظهار/إخفاء — يطابق نمط Input الحالي */
function PasswordInput({
  label,
  placeholder,
  value,
  onChangeText,
  error,
}: {
  label: string;
  placeholder?: string;
  value: string;
  onChangeText: (t: string) => void;
  error?: string;
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
      />
    </View>
  );
}

export default function ProfileSetupScreen() {
  const params = useLocalSearchParams<{ ref?: string }>();
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [invited, setInvited] = useState<string | null>(null);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [agreeAge, setAgreeAge] = useState(false);
  const register = useAuthStore((s) => s.register);
  const busy = useAuthStore((s) => s.busy);

  const ref = typeof params.ref === 'string' ? params.ref : undefined;

  const clean = username.replace(/^@/, '').toLowerCase();
  // مطابق للتحقق في السيرفر: أحرف لاتينية/أرقام/شرطة سفلية فقط
  const valid = /^[a-z0-9_]{3,20}$/.test(clean);

  const create = async () => {
    if (password.length < 6 || password !== confirmPassword) return;
    if (!valid || busy || !agreeTerms || !agreeAge) return;
    setError(null);
    try {
      const r = await register(clean, displayName, password, ref);
      if (r.inviteBonus) {
        // مكافأة الدعوة استُلمت — أظهرها لحظتين ثم ادخل
        setInvited(ref ?? 'صديقك');
        setTimeout(() => router.replace('/(app)'), 1600);
      } else {
        router.replace('/(app)');
      }
    } catch (e: any) {
      if (e?.message === 'USERNAME_TAKEN') {
        setError('اسم المستخدم مستخدم مسبقاً — اختر اسماً آخر');
      } else if (e?.message === 'USERNAME_INVALID') {
        setError('اسم المستخدم: ٣-٢٠ حرفًا لاتينيًا أو أرقامًا أو شرطة سفلية فقط');
      } else if (e?.message === 'PASSWORD_TOO_SHORT') {
        setError('كلمة المرور: ٦ أحرف على الأقل');
      } else {
        setError('تعذّر إنشاء الحساب. تأكد من اتصالك بالإنترنت ثم أعد المحاولة');
      }
    }
  };

  const openPrivacy = () => {
    Linking.openURL('https://jareb-hazzak-server.onrender.com/privacy').catch(() => {});
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
          <Text style={styles.title}>أنشئ حسابك</Text>
          <Text style={styles.subtitle}>
            اختر اسم مستخدم وكلمة مرور واسم معروض، وابدأ اللعب فوراً
          </Text>

          {/* الصورة */}
          <Pressable style={styles.avatarWrap}>
            <Avatar name={displayName || 'ج'} size={SIZES.avatarXl} showBorder />
            <View style={styles.addBadge}>
              <PlusIcon size={16} color={COLORS.onGold} />
            </View>
          </Pressable>
          <Text style={styles.addPhoto}>أضف صورة</Text>

          {/* النموذج */}
          <View style={styles.form}>
            {!!invited && (
              <View style={styles.inviteBanner}>
                <Text style={styles.inviteBannerText}>
                  🎉 مكافأة الدعوة استُلمت — +2,000 شريحة لك ولفريق {invited}
                </Text>
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
                error
                  ? error
                  : username.length > 0 && !valid
                  ? 'ثلاثة أحرف على الأقل'
                  : undefined
              }
            />
            <Input
              label="الاسم المعروض"
              placeholder="هذا ما سيراه اللاعبون على الطاولة"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={24}
            />
            <PasswordInput
              label="كلمة المرور"
              placeholder="٦ أحرف على الأقل"
              value={password}
              onChangeText={setPassword}
              error={
                password.length > 0 && password.length < 6
                  ? '٦ أحرف على الأقل'
                  : undefined
              }
            />
            <PasswordInput
              label="تأكيد كلمة المرور"
              placeholder="أعد كتابة كلمة المرور"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={
                confirmPassword.length > 0 && confirmPassword !== password
                  ? 'غير متطابقة'
                  : undefined
              }
            />
          </View>

          <View style={styles.consent}>
            <Pressable style={styles.checkRow} onPress={() => setAgreeTerms((v) => !v)}>
              <View style={[styles.checkbox, agreeTerms && styles.checkboxOn]}>
                {agreeTerms && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>أوافق على شروط الاستخدام وسياسة الخصوصية</Text>
            </Pressable>

            <Pressable style={styles.checkRow} onPress={() => setAgreeAge((v) => !v)}>
              <View style={[styles.checkbox, agreeAge && styles.checkboxOn]}>
                {agreeAge && <Text style={styles.checkMark}>✓</Text>}
              </View>
              <Text style={styles.checkLabel}>أؤكد أن عمري 18 عامًا أو أكثر</Text>
            </Pressable>

            <Text style={styles.disclosure}>
              سننشئ حسابك باسم مستخدم وكلمة مرور، ونخزّن معرّف جهازك لتأمين الحساب. لا نبيع بياناتك. راجع سياسة الخصوصية من الأسفل.
            </Text>

            <Pressable onPress={openPrivacy} hitSlop={8}>
              <Text style={styles.privacyLink}>سياسة الخصوصية</Text>
            </Pressable>
          </View>

          <GoldButton
            title={busy ? 'جارٍ إنشاء الحساب…' : 'ابدأ اللعب'}
            onPress={create}
            disabled={
              !valid ||
              busy ||
              !agreeTerms ||
              !agreeAge ||
              password.length < 6 ||
              password !== confirmPassword
            }
            loading={busy}
          />

          <Text style={styles.hint}>
            احفظ كلمة مرورك جيدًا — ستسجّل بها دخولك من أي جهاز لاحقًا
          </Text>
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

  avatarWrap: {
    alignSelf: 'center',
    marginTop: SPACING.xxl,
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  addPhoto: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.gold,
    textAlign: 'center',
    marginTop: SPACING.sm,
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
  inviteBanner: {
    marginBottom: SPACING.md,
    padding: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.10)',
  },
  inviteBannerText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.goldLight,
    textAlign: 'center',
  },
  hint: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight + 4,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.lg,
    paddingHorizontal: SPACING.lg,
  },
  consent: {
    marginTop: SPACING.xl,
    gap: SPACING.md,
  },
  checkRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: RADIUS.xs,
    borderWidth: 1.5,
    borderColor: COLORS.borderStrong,
    backgroundColor: 'rgba(255,255,255,0.03)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxOn: {
    borderColor: COLORS.gold,
    backgroundColor: COLORS.gold,
  },
  checkMark: {
    fontSize: 14,
    lineHeight: 16,
    color: COLORS.onGold,
    fontWeight: '700',
  },
  checkLabel: {
    flex: 1,
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  disclosure: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight + 2,
    color: COLORS.textFaint,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  privacyLink: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.gold,
    textAlign: 'right',
    textDecorationLine: 'underline',
  },
});