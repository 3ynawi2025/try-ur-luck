// ============================================================
// جرب حظك — Profile Setup
// ============================================================

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
import GoldButton from '../../components/ui/GoldButton';
import GlassCard from '../../components/ui/GlassCard';
import Avatar from '../../components/ui/Avatar';
import Input from '../../components/ui/Input';
import { COLORS, FONTS, FONT_SIZES, SPACING } from '../../constants/theme';

export default function ProfileSetupScreen() {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');

  const handleStart = () => {
    // TODO: save profile to Supabase
    router.replace('/(app)');
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>أنشئ ملفك</Text>

        {/* Avatar */}
        <TouchableOpacity style={styles.avatarContainer}>
          <Avatar
            size={80}
            name={displayName || 'ج'}
          />
          <Text style={styles.addPhoto}>+ أضف صورة</Text>
        </TouchableOpacity>

        {/* Form */}
        <View style={styles.form}>
          <Input
            label="اسم المستخدم *"
            placeholder="@username"
            value={username}
            onChangeText={setUsername}
            autoCapitalize="none"
          />
          <Input
            label="الاسم المعروض"
            placeholder="أدخل اسمك"
            value={displayName}
            onChangeText={setDisplayName}
          />
        </View>

        <GoldButton
          title="ابدأ اللعب"
          onPress={handleStart}
          disabled={!username}
        />
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
    gap: SPACING.lg,
  },
  title: {
    fontFamily: FONTS.arabic.bold,
    fontSize: FONT_SIZES.h1,
    color: COLORS.textPrimary,
    textAlign: 'right',
  },
  avatarContainer: {
    alignItems: 'center',
    gap: SPACING.sm,
  },
  addPhoto: {
    fontFamily: FONTS.arabic.regular,
    fontSize: FONT_SIZES.small,
    color: COLORS.primary,
  },
  form: {
    gap: SPACING.sm,
  },
});
