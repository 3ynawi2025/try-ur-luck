// ============================================================
// جرب حظك — الإعدادات (توجيه App Store — روابط الامتثال)
// شاشة مخفية: تُفتح من الملف الشخصي.
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import * as Linking from 'expo-linking';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import {
  BackIcon,
  InfoIcon,
  LockIcon,
  UserIcon,
  SendIcon,
  ChevronIcon,
  KeyIcon,
  SpeakerIcon,
  SpeakerOffIcon,
} from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS } from '../../constants/theme';
import { router } from 'expo-router';
import { useAuthStore } from '../../stores/authStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { sfx } from '../../lib/sounds';

const PRIVACY_URL = 'https://jareb-hazzak-server.onrender.com/privacy';
const SUPPORT_URL = 'https://jareb-hazzak-server.onrender.com/support';

function MenuRow({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuLeft}>
        {icon}
        <Text style={styles.menuLabel}>{label}</Text>
      </View>
      <ChevronIcon size={18} color={COLORS.textFaint} />
    </Pressable>
  );
}

export default function SettingsScreen() {
  const setPassword = useAuthStore((s) => s.setPassword);
  const bindEmail = useAuthStore((s) => s.bindEmail);
  const busy = useAuthStore((s) => s.busy);
  const soundEnabled = useSettingsStore((s) => s.soundEnabled);
  const setSoundEnabled = useSettingsStore((s) => s.setSoundEnabled);
  const [pwOpen, setPwOpen] = useState(false);
  const [pw, setPw] = useState('');
  const [pw2, setPw2] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);

  const [emailOpen, setEmailOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<string | null>(null);
  const [emailErr, setEmailErr] = useState<string | null>(null);
  const [emailBusy, setEmailBusy] = useState(false);

  const submitPassword = async () => {
    if (pw.length < 6) {
      setPwErr('كلمة المرور ٦ أحرف على الأقل');
      return;
    }
    if (pw !== pw2) {
      setPwErr('كلمتا المرور غير متطابقتين');
      return;
    }
    setPwErr(null);
    try {
      await setPassword(pw);
      setPwMsg('تم تعيين كلمة المرور — سجّل بها مستقبلًا');
      setTimeout(() => {
        setPwOpen(false);
        setPwMsg(null);
        setPw('');
        setPw2('');
      }, 1500);
    } catch {
      setPwErr('تعذّر تعيين كلمة المرور — حاول مجددًا');
    }
  };

  const submitEmail = async () => {
    const v = email.trim();
    if (!/^\S+@\S+\.\S+$/.test(v)) {
      setEmailErr('البريد الإلكتروني غير صالح');
      return;
    }
    setEmailErr(null);
    setEmailBusy(true);
    try {
      await bindEmail(v);
      setEmailMsg('أُرسل رابط تأكيد لبريدك — اضغطه لتفعيله');
      setTimeout(() => {
        setEmailOpen(false);
        setEmailMsg(null);
        setEmail('');
      }, 1500);
    } catch (e: any) {
      if (e?.message === 'EMAIL_TAKEN') {
        setEmailErr('البريد مستخدم بحساب آخر');
      } else if (e?.message === 'EMAIL_INVALID') {
        setEmailErr('البريد الإلكتروني غير صالح');
      } else if (e?.message === 'EMAIL_SERVICE_UNAVAILABLE') {
        setEmailErr('خدمة البريد غير مهيأة بعد — أبلغ المطور');
      } else {
        setEmailErr('تعذّر ربط البريد — حاول مجددًا');
      }
    } finally {
      setEmailBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scroll}
      >
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <BackIcon size={20} color={COLORS.textDim} />
          </Pressable>
          <Text style={styles.title}>الإعدادات</Text>
        </View>

        <GlassCard padding={SPACING.sm} style={styles.block}>
          <View style={styles.menuRow}>
            <View style={styles.menuLeft}>
              {soundEnabled ? (
                <SpeakerIcon size={19} color={COLORS.gold} />
              ) : (
                <SpeakerOffIcon size={19} color={COLORS.textDim} />
              )}
              <Text style={styles.menuLabel}>المؤثرات الصوتية</Text>
            </View>
            <Switch
              value={soundEnabled}
              onValueChange={(v) => {
                setSoundEnabled(v);
                if (v) sfx.chip();
              }}
              trackColor={{ false: 'rgba(255,255,255,0.12)', true: 'rgba(201,169,97,0.35)' }}
              thumbColor={soundEnabled ? COLORS.goldLight : COLORS.textDim}
            />
          </View>
          <View style={styles.divider} />
          <MenuRow
            icon={<KeyIcon size={19} color={COLORS.gold} />}
            label="تعيين كلمة المرور"
            onPress={() => setPwOpen(true)}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<SendIcon size={19} color={COLORS.gold} />}
            label="ربط البريد الإلكتروني"
            onPress={() => setEmailOpen(true)}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<InfoIcon size={19} color={COLORS.textDim} />}
            label="قواعد السلوك والإبلاغ"
            onPress={() => router.push('/(app)/rules')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<LockIcon size={19} color={COLORS.textDim} />}
            label="شروط الاستخدام"
            onPress={() => router.push('/(app)/terms')}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<UserIcon size={19} color={COLORS.textDim} />}
            label="سياسة الخصوصية"
            onPress={() => Linking.openURL(PRIVACY_URL).catch(() => {})}
          />
          <View style={styles.divider} />
          <MenuRow
            icon={<SendIcon size={19} color={COLORS.textDim} />}
            label="الدعم"
            onPress={() => Linking.openURL(SUPPORT_URL).catch(() => {})}
          />
        </GlassCard>

        <Text style={styles.note}>
          حذف الحساب متاح من صفحة حسابك.{'\n'}كلمة المرور تحمي حسابك عند تغيير الجهاز أو إعادة التثبيت.
        </Text>
      </ScrollView>

      <Modal
        visible={pwOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setPwOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>تعيين كلمة المرور</Text>
            <Text style={styles.modalSub}>
              ستستخدمها لتسجيل الدخول إذا حذفت التطبيق أو بدّلت جهازك
            </Text>
            <TextInput
              style={styles.pwInput}
              placeholder="كلمة المرور (٦ أحرف على الأقل)"
              placeholderTextColor={COLORS.textFaint}
              secureTextEntry
              value={pw}
              onChangeText={setPw}
              autoCapitalize="none"
            />
            <TextInput
              style={styles.pwInput}
              placeholder="تأكيد كلمة المرور"
              placeholderTextColor={COLORS.textFaint}
              secureTextEntry
              value={pw2}
              onChangeText={setPw2}
              autoCapitalize="none"
            />
            {pwErr && <Text style={styles.pwErr}>{pwErr}</Text>}
            {pwMsg && <Text style={styles.pwOk}>{pwMsg}</Text>}
            <View style={styles.modalActions}>
              <GoldButton title="إلغاء" variant="ghost" onPress={() => setPwOpen(false)} />
              <GoldButton title="حفظ" onPress={submitPassword} disabled={busy} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={emailOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailOpen(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>ربط البريد الإلكتروني</Text>
            <Text style={styles.modalSub}>
              اربط بريدك لتأمين حسابك واستعادة الوصول عند الحاجة
            </Text>
            <TextInput
              style={styles.pwInput}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textFaint}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              textContentType="emailAddress"
            />
            {emailErr && <Text style={styles.pwErr}>{emailErr}</Text>}
            {emailMsg && <Text style={styles.pwOk}>{emailMsg}</Text>}
            <View style={styles.modalActions}>
              <GoldButton title="إلغاء" variant="ghost" onPress={() => setEmailOpen(false)} />
              <GoldButton
                title="حفظ"
                onPress={submitEmail}
                disabled={emailBusy}
                loading={emailBusy}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: {
    padding: SIZES.screenPadding,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  headerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  backBtn: {
    padding: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h2.fontSize,
    lineHeight: TYPE.h2.lineHeight,
    color: COLORS.text,
    flex: 1,
  },
  block: {
    gap: 0,
  },
  menuRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.md,
  },
  menuLeft: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  menuLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.text,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginHorizontal: SPACING.md,
  },
  note: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.sm,
    lineHeight: TYPE.caption.lineHeight * 1.6,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(4,6,10,0.72)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 380,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: COLORS.surfaceSunken,
    padding: SPACING.lg,
    gap: SPACING.md,
  },
  modalTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
    textAlign: 'center',
  },
  modalSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  pwInput: {
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    color: COLORS.text,
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    backgroundColor: COLORS.surface,
    textAlign: 'right',
  },
  pwErr: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.crimson,
    textAlign: 'center',
  },
  pwOk: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.emerald,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row-reverse',
    justifyContent: 'center',
    gap: SPACING.md,
    marginTop: SPACING.xs,
  },
});
