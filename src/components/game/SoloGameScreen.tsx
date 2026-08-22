// ============================================================
// جرب حظك — SoloGameScreen
// غلاف شاشات اللعب الفردي: خلفية ليليّة + ترويسة موحدة + توست خطأ
// يقلّص تكرار الشاشات الخمس (كان ~50% نسخًا متطابقًا).
// ============================================================

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import GameHeader from './GameHeader';
import SoloTableBar from './SoloTableBar';
import Screen from '../ui/Screen';
import { COLORS, GRADIENTS, SPACING } from '../../constants/theme';
import type { SoloPlayer } from '../../hooks/useSoloGame';

interface SoloGameScreenProps {
  title: string;
  onBack: () => void;
  /** توست الخطأ المشترك (من useErrorToast) */
  errorNode?: React.ReactNode;
  /** شريط سفلي ثابت (أزرار الرهان/الإجراءات) */
  footer?: React.ReactNode;
  /** المنطقة الوسطى (الطاولة/الأوراق) — مرنة */
  children?: React.ReactNode;
  /** أزرار صوت/معلومات (للشاشات التي تدعمها) */
  live?: boolean;
  muted?: boolean;
  onToggleMute?: () => void;
  onInfo?: () => void;
  /** الجالسون على الطاولة المشتركة (حتى 6) — يظهر الشريط عند تمريرهم */
  players?: SoloPlayer[];
}

export default function SoloGameScreen({
  title,
  onBack,
  errorNode,
  footer,
  children,
  live = false,
  muted,
  onToggleMute,
  onInfo,
  players,
}: SoloGameScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <Screen safeTop={false} style={styles.screen}>
      <LinearGradient
        colors={GRADIENTS.screen}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* ترويسة موحدة داخل المنطقة الآمنة */}
      <View style={{ paddingTop: insets.top }}>
        <GameHeader
          title={title}
          onBack={onBack}
          live={live}
          muted={muted}
          onToggleMute={onToggleMute}
          onInfo={onInfo}
        />
      </View>

      {/* شريط الجالسين على الطاولة المشتركة */}
      {players && (
        <View style={styles.tableBarWrap}>
          <SoloTableBar players={players} isMuted={!!muted} onToggleMute={onToggleMute ?? (() => {})} />
        </View>
      )}

      {/* التوست */}
      {errorNode}

      {/* المحتوى المرن */}
      <View style={styles.body}>{children}</View>

      {/* شريط الإجراءات السفلي داخل المنطقة الآمنة */}
      {footer ? (
        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, SPACING.md) }]}>
          {footer}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: COLORS.bg,
  },
  tableBarWrap: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.xs,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    backgroundColor: 'rgba(10,13,18,0.6)',
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
