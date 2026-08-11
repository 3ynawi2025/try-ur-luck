// ============================================================
// جرب حظك — OTP Screen
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import GoldButton from '../../components/ui/GoldButton';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../constants/theme';

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');

  const handleVerify = () => {
    // TODO: actual OTP verification
    router.push('/(auth)/profile-setup');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>أدخل الرمز</Text>
        <Text style={styles.subtitle}>أرسلنا رمزاً إلى</Text>
        <Text style={styles.phone}>{phone || '+966 5X XXX XXXX'}</Text>

        <Input
          placeholder="_ _ _ _"
          keyboardType="number-pad"
          value={otp}
          onChangeText={setOtp}
          maxLength={4}
          containerStyle={styles.otpInput}
        />

        <GoldButton
          title="تأكيد"
          onPress={handleVerify}
          disabled={otp.length < 4}
        />

        <Text style={styles.resend}>
          لم يصلك؟ <Text style={styles.resendLink}>إعادة الإرسال</Text>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.bgPrimary,
    padding: SPACING.xl,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.md,
  },
  title: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h1,
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.body,
    color: COLORS.textMuted,
  },
  phone: {
    fontFamily: FONTS.english.semibold,
    fontSize: FONT_SIZES.h3,
    color: COLORS.primary,
    direction: 'ltr',
  },
  otpInput: {
    marginVertical: SPACING.md,
  },
  resend: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.textMuted,
    marginTop: SPACING.md,
  },
  resendLink: {
    color: COLORS.primary,
  },
});
