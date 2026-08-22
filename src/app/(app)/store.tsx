// ============================================================
// جرب حظك — المتجر: الاشتراك الذهبي (شهري)
// ⚠️ الدفع التجريبي حاليًا — مزود الدفع يُربط لاحقًا
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Bits';
import { BackIcon, CrownIcon, LockIcon, TrophyIcon, InfoIcon } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { apiFetch } from '../../lib/api';
import { router } from 'expo-router';

interface TierStatus {
  tier: 'regular' | 'gold';
  goldActive: boolean;
  goldUntil: string | null;
  isAdmin: boolean;
}

const BENEFITS = [
  { icon: LockIcon, text: 'إنشاء طاولات خاصة بكلمة سر — ادعُ أصدقاءك للعب معًا' },
  { icon: CrownIcon, text: 'شارة ذهبية مميزة بجانب اسمك في كل مكان' },
  { icon: TrophyIcon, text: 'أولوية في هدايا وجوائز إدارة اللعبة' },
  { icon: InfoIcon, text: 'دعم مباشر وأحداث حصرية قادمة' },
];

export default function StoreScreen() {
  const [status, setStatus] = useState<TierStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<TierStatus>('/api/store/status')
      .then(setStatus)
      .catch(() => setStatus({ tier: 'regular', goldActive: false, goldUntil: null, isAdmin: false }));
  }, []);

  const activate = async () => {
    if (busy || status?.goldActive) return;
    setBusy(true);
    setMsg(null);
    try {
      const s = await apiFetch<TierStatus>('/api/store/activate', { method: 'POST' });
      setStatus(s);
      setMsg('🎉 تم تفعيل الذهبي — استمتع بالطاولات الخاصة');
    } catch (e) {
      setMsg(`تعذر التفعيل: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  const goldUntilLabel = status?.goldUntil
    ? new Intl.DateTimeFormat('ar-u-ca-gregory', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(status.goldUntil))
    : '';

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <BackIcon size={20} color={COLORS.textDim} />
          </Pressable>
          <Text style={styles.title}>الاشتراك الذهبي</Text>
        </View>

        {status?.goldActive ? (
          <LinearGradient
            colors={['rgba(201,169,97,0.18)', 'rgba(201,169,97,0.03)']}
            style={styles.heroCard}
          >
            <CrownIcon size={34} color={COLORS.goldLight} />
            <Text style={styles.heroTitle}>أنت عضو ذهبي 👑</Text>
            <Text style={styles.heroSub}>مفعّل حتى {goldUntilLabel}</Text>
          </LinearGradient>
        ) : (
          <LinearGradient
            colors={['rgba(201,169,97,0.12)', 'rgba(21,27,38,0.5)']}
            style={styles.heroCard}
          >
            <Badge label="عادي" tone="neutral" />
            <Text style={styles.heroTitle}>ترقَّ إلى الذهبي</Text>
            <Text style={styles.heroSub}>طاولات خاصة مع أصدقائك + امتيازات حصرية</Text>
          </LinearGradient>
        )}

        <GlassCard padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockTitle}>مزايا الذهبي</Text>
          {BENEFITS.map((b, i) => (
            <View key={i} style={styles.benefitRow}>
              <View style={styles.benefitIcon}>
                <b.icon size={16} color={COLORS.gold} />
              </View>
              <Text style={styles.benefitText}>{b.text}</Text>
            </View>
          ))}
        </GlassCard>

        {!status?.goldActive && (
          <GlassCard variant="gold" padding={SPACING.xl} style={styles.block}>
            <View style={styles.priceRow}>
              <View>
                <Text style={styles.priceLabel}>اشتراك شهري</Text>
                <Text style={styles.price}>19.99 ر.س</Text>
              </View>
              <TrophyIcon size={22} color={COLORS.gold} />
            </View>
            <Text style={styles.priceHint}>يتجدد شهريًا — يمكنك الإلغاء في أي وقت. الدفع الحقيقي يُربط قريبًا؛ الزر أدناه تفعيل تجريبي.</Text>
            <GoldButton title={busy ? 'جارٍ التفعيل…' : 'فعّل الذهبي (تجريبي)'} onPress={activate} disabled={busy} />
          </GlassCard>
        )}

        {!!msg && <Text style={styles.msg}>{msg}</Text>}
      </ScrollView>
    </Screen>
  );
}


const styles = StyleSheet.create({
  scroll: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xxl,
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
    color: COLORS.text,
  },
  heroCard: {
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.goldRim,
    padding: SPACING.xl,
    alignItems: 'center',
    gap: SPACING.sm,
    ...SHADOWS.e2,
  },
  heroTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.goldLight,
  },
  heroSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  block: {
    gap: SPACING.md,
  },
  blockTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  benefitRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  benefitIcon: {
    width: 32,
    height: 32,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.08)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  benefitText: {
    flex: 1,
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    lineHeight: TYPE.small.lineHeight * 1.35,
  },
  priceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  priceLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  price: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h2.fontSize,
    color: COLORS.goldLight,
  },
  priceHint: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    lineHeight: TYPE.caption.lineHeight * 1.4,
  },
  msg: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.emerald,
    textAlign: 'center',
  },
});
