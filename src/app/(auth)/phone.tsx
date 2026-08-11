// ============================================================
// جرب حظك — Phone Input Screen
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import GoldButton from '../../components/ui/GoldButton';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../constants/theme';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    if (phone.length >= 8) {
      router.push({ pathname: '/(auth)/otp', params: { phone: `+966${phone}` } });
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>مرحباً بك</Text>
        <Text style={styles.subtitle}>أدخل رقم جوالك للمتابعة</Text>

        <View style={styles.form}>
          <Input
            label="رقم الجوال"
            prefix="🇸🇦 +966"
            placeholder="5X XXX XXXX"
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
            maxLength={9}
          />
        </View>

        <GoldButton
          title="أرسل رمز التحقق"
          onPress={handleSubmit}
          disabled={phone.length < 8}
        />
      </View>

      <Text style={styles.terms}>
        بالدخول، أنت توافق على الشروط والأحكام وسياسة الخصوصية
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    padding: SPACING.xl,
    justifyContent: 'space-between',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h1,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
    textAlign: 'right',
  },
  form: {
    marginVertical: SPACING.md,
  },
  terms: {
    fontFamily: FONTS.arabic.light,
    fontSize: FONT_SIZES.caption,
    color: COLORS.textMuted,
    textAlign: 'center',
    opacity: 0.6,
    paddingBottom: SPACING.lg,
  },
});
