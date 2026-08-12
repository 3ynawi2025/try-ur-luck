// ============================================================
// جرب حظك — TabBar
// شريط سفلي مخصص: أيقونات SVG + مؤشر ذهبي متدرّج + لمس مرتد
// ============================================================

import React, { useEffect, useRef } from 'react';
import { View, Text, Pressable, StyleSheet, Animated, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS } from '../../constants/theme';
import { HomeIcon, CardsIcon, TrophyIcon, UserIcon, IconProps } from '../icons/GameIcons';

const ICONS: Record<string, React.FC<IconProps>> = {
  index: HomeIcon,
  tables: CardsIcon,
  leaderboard: TrophyIcon,
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
      speed: 20,
      bounciness: 8,
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
      {/* وهج خلف التبويب النشط */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.activeHalo,
          {
            opacity: anim,
            transform: [{ scale: anim.interpolate({ inputRange: [0, 1], outputRange: [0.7, 1] }) }],
          },
        ]}
      >
        <LinearGradient
          colors={['rgba(212,175,55,0.22)', 'rgba(212,175,55,0)']}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>

      <Animated.View
        style={{
          transform: [
            { translateY: anim.interpolate({ inputRange: [0, 1], outputRange: [0, -2] }) },
          ],
        }}
      >
        <Icon size={23} color={focused ? COLORS.gold : COLORS.textFaint} filled={focused} />
      </Animated.View>

      <Text style={[styles.label, focused && styles.labelActive]} numberOfLines={1}>
        {label}
      </Text>

      {/* شرطة المؤشر */}
      <Animated.View
        style={[
          styles.indicator,
          {
            opacity: anim,
            transform: [{ scaleX: anim }],
          },
        ]}
      />
    </Pressable>
  );
}

export default function TabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();

  // شاشات اللعب تطلب إخفاء الشريط عبر tabBarStyle.display
  const focusedOptions = descriptors[state.routes[state.index].key].options;
  const tabBarStyle = StyleSheet.flatten(focusedOptions.tabBarStyle) as
    | { display?: 'none' | 'flex' }
    | undefined;
  if (tabBarStyle?.display === 'none') return null;

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
      <LinearGradient
        colors={['rgba(10,18,14,0.94)', 'rgba(4,7,6,0.99)']}
        style={StyleSheet.absoluteFill}
      />
      {/* خيط ذهبي علوي */}
      <LinearGradient
        colors={['rgba(212,175,55,0)', 'rgba(212,175,55,0.5)', 'rgba(212,175,55,0)']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.topRule}
      />

      <View style={styles.row}>
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
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
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    paddingTop: SPACING.sm + 2,
    overflow: 'hidden',
  },
  topRule: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1,
  },
  row: {
    flexDirection: 'row-reverse',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    minHeight: SIZES.tabBarHeight - 20,
  },
  item: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
    paddingTop: 6,
  },
  activeHalo: {
    position: 'absolute',
    top: -10,
    width: 62,
    height: 44,
    borderRadius: RADIUS.full,
    overflow: 'hidden',
  },
  label: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.micro.fontSize + 0.5,
    lineHeight: TYPE.micro.lineHeight,
    color: COLORS.textFaint,
    includeFontPadding: false,
  },
  labelActive: {
    color: COLORS.goldLight,
  },
  indicator: {
    marginTop: 3,
    width: 18,
    height: 2,
    borderRadius: 2,
    backgroundColor: COLORS.gold,
  },
});
