// ============================================================
// جرب حظك — المجالس الصوتية
// غرف عامة + خاصة برمز 6 أرقام — صوت مباشر عبر Agora.
// ============================================================

import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  Switch,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import GoldButton from '../../components/ui/GoldButton';
import { Badge } from '../../components/ui/Bits';
import { CloseIcon, LockIcon, PlusIcon, MajlisIcon } from '../../components/icons/GameIcons';
import { apiFetch } from '../../lib/api';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
} from '../../constants/theme';

interface MajlisRoom {
  id: string;
  name: string;
  is_private: boolean;
  code?: string | null;
  owner_id: string;
  majlis_members?: { count: number }[];
}

export default function MajlisScreen() {
  const [rooms, setRooms] = useState<MajlisRoom[]>([]);
  const [createOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [codeDraft, setCodeDraft] = useState('');
  const [created, setCreated] = useState<MajlisRoom | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const data = await apiFetch<MajlisRoom[]>('/api/majlis');
      setRooms(Array.isArray(data) ? data : []);
    } catch {
      /* ضيف */
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const joinRoom = async (room: MajlisRoom) => {
    router.push(`/(app)/majlis/${room.id}`);
  };

  const joinByCode = async () => {
    if (!/^\d{6}$/.test(codeDraft) || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const room = await apiFetch<MajlisRoom>(`/api/majlis?code=${codeDraft}`);
      if (room?.id) {
        setCodeDraft('');
        router.push(`/(app)/majlis/${room.id}`);
      }
    } catch {
      setErr('لا يوجد مجلس بهذا الرمز');
    } finally {
      setBusy(false);
    }
  };

  const createRoom = async () => {
    const clean = name.trim().slice(0, 40);
    if (!clean || busy) return;
    setBusy(true);
    setErr(null);
    try {
      const room = await apiFetch<MajlisRoom>('/api/majlis', {
        method: 'POST',
        body: JSON.stringify({ name: clean, is_private: isPrivate }),
      });
      setCreated(room);
      setName('');
      setIsPrivate(false);
      load();
    } catch {
      setErr('تعذّر إنشاء المجلس');
    } finally {
      setBusy(false);
    }
  };

  const membersCount = (r: MajlisRoom) => r.majlis_members?.[0]?.count ?? 0;

  return (
    <Screen>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.content}
      >
        {/* ===== الترويسة ===== */}
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>VOICE MAJLIS</Text>
            <Text style={styles.title}>المجالس</Text>
            <Text style={styles.subtitle}>غرف صوتية — سوالف وورق مع أصدقائك</Text>
          </View>
          <MajlisIcon size={34} color={COLORS.goldLight} />
        </View>

        {/* ===== إنشاء + دخول برمز ===== */}
        <GlassCard padding={SPACING.xl}>
          <View style={styles.actionsRow}>
            <GoldButton title="أنشئ مجلسًا" icon={<PlusIcon size={17} color={COLORS.onGold} />} onPress={() => setCreateOpen(true)} />
          </View>
          <View style={styles.codeRow}>
            <TextInput
              style={styles.codeInput}
              placeholder="رمز المجلس — 6 أرقام"
              placeholderTextColor={COLORS.textFaint}
              keyboardType="number-pad"
              maxLength={6}
              value={codeDraft}
              onChangeText={setCodeDraft}
            />
            <GoldButton title="دخول" size="sm" variant="outline" onPress={joinByCode} disabled={busy} />
          </View>
          {!!err && <Text style={styles.errText}>{err}</Text>}
        </GlassCard>

        {/* ===== المجالس العامة ===== */}
        <Text style={styles.sectionTitle}>المجالس المفتوحة</Text>
        {rooms.length === 0 ? (
          <GlassCard padding={SPACING.xl}>
            <Text style={styles.emptyText}>لا مجالس مفتوحة الآن — أنشئ أول مجلس!</Text>
          </GlassCard>
        ) : (
          rooms.map((r) => (
            <Pressable key={r.id} onPress={() => joinRoom(r)}>
              <GlassCard padding={SPACING.lg} style={styles.roomCard}>
                <View style={styles.roomTop}>
                  <View style={styles.roomTitleCol}>
                    <Text style={styles.roomName}>{r.name}</Text>
                    <Text style={styles.roomMeta}>
                      {r.is_private ? 'مجلس خاص' : 'مجلس عام'} · {membersCount(r)} حاضر
                    </Text>
                  </View>
                  <Badge label="انضم" tone="gold" />
                </View>
                {r.is_private && !!r.code && (
                  <View style={styles.codePill}>
                    <LockIcon size={13} color={COLORS.goldLight} />
                    <Text style={styles.codePillText}>{r.code}</Text>
                  </View>
                )}
              </GlassCard>
            </Pressable>
          ))
        )}
      </ScrollView>

      {/* ===== نافذة إنشاء مجلس ===== */}
      <Modal visible={createOpen} transparent animationType="fade" onRequestClose={() => setCreateOpen(false)}>
        <View style={styles.overlay}>
          <Pressable style={StyleSheet.absoluteFill} onPress={() => setCreateOpen(false)} />
          <View style={styles.modalCard}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>مجلس جديد</Text>
              <Pressable onPress={() => setCreateOpen(false)} hitSlop={8}>
                <CloseIcon size={18} color={COLORS.textDim} />
              </Pressable>
            </View>

            {created ? (
              <>
                <Text style={styles.createdText}>تم إنشاء مجلس «{created.name}»</Text>
                {created.code && (
                  <View style={styles.createdCode}>
                    <Text style={styles.createdCodeLabel}>رمز الدخول — شاركه مع أصدقائك</Text>
                    <Text style={styles.createdCodeValue}>{created.code}</Text>
                  </View>
                )}
                <GoldButton title="ادخل المجلس" onPress={() => { setCreateOpen(false); router.push(`/(app)/majlis/${created.id}`); }} />
              </>
            ) : (
              <>
                <TextInput
                  style={styles.nameInput}
                  placeholder="اسم المجلس (مثال: ديوانية الأصدقاء)"
                  placeholderTextColor={COLORS.textFaint}
                  maxLength={40}
                  value={name}
                  onChangeText={setName}
                />
                <View style={styles.switchRow}>
                  <Text style={styles.switchLabel}>مجلس خاص (برمز دخول)</Text>
                  <Switch
                    value={isPrivate}
                    onValueChange={setIsPrivate}
                    trackColor={{ false: COLORS.surfaceRaised, true: COLORS.goldDeep }}
                    thumbColor={isPrivate ? COLORS.goldLight : COLORS.textFaint}
                  />
                </View>
                <GoldButton title="إنشاء" onPress={createRoom} disabled={busy || !name.trim()} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.xxxl,
    gap: SPACING.lg,
  },
  header: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.micro.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 2.2,
  },
  title: {
    fontFamily: FONTS.ar.black,
    fontSize: TYPE.display.fontSize,
    lineHeight: TYPE.display.lineHeight,
    color: COLORS.text,
  },
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  actionsRow: { gap: SPACING.md },
  codeRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    marginTop: SPACING.lg,
  },
  codeInput: {
    flex: 1,
    height: 44,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: SPACING.lg,
    color: COLORS.text,
    fontFamily: FONTS.num.semibold,
    fontSize: TYPE.body.fontSize,
    backgroundColor: COLORS.surfaceSunken,
    textAlign: 'center',
    letterSpacing: 6,
  },
  errText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.crimson,
    marginTop: SPACING.sm,
    textAlign: 'center',
  },
  sectionTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
  },
  emptyText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    textAlign: 'center',
  },
  roomCard: {
    marginBottom: SPACING.sm,
  },
  roomTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  roomTitleCol: {
    flex: 1,
    alignItems: 'flex-end',
  },
  roomName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  roomMeta: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
    marginTop: 2,
  },
  codePill: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: 3,
    borderRadius: RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  codePillText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 2,
  },

  overlay: {
    flex: 1,
    backgroundColor: 'rgba(4,6,10,0.8)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.lg,
  },
  modalCard: {
    width: '100%',
    maxWidth: 420,
    borderRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    backgroundColor: '#0E131B',
    padding: SPACING.xl,
    gap: SPACING.lg,
  },
  modalHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.text,
  },
  nameInput: {
    height: 54,
    borderRadius: RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    paddingHorizontal: SPACING.lg,
    color: COLORS.text,
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.body.fontSize,
    backgroundColor: COLORS.surfaceSunken,
    textAlign: 'right',
  },
  switchRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  switchLabel: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  createdText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
    textAlign: 'center',
  },
  createdCode: {
    alignItems: 'center',
    gap: SPACING.xs,
    padding: SPACING.lg,
    borderRadius: RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.hairlineGold,
    backgroundColor: 'rgba(201,169,97,0.08)',
  },
  createdCodeLabel: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  createdCodeValue: {
    fontFamily: FONTS.num.black,
    fontSize: TYPE.h1.fontSize,
    color: COLORS.goldLight,
    letterSpacing: 6,
  },
});
