// ============================================================
// جرب حظك — Root Layout
// تحميل الخطوط (Cairo عربي + Inter أرقام) + شاشة إقلاع
// ============================================================

import React from 'react';
import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_900Black,
} from '@expo-google-fonts/cairo';
import {
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
  Inter_900Black,
} from '@expo-google-fonts/inter';
import { COLORS, GRADIENTS, SPACING } from '../constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Cairo-Regular': Cairo_400Regular,
    'Cairo-Medium': Cairo_500Medium,
    'Cairo-SemiBold': Cairo_600SemiBold,
    'Cairo-Bold': Cairo_700Bold,
    'Cairo-Black': Cairo_900Black,
    'Inter-Medium': Inter_500Medium,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
    'Inter-Black': Inter_900Black,
  });

  if (!fontsLoaded) {
    return (
      <View style={styles.splash}>
        <LinearGradient colors={GRADIENTS.screen} style={StyleSheet.absoluteFill} />
        <ActivityIndicator color={COLORS.gold} size="large" />
        <Text style={styles.splashText}>جرب حظك</Text>
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen
          name="(app)"
          options={{ contentStyle: { backgroundColor: COLORS.bg } }}
        />
      </Stack>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    backgroundColor: COLORS.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  splashText: {
    color: COLORS.goldLight,
    fontSize: 20,
    letterSpacing: 1,
  },
});
