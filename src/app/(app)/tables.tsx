// ============================================================
// جرب حظك — الطاولات
// ============================================================

import React, { useCallback, useRef, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Animated, Modal, TextInput } from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Chip from '../../components/ui/Chip';
import Avatar from '../../components/ui/Avatar';
import { Badge, SeatCounter } from '../../components/ui/Bits';
import {
  ChevronIcon,
  LockIcon,
  PlusIcon,
  CrownIcon,
} from '../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SIZES,
  formatNumber,
} from '../../constants/theme';
import { apiFetch } from '../../lib/api';

type GameFilter = 'all' | 'texas_holdem' | 'blackjack' | 'three_card' | 'russian' | 'roulette';

const MOCK_TABLES = [
  { id: '1', gameType: 'texas_holdem', name: 'طاولة الرياض', players: 2, maxPlayers: 6, minBuyIn: 500, smallBlind: 10, bigBlind: 20, seated: ['سلطان', 'نورة'] },
  { id: '2', gameType: 'blackjack', name: 'طاولة الخليج', players: 3, maxPlayers: 5, minBuyIn: 1000, seated: ['فهد', 'لمى', 'خالد'] },
  { id: '3', gameType: 'texas_holdem', name: 'طاولة VIP', players: 5, maxPlayers: 6, minBuyIn: 5000, smallBlind: 200, bigBlind: 400, vip: true, seated: ['ريم', 'بدر', 'هند', 'ماجد', 'سارة'] },
  { id: '4', gameType: 'texas_holdem', name: 'طاولة مبتدئين', players: 1, maxPlayers: 6, minBuyIn: 500, smallBlind: 10, bigBlind: 20, seated: ['عمر'] },
  { id: '5', gameType: 'blackjack', name: 'طاولة المحترفين', players: 4, maxPlayers: 5, minBuyIn: 2500, seated: ['ليان', 'طلال', 'دانة', 'يوسف'] },
  { id: '6', gameType: 'texas_holdem', name: 'طاولة خاصة', players: 2, maxPlayers: 6, minBuyIn: 1500, smallBlind: 50, bigBlind: 100, isPrivate: true, seated: ['غير معروف', 'ضيف'] },
  { id: '7', gameType: 'three_card', name: 'طاولة ثلاث أوراق', players: 1, maxPlayers: 5, minBuyIn: 500, seated: ['أنت'] },
  { id: '8', gameType: 'russian', name: 'طاولة البوكر الروسي', players: 1, maxPlayers: 5, minBuyIn: 500, seated: ['أنت'] },
  { id: '9', gameType: 'roulette', name: 'طاولة الروليت', players: 1, maxPlayers: 5, minBuyIn: 100, seated: ['أنت'] },
];

const GAME_NAMES: Record<string, string> = {
  texas_holdem: 'تكساس هولدم',
  blackjack: 'بلاك جاك',
  three_card: 'ثلاث أوراق بوكر',
  russian: 'بوكر روسي',
  roulette: 'روليت',
};

const FILTERS: { key: GameFilter; label: string }[] = [
  { key: 'all', label: 'الكل' },
  { key: 'texas_holdem', label: 'تكساس هولدم' },
  { key: 'blackjack', label: 'بلاك جاك' },
  { key: 'three_card', label: 'ثلاث أوراق' },
  { key: 'russian', label: 'بوكر روسي' },
  { key: 'roulette', label: 'روليت' },
];

/** صيغ الجمع العربية: مفرد / مثنى / جمع قلة / جمع كثرة */
function seatsAvailable(n: number): string {
  if (n === 0) return 'الطاولة ممتلئة';
  if (n === 1) return 'مقعد واحد متاح';
  if (n === 2) return 'مقعدان متاحان';
  if (n <= 10) return `${n} مقاعد متاحة`;
  return `${n} مقعداً متاحاً`;
}

function tablesOpen(n: number): string {
  if (n === 0) return 'لا توجد طاولات مفتوحة';
  if (n === 1) return 'طاولة واحدة مفتوحة الآن';
  if (n === 2) return 'طاولتان مفتوحتان الآن';
  if (n <= 10) return `${n} طاولات مفتوحة الآن`;
  return `${n} طاولة مفتوحة الآن`;
}

function FilterTab({
  label,
  active,
  onPress,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.filter, active && styles.filterActive]}
    >
      <Text style={[styles.filterText, active && styles.filterTextActive]}>{label}</Text>
    </Pressable>
  );
}

function TableRow({ table }: { table: (typeof MOCK_TABLES)[number] }) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 45, bounciness: 5 }).start();

  const isFull = table.players >= table.maxPlayers;

  const openTable = () => {
    if (table.gameType === 'blackjack') router.push(`/(app)/blackjack/${table.id}`);
    else if (table.gameType === 'three_card') router.push(`/(app)/three-card/${table.id}`);
    else if (table.gameType === 'russian') router.push(`/(app)/russian/${table.id}`);
    else if (table.gameType === 'roulette') router.push(`/(app)/roulette/${table.id}`);
    else router.push(`/(app)/table/${table.id}`);
  };

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Pressable
        onPress={openTable}
        onPressIn={() => to(0.98)}
        onPressOut={() => to(1)}
      >
        <GlassCard variant={table.vip ? 'gold' : 'default'} padding={SPACING.lg}>
          {/* السطر العلوي */}
          <View style={styles.rowTop}>
            <View style={styles.titleCol}>
              <View style={styles.titleLine}>
                {table.isPrivate && <LockIcon size={15} color={COLORS.textDim} />}
                <Text style={styles.tableName}>{table.name}</Text>
              </View>
              <View style={styles.metaLine}>
                <Text style={styles.gameLabel}>
                  {GAME_NAMES[table.gameType] ?? table.gameType}
                </Text>
                {!!table.smallBlind && (
                  <>
                    <View style={styles.dot} />
                    <Text style={styles.blinds}>
                      {table.smallBlind}/{table.bigBlind}
                    </Text>
                  </>
                )}
              </View>
            </View>
            <SeatCounter players={table.players} max={table.maxPlayers} />
          </View>

          {/* الجالسون */}
          <View style={styles.seatedRow}>
            {table.seated.slice(0, 5).map((n, i) => (
              <View key={`${n}-${i}`} style={{ marginRight: i === 0 ? 0 : -10 }}>
                <Avatar name={n} size={26} showBorder />
              </View>
            ))}
            <Text style={styles.seatedText}>
              {seatsAvailable(table.maxPlayers - table.players)}
            </Text>
          </View>

          {/* السطر السفلي */}
          <View style={styles.rowBottom}>
            <View style={styles.buyIn}>
              <Chip amount={table.minBuyIn} size={32} />
              <View>
                <Text style={styles.buyInLabel}>حد الدخول</Text>
                <Text style={styles.buyInValue}>{formatNumber(table.minBuyIn)}</Text>
              </View>
            </View>

            {table.vip ? (
              <Badge label="VIP" tone="gold" icon={<CrownIcon size={13} color={COLORS.goldLight} />} />
            ) : isFull ? (
              <Badge label="ممتلئة" tone="danger" />
            ) : (
              <ChevronIcon size={20} color={COLORS.textFaint} />
            )}
          </View>
        </GlassCard>
      </Pressable>
    </Animated.View>
  );
}

export default function TablesScreen() {
  const [filter, setFilter] = useState<GameFilter>('all');
  const [serverTables, setServerTables] = useState<typeof MOCK_TABLES>(MOCK_TABLES);
  // إنشاء طاولة خاصة — حصري للذهبي
  const [goldActive, setGoldActive] = useState<boolean | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [tableName, setTableName] = useState('');
  const [tablePwd, setTablePwd] = useState('');
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (t: string) => {
    setToast(t);
    setTimeout(() => setToast(null), 4000);
  };

  // جلب الطاولات الحقيقية من السيرفر، مع الاحتفاظ بالبيانات الافتراضية كاحتياط
  const loadTables = useCallback(async () => {
    try {
      const data = await apiFetch<any[]>('/api/tables');
      if (!Array.isArray(data) || data.length === 0) return; // قاعدة فارغة → أبقِ الافتراضية

      const mapped = data.map((t: any) => ({
        id: String(t.id ?? ''),
        gameType: (t.game_type === 'three_card' ? 'three_card' : t.game_type) ?? 'texas_holdem',
        name: t.name ?? 'طاولة',
        players: t.table_players?.length ?? 0,
        maxPlayers: t.max_players ?? 6,
        minBuyIn: t.min_buy_in ?? 500,
        smallBlind: t.small_blind,
        bigBlind: t.big_blind,
        isPrivate: !!t.is_private,
        vip: t.name?.toLowerCase().includes('vip'),
        seated: (t.table_players ?? []).map((p: any) => p.display_name ?? 'لاعب'),
      }));
      setServerTables(mapped);
    } catch {
      /* تبقى الافتراضية */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadTables();
      // تحديث حالة الاشتراك كلما عاد المستخدم من المتجر
      apiFetch<{ goldActive: boolean }>('/api/store/status')
        .then((s) => setGoldActive(!!s.goldActive))
        .catch(() => setGoldActive(false));
    }, [loadTables])
  );

  // الضغط على إنشاء طاولة: ذهبي → نافذة الإنشاء، عادي → المتجر
  const onCreatePress = () => {
    if (goldActive === true) {
      setCreateOpen(true);
    } else if (goldActive === false) {
      showToast('إنشاء الطاولات الخاصة متاح للاشتراك الذهبي فقط 👑');
      setTimeout(() => router.push('/(app)/store' as never), 600);
    } else {
      apiFetch<{ goldActive: boolean }>('/api/store/status')
        .then((s) => {
          setGoldActive(!!s.goldActive);
          if (s.goldActive) setCreateOpen(true);
          else {
            showToast('إنشاء الطاولات الخاصة متاح للاشتراك الذهبي فقط 👑');
            setTimeout(() => router.push('/(app)/store' as never), 600);
          }
        })
        .catch(() => {
          setGoldActive(false);
          showToast('تعذر التحقق من الاشتراك — حاول لاحقًا');
        });
    }
  };

  // إرسال إنشاء الطاولة للسيرفر
  const submitCreate = async () => {
    const name = tableName.trim().slice(0, 40);
    if (!name || busy) return;
    setBusy(true);
    try {
      await apiFetch('/api/tables', {
        method: 'POST',
        body: JSON.stringify({
          game_type: 'texas_holdem',
          name,
          min_buy_in: 500,
          is_private: true,
          password: tablePwd.trim() || undefined,
        }),
      });
      setCreateOpen(false);
      setTableName('');
      setTablePwd('');
      showToast('✅ أُنشئت الطاولة — شاركها مع صديقك من قائمة الطاولات');
      loadTables();
    } catch (e) {
      const msg = (e as Error).message;
      showToast(msg === 'GOLD_REQUIRED' ? 'الاشتراك الذهبي مطلوب لإنشاء طاولة خاصة' : `تعذر الإنشاء: ${msg}`);
    } finally {
      setBusy(false);
    }
  };

  const tables =
    filter === 'all' ? serverTables : serverTables.filter((t) => t.gameType === filter);

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.title}>الطاولات</Text>
        <Text style={styles.subtitle}>{tablesOpen(tables.length)}</Text>
      </View>

      <View style={styles.filterBar}>
        {FILTERS.map((f) => (
          <FilterTab
            key={f.key}
            label={f.label}
            active={filter === f.key}
            onPress={() => setFilter(f.key)}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.list}>
          {tables.map((t) => (
            <TableRow key={t.id} table={t} />
          ))}
        </View>
      </ScrollView>

      <View style={styles.footer}>
        {/* تدرّج يفصل الزر عن القائمة المتحركة خلفه */}
        <LinearGradient
          colors={['rgba(10,13,18,0)', 'rgba(10,13,18,0.96)']}
          style={styles.footerScrim}
          pointerEvents="none"
        />
        <GoldButton
          title="إنشاء طاولة خاصة"
          icon={<PlusIcon size={18} color={COLORS.onGold} />}
          onPress={onCreatePress}
        />
      </View>

      {/* ===== إشعار مؤقت ===== */}
      {!!toast && (
        <View style={styles.toastWrap} pointerEvents="none">
          <Text style={styles.toastText}>{toast}</Text>
        </View>
      )}

      {/* ===== نافذة إنشاء طاولة خاصة (ذهبي) ===== */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.createOverlay}>
          <View style={styles.createCard}>
            <View style={styles.createHeader}>
              <CrownIcon size={22} color={COLORS.gold} />
              <Text style={styles.createTitle}>طاولة خاصة جديدة</Text>
            </View>
            <Text style={styles.createSub}>أصدقاؤك سيجدونها في قائمة الطاولات — كلمة السر اختيارية</Text>
            <TextInput
              value={tableName}
              onChangeText={setTableName}
              placeholder="اسم الطاولة"
              placeholderTextColor={COLORS.textFaint}
              style={styles.createInput}
              maxLength={40}
            />
            <TextInput
              value={tablePwd}
              onChangeText={setTablePwd}
              placeholder="كلمة سر (اختياري)"
              placeholderTextColor={COLORS.textFaint}
              style={styles.createInput}
              secureTextEntry
              maxLength={30}
            />
            <View style={styles.createRow}>
              <Pressable onPress={() => setCreateOpen(false)} hitSlop={8} style={styles.createCancel}>
                <Text style={styles.createCancelText}>إلغاء</Text>
              </Pressable>
              <GoldButton
                title={busy ? 'جارٍ الإنشاء…' : 'إنشاء'}
                onPress={submitCreate}
                disabled={busy || !tableName.trim()}
                style={styles.createBtn}
              />
            </View>
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.display.fontSize,
    lineHeight: TYPE.display.lineHeight,
    color: COLORS.text,
  },
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    marginTop: -4,
  },

  filterBar: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.lg,
  },
  filter: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  filterActive: {
    backgroundColor: 'rgba(201,169,97,0.12)',
    borderColor: COLORS.gold,
  },
  filterText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.textDim,
    includeFontPadding: false,
  },
  filterTextActive: {
    color: COLORS.goldLight,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.xxxl,
  },
  list: {
    gap: SPACING.md,
  },

  rowTop: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  titleCol: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  titleLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 6,
  },
  tableName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
  },
  metaLine: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  gameLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.textFaint,
  },
  blinds: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },

  seatedRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    marginTop: SPACING.lg,
    gap: SPACING.sm,
  },
  seatedText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    marginRight: SPACING.md,
  },

  rowBottom: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
    paddingTop: SPACING.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  buyIn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  buyInLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  buyInValue: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.goldLight,
    textAlign: 'right',
  },

  footer: {
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.md,
    paddingTop: SPACING.sm,
  },
  footerScrim: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    top: -SPACING.xxl,
  },
  // ===== إشعار مؤقت =====
  toastWrap: {
    position: 'absolute',
    left: SPACING.lg,
    right: SPACING.lg,
    bottom: 120,
    alignItems: 'center',
    zIndex: 30,
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
  // ===== نافذة إنشاء طاولة خاصة =====
  createOverlay: {
    flex: 1,
    backgroundColor: 'rgba(4,6,10,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  createCard: {
    width: '100%',
    maxWidth: 400,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: '#0E131B',
    padding: SPACING.xl,
    gap: SPACING.md,
  },
  createHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
  },
  createTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
  },
  createSub: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
    lineHeight: TYPE.small.lineHeight * 1.35,
  },
  createInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    color: COLORS.text,
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    textAlign: 'center',
  },
  createRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
    marginTop: SPACING.sm,
  },
  createCancel: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: SPACING.md,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  createCancelText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    color: COLORS.textDim,
  },
  createBtn: {
    flex: 1.4,
  },
});
