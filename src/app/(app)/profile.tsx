// ============================================================
// جرب حظك — الملف الشخصي
// ============================================================

import React, { useCallback, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal, TextInput, Share } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import Chip from '../../components/ui/Chip';
import { Badge, StatTile, Divider } from '../../components/ui/Bits';
import {
  ClockIcon,
  EditIcon,
  SettingsIcon,
  LogoutIcon,
  ChevronIcon,
  CrownIcon,
  UsersIcon,
  CloseIcon,
  TrophyIcon,
} from '../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SIZES,
  SHADOWS,
  formatNumber,
} from '../../constants/theme';
import { useAuthStore } from '../../stores/authStore';
import { apiFetch } from '../../lib/api';

interface TxRow {
  id: string;
  type: string;
  amount: number;
  description: string;
  date: string;
}

/** تنسيق نسبي للوقت (منذ X دقيقة/ساعة/يوم) */
function relativeTime(iso?: string): string {
  if (!iso) return '';
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return '';
  const minutes = Math.max(1, Math.round((Date.now() - t) / 60000));
  if (minutes < 60) return `منذ ${minutes} دقيقة`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `منذ ${hours} ساعة`;
  return `منذ ${Math.round(hours / 24)} يوم`;
}

/** موعد تجديد الرصيد الأسبوعي: الجمعة القادمة 12:00 ظهرًا (بتوقيت الرياض) */
function nextFridayLabel(): string {
  const now = new Date();
  const daysUntilFriday = (5 - now.getDay() + 7) % 7;
  const target = new Date(now.getFullYear(), now.getMonth(), now.getDate() + daysUntilFriday, 12, 0);
  if (daysUntilFriday === 0 && now.getHours() >= 12) target.setDate(target.getDate() + 7);
  const dateLabel = new Intl.DateTimeFormat('ar-u-ca-gregory', { day: 'numeric', month: 'long' }).format(target);
  return `الجمعة ${dateLabel} ١٢:٠٠ ظهراً`;
}

function MenuRow({
  icon,
  label,
  onPress,
  danger,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  danger?: boolean;
}) {
  return (
    <Pressable onPress={onPress} style={styles.menuRow}>
      <View style={styles.menuLeft}>
        {icon}
        <Text style={[styles.menuLabel, danger && styles.menuLabelDanger]}>{label}</Text>
      </View>
      <ChevronIcon size={18} color={COLORS.textFaint} />
    </Pressable>
  );
}

export default function ProfileScreen() {
  const profile = useAuthStore((s) => s.profile);
  const bindEmail = useAuthStore((s) => s.bindEmail);
  const signOut = useAuthStore((s) => s.signOut);
  const [emailModal, setEmailModal] = useState(false);
  const [emailDraft, setEmailDraft] = useState('');
  const [balance, setBalance] = useState<number | null>(null);
  const [allTxs, setAllTxs] = useState<TxRow[]>([]);
  const [weeklyRank, setWeeklyRank] = useState<number | null>(null);
  const [inviteCount, setInviteCount] = useState(0);
  const [goldActive, setGoldActive] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  // بيانات حقيقية من السيرفر (مصادقة بالتوكن) عند كل زيارة للشاشة
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          const p = await apiFetch<{ balance?: number }>('/api/profile');
          if (!cancelled && p && typeof p.balance === 'number') {
            setBalance(Math.max(0, Number(p.balance)));
          }
        } catch {
          /* وضع ضيف — لا بروفايل */
        }
        try {
          const t = await apiFetch<any[]>('/api/transactions');
          if (!cancelled && Array.isArray(t)) {
            // الإحصائيات من كل العمليات المسترجعة، والعرض لآخر 6 فقط
            setAllTxs(
              t.map((row, i) => ({
                id: String(row.id ?? i),
                type: String(row.type ?? ''),
                amount: Number(row.amount ?? 0),
                description: String(row.description ?? 'عملية'),
                date: relativeTime(row.created_at),
              }))
            );
          }
        } catch {
          /* وضع ضيف */
        }
        try {
          const r = await apiFetch<{ rank?: number | null }>('/api/rank');
          if (!cancelled && r && typeof r.rank === 'number') {
            setWeeklyRank(r.rank);
          }
        } catch {
          /* وضع ضيف */
        }
        try {
          const inv = await apiFetch<{ count?: number }>('/api/invites');
          if (!cancelled && inv && typeof inv.count === 'number') {
            setInviteCount(inv.count);
          }
        } catch {
          /* وضع ضيف */
        }
        try {
          const t = await apiFetch<{ goldActive?: boolean; isAdmin?: boolean }>('/api/store/status');
          if (!cancelled && t) {
            setGoldActive(!!t.goldActive);
            setIsAdmin(!!t.isAdmin);
          }
        } catch {
          /* وضع ضيف */
        }
      })();
      return () => {
        cancelled = true;
      };
    }, [])
  );

  const displayName = profile?.displayName ?? 'لاعب';
  const username = profile ? `@${profile.username}` : '@guest';
  const shownBalance = balance ?? 0;
  const nextRefill = nextFridayLabel();

  // آخر 6 عمليات للعرض فقط — الإحصائيات من كل العمليات المسترجعة
  const txs = allTxs.slice(0, 6);

  // إحصائيات محسوبة من المعاملات الحقيقية
  const winCount = allTxs.filter((t) => t.type === 'win').length;
  const lossCount = allTxs.filter((t) => t.type === 'loss').length;
  const gameCount = winCount + lossCount;
  const winRate = gameCount > 0 ? Math.round((winCount / gameCount) * 100) : 0;

  const submitEmail = () => {
    const v = emailDraft.trim();
    if (!v || !v.includes('@')) return;
    bindEmail(v);
    setEmailModal(false);
    setEmailDraft('');
  };

  // مشاركة رابط الدعوة — كل صديق يسجل = +2,000 لك وله
  const shareInvite = async () => {
    if (!profile?.username) return;
    const link = `jareb-hazzak://(auth)/profile-setup?ref=${profile.username}`;
    const message = `🎰 تعال العب معي «جرب حظك» — مجلس اجتماعي للورق بدراهم افتراضية!\nسجّل برابطي واستلم +2,000 شريحة فورًا:\n${link}`;
    try {
      await Share.share({ message });
    } catch {
      /* ignore */
    }
  };

  return (
    <Screen>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== الهوية ===== */}
        <View style={[styles.hero, SHADOWS.e2]}>
          <LinearGradient
            colors={['rgba(201,169,97,0.16)', 'rgba(21,27,38,0.6)']}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <Avatar name={displayName} size={SIZES.avatarXl} showBorder />
          <Text style={styles.name}>{displayName}</Text>
          <Text style={styles.username}>{username}</Text>
          <View style={styles.badgeRow}>
            <Badge
              label={weeklyRank !== null ? `المركز ${weeklyRank} في المتصدرين` : 'المركز —'}
              tone="gold"
              icon={<CrownIcon size={13} color={COLORS.goldLight} />}
            />
            {goldActive && <Badge label="ذهبي ✨" tone="gold" />}
          </View>
        </View>

        {/* ===== الرصيد ===== */}
        <GlassCard variant="gold" padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockLabel}>رصيدك الحالي</Text>
          <View style={styles.balanceRow}>
            <Chip amount={Math.max(1000, shownBalance)} size={44} stacked />
            <Text style={styles.balance}>{formatNumber(shownBalance)}</Text>
          </View>
          <View style={styles.refillRow}>
            <ClockIcon size={14} color={COLORS.textDim} />
            <Text style={styles.refillText}>التجديد القادم: {nextRefill}</Text>
          </View>
        </GlassCard>

        {/* ===== الإحصائيات ===== */}
        <GlassCard padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockTitle}>إحصائياتي</Text>
          <View style={styles.statsRow}>
            <StatTile value={gameCount} label="مباراة" />
            <View style={styles.vRule} />
            <StatTile value={winCount} label="انتصار" tone={COLORS.goldLight} />
            <View style={styles.vRule} />
            <StatTile value={`${winRate}%`} label="نسبة الفوز" tone={COLORS.emerald} />
          </View>
        </GlassCard>

        {/* ===== دعوة الأصدقاء ===== */}
        <GlassCard padding={SPACING.xl} style={styles.block} variant="gold">
          <View style={styles.inviteTop}>
            <View style={styles.inviteTitleCol}>
              <Text style={styles.blockTitle}>ادعُ أصدقاءك</Text>
              <Text style={styles.inviteDesc}>
                كل صديق يسجل برابطك = +2,000 شريحة لك وله فورًا
              </Text>
            </View>
            {inviteCount >= 3 ? (
              <Badge label="سفير" tone="gold" icon={<CrownIcon size={13} color={COLORS.goldLight} />} />
            ) : (
              <Badge label={`${inviteCount} مدعو`} tone="gold" />
            )}
          </View>
          <View style={styles.inviteRow}>
            <Text style={styles.inviteCode} numberOfLines={1}>
              jareb-hazzak://…?ref={profile?.username ?? 'username'}
            </Text>
            <GoldButton title="مشاركة" size="sm" onPress={shareInvite} />
          </View>
        </GlassCard>

        {/* ===== العمليات ===== */}
        <GlassCard padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockTitle}>آخر العمليات</Text>
          {txs.length === 0 ? (
            <Text style={styles.txDate}>لا توجد عمليات بعد</Text>
          ) : (
            txs.map((tx, i) => (
              <View key={tx.id}>
                {i > 0 && <Divider />}
                <View style={styles.tx}>
                  <View style={styles.txInfo}>
                    <Text style={styles.txDesc}>{tx.description}</Text>
                    <Text style={styles.txDate}>{tx.date}</Text>
                  </View>
                  <Text
                    style={[
                      styles.txAmount,
                      tx.amount > 0 ? styles.txPositive : styles.txNegative,
                    ]}
                  >
                    {tx.amount > 0 ? '+' : '−'}
                    {formatNumber(Math.abs(tx.amount))}
                  </Text>
                </View>
              </View>
            ))
          )}
        </GlassCard>

        {/* ===== القائمة ===== */}
        <GlassCard padding={SPACING.sm} style={styles.block}>
          <MenuRow
            icon={<CrownIcon size={19} color={COLORS.gold} />}
            label={goldActive ? 'الاشتراك الذهبي — مفعّل 👑' : 'الاشتراك الذهبي'}
            onPress={() => router.push('/(app)/store')}
          />
          <Divider />
          {isAdmin && (
            <>
              <MenuRow
                icon={<TrophyIcon size={19} color={COLORS.gold} />}
                label="لوحة المدير — هدايا وجوائز"
                onPress={() => router.push('/(app)/admin')}
              />
              <Divider />
            </>
          )}
          <MenuRow
            icon={<UsersIcon size={19} color={COLORS.textDim} />}
            label="الأصدقاء"
            onPress={() => router.push('/(app)/friends')}
          />
          <Divider />
          <MenuRow
            icon={<EditIcon size={19} color={COLORS.textDim} />}
            label={profile?.email ? `بريدك: ${profile.email}` : 'ربط البريد لتثبيت الحساب'}
            onPress={() => {
              setEmailDraft(profile?.email ?? '');
              setEmailModal(true);
            }}
          />
          <Divider />
          <MenuRow
            icon={<SettingsIcon size={19} color={COLORS.textDim} />}
            label="الإعدادات"
            onPress={() => {}}
          />
        </GlassCard>

        <GoldButton
          title="تسجيل الخروج"
          variant="danger"
          icon={<LogoutIcon size={18} color="#ffdad6" />}
          onPress={() => {
            signOut();
            router.replace('/(auth)');
          }}
          style={styles.logout}
        />

        <Text style={styles.disclaimer}>
          الدراهم افتراضية بالكامل وليس لها أي قيمة نقدية
        </Text>
      </ScrollView>

      {/* ===== نافذة ربط البريد ===== */}
      <Modal
        visible={emailModal}
        transparent
        animationType="fade"
        onRequestClose={() => setEmailModal(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setEmailModal(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>ربط البريد الإلكتروني</Text>
              <Pressable style={styles.modalClose} onPress={() => setEmailModal(false)} hitSlop={8}>
                <CloseIcon size={18} color={COLORS.textDim} />
              </Pressable>
            </View>
            <Text style={styles.modalDesc}>
              اربط بريدك لحفظ حسابك واسترجاعه إذا غيّرت جهازك
            </Text>
            <View style={styles.modalInputWrap}>
              <TextInput
                style={styles.modalInput}
                placeholder="example@email.com"
                placeholderTextColor={COLORS.textFaint}
                selectionColor={COLORS.gold}
                value={emailDraft}
                onChangeText={setEmailDraft}
                autoCapitalize="none"
                keyboardType="email-address"
                autoFocus
              />
            </View>
            <GoldButton
              title="حفظ البريد"
              onPress={submitEmail}
              disabled={!emailDraft.includes('@')}
              style={styles.modalCta}
            />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.xxxl,
  },

  hero: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
  },
  name: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h1.fontSize,
    lineHeight: TYPE.h1.lineHeight,
    color: COLORS.text,
    marginTop: SPACING.sm,
  },
  username: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    marginTop: -6,
    marginBottom: SPACING.sm,
  },
  badgeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    flexWrap: 'wrap',
  },

  block: {
    marginTop: SPACING.lg,
  },
  blockLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  blockTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
    textAlign: 'right',
    marginBottom: SPACING.lg,
  },

  balanceRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.lg,
    marginTop: SPACING.sm,
  },
  balance: {
    fontFamily: FONTS.num.black,
    fontSize: 34,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  refillRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
    marginTop: SPACING.lg,
  },
  refillText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },

  statsRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  vRule: {
    width: StyleSheet.hairlineWidth,
    height: 34,
    backgroundColor: COLORS.border,
  },

  inviteTop: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  inviteTitleCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  inviteDesc: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.textDim,
    marginTop: -SPACING.sm,
  },
  inviteRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
    marginTop: SPACING.lg,
  },
  inviteCode: {
    flex: 1,
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'left',
  },

  tx: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: SPACING.md,
    gap: SPACING.lg,
  },
  txInfo: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 1,
  },
  txDesc: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.text,
  },
  txDate: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
  },
  txAmount: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
  },
  txPositive: { color: COLORS.emerald },
  txNegative: { color: COLORS.crimson },

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
  menuLabelDanger: {
    color: COLORS.crimson,
  },

  logout: {
    marginTop: SPACING.xl,
  },

  // ===== نافذة ربط البريد =====
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,13,18,0.72)',
    justifyContent: 'center',
    paddingHorizontal: SPACING.xl,
  },
  modalCard: {
    backgroundColor: COLORS.bgSoft,
    borderRadius: RADIUS.xl,
    padding: SPACING.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    gap: SPACING.md,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
  },
  modalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  modalDesc: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    lineHeight: TYPE.small.lineHeight,
  },
  modalInputWrap: {
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.lg,
    height: 54,
    justifyContent: 'center',
  },
  modalInput: {
    color: COLORS.text,
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    textAlign: 'right',
  },
  modalCta: {
    marginTop: SPACING.sm,
  },

  disclaimer: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.xl,
  },
});