// ============================================================
// جرب حظك — (app) Tab Layout
// شريط مخصص: الرئيسية | الطاولات | البطولات | حسابي
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
      <Tabs.Screen name="leaderboard" options={{ title: 'البطولات' }} />
      <Tabs.Screen name="profile" options={{ title: 'حسابي' }} />

      {/* شاشات اللعب — تُخفي الشريط بالكامل لتجربة غامرة */}
      <Tabs.Screen
        name="table/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
      <Tabs.Screen
        name="blackjack/[id]"
        options={{ href: null, tabBarStyle: { display: 'none' } }}
      />
    </Tabs>
  );
}
