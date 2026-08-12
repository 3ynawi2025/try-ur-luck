// ============================================================
// جرب حظك — إدخال رقم الجوال
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Input from '../../components/ui/Input';
import { BackIcon } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES } from '../../constants/theme';

export default function PhoneScreen() {
  const [phone, setPhone] = useState('');
  const insets = useSafeAreaInsets();
  const valid = phone.length >= 8;

  const handleSubmit = () => {
    if (!valid) return;
    router.push({ pathname: '/(auth)/otp', params: { phone: `+966${phone}` } });
  };

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <Pressable style={styles.back} onPress={() => router.back()} hitSlop={8}>
            <BackIcon size={20} color={COLORS.text} />
          </Pressable>
        </View>

        <View style={styles.content}>
          <View style={styles.stepRow}>
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
            <View style={styles.step} />
          </View>

          <Text style={styles.title}>مرحباً بك</Text>
          <Text style={styles.subtitle}>
            أدخل رقم جوالك وسنرسل لك رمز تحقق من أربعة أرقام
          </Text>

          <View style={styles.form}>
            <Input
              label="رقم الجوال"
              prefix="+966"
              placeholder="5X XXX XXXX"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
              maxLength={9}
              numeric
            />
          </View>

          <GoldButton title="أرسل رمز التحقق" onPress={handleSubmit} disabled={!valid} />
        </View>

        <Text style={[styles.terms, { paddingBottom: insets.bottom + SPACING.lg }]}>
          بالمتابعة أنت توافق على الشروط والأحكام وسياسة الخصوصية
        </Text>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.sm,
    alignItems: 'flex-end',
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.screenPadding,
  },
  stepRow: {
    flexDirection: 'row-reverse',
    gap: 6,
    marginBottom: SPACING.xl,
  },
  step: {
    width: 26,
    height: 3,
    borderRadius: 2,
    backgroundColor: COLORS.border,
  },
  stepActive: {
    backgroundColor: COLORS.gold,
    width: 34,
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.display.fontSize,
    lineHeight: TYPE.display.lineHeight,
    color: COLORS.text,
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.textDim,
    textAlign: 'right',
    marginTop: SPACING.sm,
  },
  form: {
    marginTop: SPACING.xxl,
  },
  terms: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    lineHeight: TYPE.caption.lineHeight + 4,
    color: COLORS.textFaint,
    textAlign: 'center',
    paddingHorizontal: SPACING.xxl,
  },
});
