// ============================================================
// جرب حظك — Root Layout
// Auth guard + Font loading
// ============================================================

import { Stack } from 'expo-router';
import { useFonts } from 'expo-font';
import { Cairo_400Regular, Cairo_500Medium, Cairo_700Bold } from '@expo-google-fonts/cairo';
import { Inter_400Regular, Inter_600SemiBold, Inter_700Bold } from '@expo-google-fonts/inter';
import { View, Text } from 'react-native';
import { COLORS } from '../constants/theme';

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    'Cairo-Regular': Cairo_400Regular,
    'Cairo-Medium': Cairo_500Medium,
    'Cairo-Bold': Cairo_700Bold,
    'Inter-Regular': Inter_400Regular,
    'Inter-SemiBold': Inter_600SemiBold,
    'Inter-Bold': Inter_700Bold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bgPrimary, alignItems: 'center', justifyContent: 'center' }}>
        <Text style={{ color: COLORS.primary, fontSize: 18 }}>جرب حظك...</Text>
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(app)" options={{ contentStyle: { backgroundColor: COLORS.bgPrimary } }} />
    </Stack>
  );
}
