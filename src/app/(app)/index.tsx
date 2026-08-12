// ============================================================
// جرب حظك — الصالة الرئيسية
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  Easing,
  useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import Chip from '../../components/ui/Chip';
import { SectionHeader, Badge, BalancePill, SeatCounter } from '../../components/ui/Bits';
import {
  TexasIcon,
  BlackjackIcon,
  ChevronIcon,
  ClockIcon,
  CrownIcon,
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

const MOCK_TABLES = [
  { id: '1', gameType: 'texas_holdem', name: 'طاولة الرياض', players: 4, maxPlayers: 6, minBuyIn: 500, blinds: '10/20' },
  { id: '2', gameType: 'blackjack', name: 'طاولة الخليج', players: 3, maxPlayers: 5, minBuyIn: 1000 },
  { id: '3', gameType: 'texas_holdem', name: 'طاولة VIP', players: 5, maxPlayers: 6, minBuyIn: 5000, blinds: '200/400', vip: true },
];

const FEATURED = {
  id: '3',
  name: 'طاولة VIP',
  pot: 48200,
  minBuyIn: 5000,
  players: [
    { name: 'سلطان' },
    { name: 'نورة' },
    { name: 'فهد' },
    { name: 'لمى' },
    { name: 'خالد' },
  ],
};

// ------------------------------------------------------------
// نقطة "مباشر" نابضة
// ------------------------------------------------------------
function LiveDot() {
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1100, easing: Easing.out(Easing.quad), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 0, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, []);

  return (
    <View style={styles.liveWrap}>
      <Animated.View
        style={[
          styles.liveRing,
          {
            opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.85, 0] }),
            transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [1, 2.6] }) }],
          },
        ]}
      />
      <View style={styles.liveDot} />
    </View>
  );
}

// ------------------------------------------------------------
// بطاقة قابلة للضغط بارتداد خفيف
// ------------------------------------------------------------
function Tappable({
  children,
  onPress,
  style,
}: {
  children: React.ReactNode;
  onPress: () => void;
  style?: any;
}) {
  const scale = useRef(new Animated.Value(1)).current;
  const to = (v: number) =>
    Animated.spring(scale, { toValue: v, useNativeDriver: true, speed: 45, bounciness: 5 }).start();

  return (
    <Animated.View style={[{ transform: [{ scale }] }, style]}>
      <Pressable onPress={onPress} onPressIn={() => to(0.975)} onPressOut={() => to(1)}>
        {children}
      </Pressable>
    </Animated.View>
  );
}

// ------------------------------------------------------------
export default function HomeScreen() {
  const [balance] = useState(10250);
  const [user] = useState({ display_name: 'أحمد', username: '@ahmad' });
  const { width } = useWindowDimensions();
  const gameCardW = (width - SIZES.screenPadding * 2 - SPACING.md) / 2;

  return (
    <Screen>
      {/* ===== الترويسة ===== */}
      <View style={styles.header}>
        <Pressable onPress={() => router.push('/(app)/profile')} style={styles.headerUser}>
          <Avatar name={user.display_name} size={46} showBorder />
          <View style={styles.headerText}>
            <Text style={styles.greeting}>مساء الخير</Text>
            <Text style={styles.userName}>{user.display_name}</Text>
          </View>
        </Pressable>
        <BalancePill amount={balance} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ===== الطاولة المميزة ===== */}
        <Tappable onPress={() => router.push(`/(app)/table/${FEATURED.id}`)}>
          <View style={[styles.featured, SHADOWS.e3]}>
            {/* جوخ الخلفية */}
            <LinearGradient
              colors={['#14805B', '#0A5039', '#052A1F']}
              start={{ x: 0.1, y: 0 }}
              end={{ x: 0.9, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <LinearGradient
              colors={['rgba(0,0,0,0)', 'rgba(3,10,7,0.86)']}
              style={StyleSheet.absoluteFill}
            />

            <View style={styles.featuredTop}>
              <Badge label="مباشر الآن" tone="danger" icon={<LiveDot />} />
              <View style={styles.featuredVip}>
                <CrownIcon size={16} color={COLORS.goldLight} />
                <Text style={styles.featuredVipText}>VIP</Text>
              </View>
            </View>

            <Text style={styles.featuredName}>{FEATURED.name}</Text>

            <View style={styles.featuredPotRow}>
              <Chip amount={5000} size={38} stacked />
              <View style={styles.featuredPotCol}>
                <Text style={styles.featuredPotLabel}>مجموع الرهان</Text>
                <Text style={styles.featuredPot}>{formatNumber(FEATURED.pot)}</Text>
              </View>
            </View>

            <View style={styles.featuredBottom}>
              {/* أفاتارات متداخلة */}
              <View style={styles.stack}>
                {FEATURED.players.slice(0, 4).map((p, i) => (
                  <View key={p.name} style={[styles.stackItem, { marginRight: i === 0 ? 0 : -12 }]}>
                    <Avatar name={p.name} size={30} showBorder />
                  </View>
                ))}
                <View style={[styles.stackMore, { marginRight: -12 }]}>
                  <Text style={styles.stackMoreText}>+{FEATURED.players.length - 4}</Text>
                </View>
              </View>

              <GoldButton
                title="ادخل الطاولة"
                size="sm"
                onPress={() => router.push(`/(app)/table/${FEATURED.id}`)}
                style={styles.featuredCta}
              />
            </View>
          </View>
        </Tappable>

        {/* ===== اختيار اللعبة ===== */}
        <SectionHeader title="اختر لعبتك" />
        <View style={styles.gameRow}>
          {[
            { key: 'texas_holdem', Icon: TexasIcon, name: 'تكساس هولدم', desc: '٦ لاعبين', tone: '#0E6B48' },
            { key: 'blackjack', Icon: BlackjackIcon, name: 'بلاك جاك', desc: '٥ لاعبين', tone: '#6B2B3C' },
          ].map((g) => (
            <Tappable key={g.key} onPress={() => router.push('/(app)/tables')} style={{ width: gameCardW }}>
              <View style={[styles.gameCard, SHADOWS.e2]}>
                <LinearGradient
                  colors={[`${g.tone}66`, 'rgba(17,26,21,0.96)']}
                  start={{ x: 0.5, y: 0 }}
                  end={{ x: 0.5, y: 1 }}
                  style={StyleSheet.absoluteFill}
                />
                <LinearGradient
                  colors={['rgba(247,231,166,0.4)', 'rgba(247,231,166,0)']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.gameSheen}
                />
                <g.Icon size={46} color={COLORS.gold} />
                <Text style={styles.gameName}>{g.name}</Text>
                <Text style={styles.gameDesc}>{g.desc}</Text>
              </View>
            </Tappable>
          ))}
        </View>

        {/* ===== الطاولات المتاحة ===== */}
        <SectionHeader
          title="الطاولات المتاحة"
          action={
            <Pressable style={styles.seeAll} onPress={() => router.push('/(app)/tables')}>
              <Text style={styles.seeAllText}>الكل</Text>
              <ChevronIcon size={16} color={COLORS.gold} />
            </Pressable>
          }
        />

        <View style={styles.tableList}>
          {MOCK_TABLES.map((t) => (
            <Tappable key={t.id} onPress={() => router.push(`/(app)/table/${t.id}`)}>
              <GlassCard variant={t.vip ? 'gold' : 'default'} padding={SPACING.lg}>
                <View style={styles.tableTop}>
                  <View style={styles.tableTitleWrap}>
                    <Text style={styles.tableName}>{t.name}</Text>
                    <View style={styles.tableMetaRow}>
                      <Text style={styles.tableGame}>
                        {t.gameType === 'texas_holdem' ? 'تكساس هولدم' : 'بلاك جاك'}
                      </Text>
                      {!!t.blinds && (
                        <>
                          <View style={styles.dot} />
                          <Text style={styles.tableBlinds}>{t.blinds}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <SeatCounter players={t.players} max={t.maxPlayers} />
                </View>

                <View style={styles.tableBottom}>
                  <View style={styles.buyInRow}>
                    <Chip amount={t.minBuyIn} size={32} />
                    <View>
                      <Text style={styles.buyInLabel}>حد الدخول</Text>
                      <Text style={styles.buyInValue}>{formatNumber(t.minBuyIn)}</Text>
                    </View>
                  </View>
                  {t.vip ? (
                    <Badge label="VIP" tone="gold" icon={<CrownIcon size={13} color={COLORS.goldLight} />} />
                  ) : (
                    <ChevronIcon size={20} color={COLORS.textFaint} />
                  )}
                </View>
              </GlassCard>
            </Tappable>
          ))}
        </View>

        {/* ===== البطولة الأسبوعية ===== */}
        <SectionHeader title="البطولة الأسبوعية" />
        <GlassCard variant="gold" padding={SPACING.xl}>
          <View style={styles.tourTop}>
            <CrownIcon size={30} color={COLORS.gold} />
            <View style={styles.tourTimer}>
              <ClockIcon size={14} color={COLORS.textDim} />
              <Text style={styles.tourTimerText}>تنتهي خلال ٣ أيام</Text>
            </View>
          </View>

          <Text style={styles.tourPrizeLabel}>مجموع الجوائز</Text>
          <Text style={styles.tourPrize}>{formatNumber(50000)}</Text>
          <Text style={styles.tourNote}>ترتيبك الحالي: الرابع من ٢٤٠ لاعب</Text>

          <GoldButton
            title="عرض الترتيب"
            onPress={() => router.push('/(app)/leaderboard')}
            style={styles.tourBtn}
          />
        </GlassCard>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  // الترويسة
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.lg,
  },
  headerUser: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  headerText: {
    alignItems: 'flex-end',
  },
  greeting: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight,
    color: COLORS.textDim,
  },
  userName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.xxxl,
  },

  // الطاولة المميزة
  featured: {
    borderRadius: RADIUS.xl,
    overflow: 'hidden',
    padding: SPACING.xl,
    gap: SPACING.md,
    borderWidth: 1,
    borderColor: 'rgba(212,175,55,0.30)',
  },
  featuredTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  featuredVip: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  featuredVipText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 1,
  },
  featuredName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h1.fontSize,
    lineHeight: TYPE.h1.lineHeight,
    color: COLORS.text,
    textAlign: 'right',
  },
  featuredPotRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.md,
  },
  featuredPotCol: {
    alignItems: 'flex-end',
  },
  featuredPotLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: 'rgba(246,242,232,0.65)',
  },
  featuredPot: {
    fontFamily: FONTS.num.black,
    fontSize: 28,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  featuredBottom: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.sm,
  },
  featuredCta: {
    minWidth: 132,
  },
  stack: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
  },
  stackItem: {
    borderRadius: RADIUS.full,
  },
  stackMore: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: 'rgba(4,10,7,0.9)',
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stackMoreText: {
    fontFamily: FONTS.num.bold,
    fontSize: 11,
    color: COLORS.goldLight,
  },

  // "مباشر"
  liveWrap: {
    width: 8,
    height: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.crimson,
  },
  liveRing: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.crimson,
  },

  // بطاقات الألعاب
  gameRow: {
    flexDirection: 'row-reverse',
    gap: SPACING.md,
  },
  gameCard: {
    height: 148,
    borderRadius: RADIUS.lg,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  gameSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  gameName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.text,
    textAlign: 'center',
  },
  gameDesc: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    marginTop: -4,
  },

  // قائمة الطاولات
  seeAll: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 2,
  },
  seeAllText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.gold,
  },
  tableList: {
    gap: SPACING.md,
  },
  tableTop: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  tableTitleWrap: {
    flex: 1,
    alignItems: 'flex-end',
    gap: 2,
  },
  tableName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
  },
  tableMetaRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  tableGame: {
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
  tableBlinds: {
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  tableBottom: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: SPACING.lg,
  },
  buyInRow: {
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

  // البطولة
  tourTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.md,
  },
  tourTimer: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
  },
  tourTimerText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  tourPrizeLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  tourPrize: {
    fontFamily: FONTS.num.black,
    fontSize: 34,
    color: COLORS.goldLight,
    textAlign: 'right',
    includeFontPadding: false,
  },
  tourNote: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },
  tourBtn: {
    marginTop: SPACING.lg,
  },
});
