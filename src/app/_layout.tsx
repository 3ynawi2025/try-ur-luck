// ============================================================
// جرب حظك — Root Layout
// Auth guard: redirects to auth if not authenticated
// ============================================================

import { Stack } from 'expo-router';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen
        name="(app)"
        options={{ contentStyle: { backgroundColor: COLORS.bgPrimary } }}
      />
    </Stack>
  );
}
