// ============================================================
// جرب حظك — GameHeader
// ترويسة شاشات اللعب الموحدة: رجوع | عنوان | كتم صوت | معلومات
// ============================================================

import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { BackIcon, MicIcon, MicOffIcon, InfoIcon } from '../icons/GameIcons';
import { COLORS, FONTS, SPACING, TYPE } from '../../constants/theme';

interface GameHeaderProps {
  title: string;
  onBack: () => void;
  /** إظهار أزرار الصوت/المعلومات (الشاشات الجماعية) */
  live?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  onInfo?: () => void;
}

export default function GameHeader({
  title,
  onBack,
  live = false,
  muted = true,
  onToggleMute,
  onInfo,
}: GameHeaderProps) {
  return (
    <View style={styles.header}>
      <Pressable style={styles.iconBtn} onPress={onBack} hitSlop={8}>
        <BackIcon size={20} color={COLORS.text} />
      </Pressable>

      <View style={styles.headerCenter} pointerEvents="none">
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <View style={styles.headerRight}>
        {live && onToggleMute && (
          <Pressable style={styles.iconBtn} onPress={onToggleMute} hitSlop={8}>
            {muted ? (
              <MicOffIcon size={19} color={COLORS.textFaint} />
            ) : (
              <MicIcon size={19} color={COLORS.goldLight} />
            )}
          </Pressable>
        )}
        {onInfo && (
          <Pressable style={styles.iconBtn} onPress={onInfo} hitSlop={8}>
            <InfoIcon size={19} color={COLORS.textDim} />
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm + 2,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  headerCenter: {
    position: 'absolute',
    left: 80,
    right: 80,
    alignItems: 'center',
  },
  headerRight: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    lineHeight: TYPE.h3.lineHeight,
    color: COLORS.text,
    includeFontPadding: false,
  },
});
