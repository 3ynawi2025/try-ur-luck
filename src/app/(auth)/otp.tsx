// ============================================================
// جرب حظك — رمز التحقق
// ============================================================

import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import { BackIcon } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SIZES } from '../../constants/theme';

const LENGTH = 4;

export default function OtpScreen() {
  const { phone } = useLocalSearchParams<{ phone: string }>();
  const [otp, setOtp] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const complete = otp.length === LENGTH;

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
            <View style={[styles.step, styles.stepDone]} />
            <View style={[styles.step, styles.stepActive]} />
            <View style={styles.step} />
          </View>

          <Text style={styles.title}>أدخل الرمز</Text>
          <Text style={styles.subtitle}>أرسلنا رمزاً إلى</Text>
          <Text style={styles.phone}>{phone || '+966 5X XXX XXXX'}</Text>

          {/* خانات الرمز */}
          <Pressable style={styles.boxes} onPress={() => inputRef.current?.focus()}>
            {Array.from({ length: LENGTH }).map((_, i) => {
              const char = otp[i];
              const active = focused && i === otp.length;
              return (
                <View
                  key={i}
                  style={[styles.box, !!char && styles.boxFilled, active && styles.boxActive]}
                >
                  <Text style={styles.boxText}>{char || ''}</Text>
                </View>
              );
            })}
          </Pressable>

          {/* حقل مخفي يلتقط الإدخال */}
          <TextInput
            ref={inputRef}
            value={otp}
            onChangeText={(t) => setOtp(t.replace(/[^0-9]/g, '').slice(0, LENGTH))}
            keyboardType="number-pad"
            maxLength={LENGTH}
            style={styles.hidden}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            autoFocus
          />

          <GoldButton
            title="تأكيد"
            onPress={() => router.push('/(auth)/profile-setup')}
            disabled={!complete}
            style={styles.cta}
          />

          <Pressable style={styles.resendWrap} onPress={() => {}}>
            <Text style={styles.resend}>
              لم يصلك الرمز؟ <Text style={styles.resendLink}>إعادة الإرسال</Text>
            </Text>
          </Pressable>
        </View>
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
    alignItems: 'center',
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
  stepDone: {
    backgroundColor: 'rgba(212,175,55,0.45)',
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
  },
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    color: COLORS.textDim,
  },
  phone: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.goldLight,
    marginTop: 2,
    writingDirection: 'ltr',
  },

  boxes: {
    flexDirection: 'row',
    gap: SPACING.md,
    marginTop: SPACING.xxl,
    marginBottom: SPACING.xxl,
  },
  box: {
    width: 58,
    height: 68,
    borderRadius: RADIUS.md,
    backgroundColor: COLORS.surfaceSunken,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  boxFilled: {
    borderColor: 'rgba(212,175,55,0.5)',
    backgroundColor: 'rgba(212,175,55,0.06)',
  },
  boxActive: {
    borderColor: COLORS.gold,
  },
  boxText: {
    fontFamily: FONTS.num.black,
    fontSize: 28,
    color: COLORS.goldLight,
    includeFontPadding: false,
  },
  hidden: {
    position: 'absolute',
    opacity: 0,
    height: 1,
    width: 1,
  },

  cta: {
    alignSelf: 'stretch',
  },
  resendWrap: {
    marginTop: SPACING.xl,
  },
  resend: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  resendLink: {
    fontFamily: FONTS.ar.bold,
    color: COLORS.gold,
  },
});
