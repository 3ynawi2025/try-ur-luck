// ============================================================
// جرب حظك — نافذة التعليمات (زر تعليمات في كل لعبة)
// تعيد استخدام رموز التصميم الموجودة فقط — لا ألوان جديدة.
// ============================================================

import React from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable, Modal } from 'react-native';
import { COLORS, FONTS, TYPE, SPACING, RADIUS, SHADOWS } from '../../constants/theme';
import { GAME_INSTRUCTIONS, InstructionsGame } from '../../constants/gameInstructions';
import GoldButton from '../ui/GoldButton';

export default function InstructionsModal({
  game,
  visible,
  onClose,
}: {
  game: InstructionsGame;
  visible: boolean;
  onClose: () => void;
}) {
  const content = GAME_INSTRUCTIONS[game];
  if (!content) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          {/* الترويسة */}
          <View style={styles.header}>
            <View style={styles.headerTexts}>
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.tagline}>{content.tagline}</Text>
            </View>
          </View>

          {/* المحتوى */}
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {content.sections.map((s, i) => (
              <View key={`s-${i}`} style={styles.section}>
                <View style={styles.headingRow}>
                  <View style={styles.goldDot} />
                  <Text style={styles.heading}>{s.heading}</Text>
                </View>

                {!!s.lines?.length &&
                  s.lines.map((line, j) => (
                    <Text key={`l-${j}`} style={styles.line}>
                      {line}
                    </Text>
                  ))}

                {!!s.table && (
                  <View style={styles.table}>
                    {s.table.title && <Text style={styles.tableTitle}>{s.table.title}</Text>}
                    {s.table.rows.map(([name, desc], j) => (
                      <View key={`r-${j}`} style={styles.row}>
                        <Text style={styles.rowName}>{name}</Text>
                        <Text style={styles.rowDesc}>{desc}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}
          </ScrollView>

          {/* الإغلاق */}
          <View style={styles.footer}>
            <GoldButton title="فهمت" onPress={onClose} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.72)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: SPACING.lg,
  },
  sheet: {
    width: '100%',
    maxWidth: 480,
    maxHeight: '88%',
    borderRadius: RADIUS.xl,
    backgroundColor: '#0B1410',
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.e3,
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.md,
    alignItems: 'flex-end',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  headerTexts: {
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h2.fontSize,
    lineHeight: TYPE.h2.lineHeight,
    color: COLORS.goldLight,
  },
  tagline: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight,
    color: COLORS.textDim,
    marginTop: 2,
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: SPACING.xl,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.lg,
    gap: SPACING.lg,
  },
  section: {
    gap: SPACING.xs,
  },
  headingRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginBottom: 2,
  },
  goldDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.gold,
  },
  heading: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.text,
  },
  line: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    lineHeight: TYPE.small.lineHeight * 1.35,
    color: COLORS.textDim,
    textAlign: 'right',
  },
  table: {
    marginTop: SPACING.sm,
    borderRadius: RADIUS.md,
    backgroundColor: 'rgba(255,255,255,0.035)',
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xs,
  },
  tableTitle: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
    textAlign: 'right',
    paddingVertical: SPACING.xs,
  },
  row: {
    flexDirection: 'row-reverse',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: SPACING.md,
    paddingVertical: SPACING.xs,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  rowName: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
    flexShrink: 0,
  },
  rowDesc: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'left',
    flexShrink: 1,
  },
  footer: {
    padding: SPACING.lg,
    paddingBottom: SPACING.xl,
  },
});
