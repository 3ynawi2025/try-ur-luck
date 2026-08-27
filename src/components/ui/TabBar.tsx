// ============================================================
// جرب حظك — TabBar
// شريط عائم زجاجي: حدود شعرية + مؤشر شامبين هادئ + لمس مرتد
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS, ANIMATION } from '../../constants/theme';
import { HomeIcon, CardsIcon, TrophyIcon, UserIcon, UsersIcon, MajlisIcon, IconProps } from '../icons/GameIcons';

/**
 * نوع بنيوي مبسّط لخصائص شريط التبويبات.
 * نعرّفه محلياً بدل استيراد `BottomTabBarProps` لأن expo-router في SDK 57
 * يضم نسخة مضمنة (vendored) من react-navigation تتعارض أنواعها مع النسخة
 * المثبتة في node_modules.
 */
type TabBarProps = {
  state: {
    index: number;
    routes: Array<{ key: string; name: string }>;
  };
  descriptors: Record<
    string,
    {
      options: {
        tabBarStyle?: unknown;
        href?: unknown;
        title?: unknown;
      };
    }
  >;
  // نترك navigation عاماً لأن توقيع emit/navigate يختلف بين نسخة
  // expo-router المضمنة والنسخة المثبتة من react-navigation.
  navigation: any;
};

const ICONS: Record<string, React.FC<IconProps>> = {
  index: HomeIcon,
  tables: CardsIcon,
  majlis: MajlisIcon,
  leaderboard: TrophyIcon,
  friends: UsersIcon,
  profile: UserIcon,
};

function TabItem({
  label,
  focused,
  Icon,
  onPress,
}: {
  label: string;
  focused: boolean;
  Icon: React.FC<IconProps>;
  onPress: () => void;
}) {
  const anim = useRef(new Animated.Value(focused ? 1 : 0)).current;

  useEffect(() => {
    Animated.spring(anim, {
      toValue: focused ? 1 : 0,
      useNativeDriver: true,
      damping: ANIMATION.springSoft.damping,
      stiffness: ANIMATION.springSoft.stiffness,
      mass: ANIMATION.springSoft.mass,
    }).start();
  }, [focused]);

  return (
    <Pressable
      style={styles.item}
      onPress={() => {
        if (Platform.OS !== 'web') {
          Haptics.selectionAsync().catch(() => {});
        }
        onPress();
      }}
      hitSlop={6}
    >
      {/* كبسولة خافتة خلف التبويب النشط */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeHalo,
          {
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
          },
        ]}
      />

      <Animated.View
        style={{
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
          ],
        }}
      >
        <Icon size={22} color={focused ? COLORS.goldLight : COLORS.textFaint} filled={focused} />
      </Animated.View>

      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>

      {/* شرطة المؤشر */}
      <Animated.View
        style={
          {
            opacity: anim,
            transform: [{ scaleX: anim }],
            marginTop: 3,
            width: 16,
            height: 2,
            borderRadius: 2,
            backgroundColor: COLORS.gold,
          } as any
        }
      />
    </Pressable>
  );
}

export default function TabBar({ state, descriptors, navigation }: TabBarProps) {
  const insets = useSafeAreaInsets();

  // شاشات اللعب تُخفي الشريط — لكن نحسب الإخفاء من اسم المسار المركّز
  // (بدل tabBarStyle وحده) كي لا يعلق الشريط مخفيًا إذا علق التركيز على شاشة لعب
  // (كان يسبب منطقة بيضاء فارغة غير مستجيبة في الأسفل على iPad).
  const GAME_ROUTES = new Set([
    'table/[id]',
    'majlis/[id]',
    'blackjack/[id]',
    'three-card/[id]',
    'russian/[id]',
    'roulette/[id]',
  ]);

  const focusedRoute = state.routes[state.index];
  if (!focusedRoute || !descriptors[focusedRoute.key]) return null;
  if (GAME_ROUTES.has(focusedRoute.name)) return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
      {/* خلفية زجاجية عائمة */}
      <BlurView intensity={34} tint="dark" style={styles.blurSurface}>
        <View style={styles.row}>
          {state.routes.map((route, index) => {
            const descriptor = descriptors[route.key];
            if (!descriptor) return null;
            const { options } = descriptor;
            // التبويبات المخفية (href: null من expo-router) لا تُعرض
            if ((options as { href?: string | null }).href === null) return null;

            const Icon = ICONS[route.name];
            if (!Icon) return null;

            const focused = state.index === index;
            const label =
              typeof options.title === 'string' ? options.title : route.name;

            return (
              <TabItem
                key={route.key}
                label={label}
                focused={focused}
                Icon={Icon}
                onPress={() => {
                  const event = navigation.emit({
                    type: 'tabPress',
                    target: route.key,
                    canPreventDefault: true,
                  });
                  if (!focused && !event.defaultPrevented) {
                    navigation.navigate(route.name);
                  }
                }}
              />
            );
          })}
        </View>
      </BlurView>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: SPACING.sm,
  },
  blurSurface: {
    marginHorizontal: SPACING.md,
    marginTop: SPACING.xs,
    borderRadius: RADIUS.lg,
    borderWidth: StyleSheet.hairlineWidth * 2,
    borderColor: COLORS.borderStrong,
    overflow: 'hidden',
    backgroundColor: 'rgba(16,21,30,0.55)',
    ...{ shadowColor: '#000', shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.4, shadowRadius: 14, elevation: 8 },
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    minHeight: SIZES.tabBarHeight - 24,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 8,
    paddingBottom: 6,
  },
  activeHalo: {
    position: 'absolute',
    top: -2,
    width: 60,
    height: 44,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  label: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.micro.fontSize,
    lineHeight: TYPE.micro.lineHeight,
    color: COLORS.textFaint,
    includeFontPadding: false,
  },
  labelActive: {
    color: COLORS.goldLight,
  },
});
