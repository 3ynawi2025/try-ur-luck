// ============================================================
// جرب حظك — (app) Tab Layout — Midnight Royale
// شريط مخصص من ٤ وجهات: الرئيسية | الطاولات | المكافآت | حسابي
// ============================================================

import React from 'react';
import { Tabs } from 'expo-router';
import TabBar from '../../components/ui/TabBar';
import { COLORS } from '../../constants/theme';

export default function AppLayout() {
  return (
    <Tabs
      tabBar={(props) => <TabBar {...props} />}
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: COLORS.bg },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'الرئيسية' }} />
      <Tabs.Screen name="tables" options={{ title: 'الطاولات' }} />
      <Tabs.Screen name="majlis" options={{ title: 'المجالس' }} />
      <Tabs.Screen name="leaderboard" options={{ title: 'المتصدرون' }} />
      <Tabs.Screen name="profile" options={{ title: 'حسابي' }} />
      {/* الأصدقاء — شاشة متاحة لكنها ليست وجهة رئيسية في الشريط */}
      <Tabs.Screen name="friends" options={{ href: null }} />

      {/* شاشات اللعب — تُخفي الشريط بالكامل لتجربة غامرة */}
      <Tabs.Screen
        name="table/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="majlis/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="blackjack/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="three-card/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="russian/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="roulette/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
