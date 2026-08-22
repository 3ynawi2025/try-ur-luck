// ============================================================
// جرب حظك — لوحة المدير: هدايا وجوائز للاعبين
// (تظهر فقط لحساب المدير is_admin — السيرفر يتحقق من الصلاحية)
// ============================================================

import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, TextInput, Keyboard } from 'react-native';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Bits';
import { BackIcon, SearchIcon, TrophyIcon } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, formatNumber } from '../../constants/theme';
import { apiFetch } from '../../lib/api';
import { router } from 'expo-router';

interface AdminUser {
  id: string;
  username: string;
  display_name: string;
  balance: number;
  tier: 'regular' | 'gold';
}

const QUICK_AMOUNTS = [1000, 5000, 10000, 50000];

export default function AdminScreen() {
  const [q, setQ] = useState('');
  const [results, setResults] = useState<AdminUser[]>([]);
  const [selected, setSelected] = useState<AdminUser | null>(null);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [stats, setStats] = useState<{ onlineUsers?: number; sockets?: number; tables?: { tables?: number; seatedPlayers?: number }; soloSessions?: number } | null>(null);

  // إحصاءات حية: متصلون + طاولات + جلسات (كل 10 ثوانٍ)
  useEffect(() => {
    const load = () =>
      apiFetch<any>('/api/admin/stats')
        .then(setStats)
        .catch(() => {});
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  const search = async () => {
    const query = q.trim();
    if (!query) return;
    Keyboard.dismiss();
    try {
      const users = await apiFetch<AdminUser[]>(`/api/admin/users?q=${encodeURIComponent(query)}`);
      setResults(users ?? []);
      setSelected(null);
      if (!users?.length) showToast('لا نتائج — جرّب اسمًا آخر');
    } catch (e) {
      showToast(`تعذر البحث: ${(e as Error).message}`);
    }
  };

  const sendGift = async () => {
    const amt = Math.round(Number(amount));
    if (!selected || !amt || amt <= 0 || busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/admin/gift', {
        method: 'POST',
        body: JSON.stringify({ userId: selected.id, amount: amt }),
      });
      showToast(`🎁 أُرسلت ${formatNumber(amt)} إلى @${selected.username}`);
      setAmount('');
      setResults([]);
      setSelected(null);
    } catch (e) {
      showToast(`فشل الإرسال: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        <View style={styles.headerRow}>
          <Pressable onPress={() => router.back()} hitSlop={10} style={styles.backBtn}>
            <BackIcon size={20} color={COLORS.textDim} />
          </Pressable>
          <Text style={styles.title}>لوحة المدير</Text>
          <Badge label="مدير" tone="gold" />
        </View>

        {stats && (
          <GlassCard variant="gold" padding={SPACING.lg} style={styles.block}>
            <Text style={styles.blockTitle}>📡 المتصلون الآن</Text>
            <View style={styles.statsRow}>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.onlineUsers ?? 0}</Text>
                <Text style={styles.statLabel}>لاعب متصل</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.sockets ?? 0}</Text>
                <Text style={styles.statLabel}>اتصال حي</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.tables?.tables ?? 0}</Text>
                <Text style={styles.statLabel}>طاولة هولدم</Text>
              </View>
              <View style={styles.statBox}>
                <Text style={styles.statValue}>{stats.soloSessions ?? 0}</Text>
                <Text style={styles.statLabel}>جلسة فردية</Text>
              </View>
            </View>
          </GlassCard>
        )}

        <GlassCard padding={SPACING.xl} style={styles.block}>
          <Text style={styles.blockTitle}>بحث عن لاعب</Text>
          <View style={styles.searchRow}>
            <TextInput
              value={q}
              onChangeText={setQ}
              placeholder="اسم المستخدم"
              placeholderTextColor={COLORS.textFaint}
              style={styles.input}
              onSubmitEditing={search}
              returnKeyType="search"
            />
            <Pressable onPress={search} hitSlop={8} style={styles.searchBtn}>
              <SearchIcon size={18} color={COLORS.onGold} />
            </Pressable>
          </View>

          {results.map((u) => (
            <Pressable
              key={u.id}
              onPress={() => setSelected(u)}
              style={[styles.userRow, selected?.id === u.id && styles.userRowActive]}
            >
              <View style={styles.userInfo}>
                <Text style={styles.userName}>@{u.username}</Text>
                <Text style={styles.userSub}>{u.display_name} — {formatNumber(u.balance)}</Text>
              </View>
              {u.tier === 'gold' && <Badge label="ذهبي" tone="gold" />}
            </Pressable>
          ))}
        </GlassCard>

        {selected && (
          <GlassCard variant="gold" padding={SPACING.xl} style={styles.block}>
            <View style={styles.giftHeader}>
              <TrophyIcon size={20} color={COLORS.gold} />
              <Text style={styles.blockTitle}>هدية إلى @{selected.username}</Text>
            </View>
            <TextInput
              value={amount}
              onChangeText={setAmount}
              placeholder="المبلغ (رقاقات)"
              placeholderTextColor={COLORS.textFaint}
              keyboardType="number-pad"
              style={styles.input}
            />
            <View style={styles.quickRow}>
              {QUICK_AMOUNTS.map((a) => (
                <Pressable key={a} onPress={() => setAmount(String(a))} style={styles.quickChip}>
                  <Text style={styles.quickChipText}>{a >= 1000 ? `${a / 1000}K` : a}</Text>
                </Pressable>
              ))}
            </View>
            <GoldButton title={busy ? 'جارٍ الإرسال…' : 'إرسال الهدية 🎁'} onPress={sendGift} disabled={busy || !Number(amount) || Number(amount) <= 0} />
          </GlassCard>
        )}

        {!!toast && (
          <View style={styles.toastWrap} pointerEvents="none">
            <Text style={styles.toastText}>{toast}</Text>
          </View>
        )}
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
    flex: 1,
  },
  block: {
    gap: SPACING.md,
  },
  blockTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  searchRow: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
  },
  searchBtn: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.gold,
  },
  userRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    padding: SPACING.md,
  },
  userRowActive: {
    borderColor: COLORS.gold,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  userInfo: {
    gap: 2,
  },
  userName: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  userSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  giftHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  quickRow: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  quickChip: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.06)',
  },
  quickChipText: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
  },
  statsRow: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.sm,
    paddingVertical: SPACING.sm,
  },
  statValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.goldLight,
  },
  statLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.micro.fontSize,
    color: COLORS.textDim,
  },
  toastWrap: {
    alignItems: 'center',
  },
  toastText: {
    backgroundColor: 'rgba(10,13,18,0.95)',
    borderWidth: 1,
    borderColor: COLORS.goldRim,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    color: COLORS.goldLight,
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    textAlign: 'center',
    overflow: 'hidden',
  },
});
