// ============================================================
// جرب حظك — (app) Tab Layout
// Bottom tabs: الرئيسية | الطاولات | البطولات | البروفايل
// ============================================================

import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { COLORS, FONTS, FONT_SIZES, SIZES } from '../../constants/theme';

function TabIcon({ icon, label, focused }: { icon: string; label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 22,
        color: focused ? COLORS.primary : COLORS.textMuted,
        textAlign: 'center',
      }}
    >
      {icon}
    </Text>
  );
}

export default function AppLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.bgSurface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
          height: SIZES.tabBarHeight,
          paddingBottom: 8,
          paddingTop: 6,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        tabBarLabelStyle: {
          fontFamily: FONTS.arabic.regular,
          fontSize: FONT_SIZES.caption,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'الرئيسية',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏠" label="الرئيسية" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="tables"
        options={{
          title: 'الطاولات',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🃏" label="الطاولات" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: 'البطولات',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="🏆" label="البطولات" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'البروفايل',
          tabBarIcon: ({ focused }) => (
            <TabIcon icon="👤" label="البروفايل" focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="table/[id]"
        options={{ href: null }}
      />
      <Tabs.Screen
        name="blackjack/[id]"
        options={{ href: null }}
      />
    </Tabs>
  );
}
