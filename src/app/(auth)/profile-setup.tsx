// ============================================================
// جرب حظك — إنشاء الملف الشخصي
// ============================================================

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import Screen from '../../components/ui/Screen';
import GoldButton from '../../components/ui/GoldButton';
import Avatar from '../../components/ui/Avatar';
import Input from '../../components/ui/Input';
import { BackIcon, PlusIcon } from '../../components/icons/GameIcons';
import { COLORS, FONTS, TYPE, SPACING, SIZES, RADIUS } from '../../constants/theme';

export default function ProfileSetupScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const clean = username.replace(/^@/, '');
  const valid = clean.length >= 3;

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

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.stepRow}>
            <View style={[styles.step, styles.stepDone]} />
            <View style={[styles.step, styles.stepDone]} />
            <View style={[styles.step, styles.stepActive]} />
          </View>

          <Text style={styles.title}>أنشئ ملفك</Text>
          <Text style={styles.subtitle}>هذا ما سيراه بقية اللاعبين على الطاولة</Text>

          {/* الصورة */}
          <Pressable style={styles.avatarWrap}>
            <Avatar name={displayName || 'ج'} size={SIZES.avatarXl} showBorder />
            <View style={styles.addBadge}>
              <PlusIcon size={16} color={COLORS.onGold} />
            </View>
          </Pressable>
          <Text style={styles.addPhoto}>أضف صورة</Text>

          {/* النموذج */}
          <View style={styles.form}>
            <Input
              label="اسم المستخدم"
              prefix="@"
              placeholder="username"
              value={clean}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              maxLength={20}
              error={
                username.length > 0 && !valid ? 'ثلاثة أحرف على الأقل' : undefined
              }
            />
            <Input
              label="الاسم المعروض"
              placeholder="أدخل اسمك"
              value={displayName}
              onChangeText={setDisplayName}
              maxLength={24}
            />
          </View>

          <GoldButton
            title="ابدأ اللعب"
            onPress={() => router.replace('/(app)')}
            disabled={!valid}
          />
        </ScrollView>
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
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: SIZES.screenPadding,
    paddingVertical: SPACING.xl,
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
    textAlign: 'right',
  },
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    color: COLORS.textDim,
    textAlign: 'right',
    marginTop: SPACING.xs,
  },

  avatarWrap: {
    alignSelf: 'center',
    marginTop: SPACING.xxl,
  },
  addBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.bg,
  },
  addPhoto: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.gold,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },
  form: {
    marginTop: SPACING.xxl,
  },
});
