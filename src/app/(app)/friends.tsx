// ============================================================
// جرب حظك — الأصدقاء
// بحث عن لاعب + طلبات صداقة واردة + قائمة الأصدقاء
// ============================================================

import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Modal,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import Screen from '../../components/ui/Screen';
import GlassCard from '../../components/ui/GlassCard';
import Input from '../../components/ui/Input';
import Avatar from '../../components/ui/Avatar';
import { Badge } from '../../components/ui/Bits';
import {
  SearchIcon,
  UserPlusIcon,
  UserCheckIcon,
  UserXIcon,
  MessageIcon,
  SendIcon,
  CloseIcon,
} from '../../components/icons/GameIcons';
import {
  COLORS,
  FONTS,
  TYPE,
  SPACING,
  RADIUS,
  SIZES,
} from '../../constants/theme';
import {
  useFriendsStore,
  friendStatusLabel,
  friendStatusColor,
  FriendProfile,
} from '../../stores/friendsStore';
import { useChatStore } from '../../stores/chatStore';

type Tab = 'search' | 'requests' | 'friends';

const TABS: { key: Tab; label: string }[] = [
  { key: 'search', label: 'بحث' },
  { key: 'requests', label: 'الطلبات' },
  { key: 'friends', label: 'أصدقائي' },
];

function TabPill({
  label,
  count,
  active,
  onPress,
}: {
  label: string;
  count?: number;
  active: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={[styles.tab, active && styles.tabActive]}>
      <Text style={[styles.tabText, active && styles.tabTextActive]}>{label}</Text>
      {!!count && count > 0 && (
        <View style={[styles.tabCount, active && styles.tabCountActive]}>
          <Text style={[styles.tabCountText, active && styles.tabCountTextActive]}>{count}</Text>
        </View>
      )}
    </Pressable>
  );
}

/** صف لاعب مع زر إضافة/حالة */
function PlayerRow({
  player,
  trailing,
}: {
  player: FriendProfile;
  trailing: React.ReactNode;
}) {
  return (
    <View style={styles.playerRow}>
      <View style={styles.playerWho}>
        <Avatar name={player.displayName} size={42} showBorder />
        <View style={styles.playerMeta}>
          <Text style={styles.playerName}>{player.displayName}</Text>
          <Text style={styles.playerUsername}>@{player.username}</Text>
        </View>
        <View style={styles.statusDotWrap}>
          <View style={[styles.statusDot, { backgroundColor: friendStatusColor(player.status) }]} />
          <Text style={[styles.statusText, { color: friendStatusColor(player.status) }]}>
            {friendStatusLabel(player.status)}
          </Text>
        </View>
      </View>
      {trailing}
    </View>
  );
}

function FriendActionButton({
  onPress,
  children,
  active,
  danger,
}: {
  onPress: () => void;
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.actionBtn,
        active && styles.actionBtnActive,
        danger && styles.actionBtnDanger,
      ]}
    >
      {children}
    </Pressable>
  );
}

// ------------------------------------------------------------
// نافذة محادثة خاصة
// ------------------------------------------------------------
function ChatModal({ friend, onClose }: { friend: FriendProfile; onClose: () => void }) {
  const [draft, setDraft] = useState('');
  const conversation = useChatStore((s) => s.conversations[friend.id] ?? []);
  const sendMessage = useChatStore((s) => s.sendMessage);
  const scrollRef = useRef<ScrollView>(null);

  const send = () => {
    if (!draft.trim()) return;
    sendMessage(friend.id, draft);
    setDraft('');
  };

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.chatOverlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View style={styles.chatSheet}>
          {/* رأس المحادثة */}
          <View style={styles.chatHeader}>
            <View style={styles.chatHeaderWho}>
              <Avatar name={friend.displayName} size={38} showBorder />
              <View style={styles.chatHeaderMeta}>
                <Text style={styles.chatHeaderName}>{friend.displayName}</Text>
                <Text style={[styles.chatHeaderStatus, { color: friendStatusColor(friend.status) }]}>
                  {friendStatusLabel(friend.status)}
                </Text>
              </View>
            </View>
            <Pressable style={styles.chatClose} onPress={onClose} hitSlop={8}>
              <CloseIcon size={18} color={COLORS.textDim} />
            </Pressable>
          </View>

          {/* الرسائل */}
          <ScrollView
            ref={scrollRef}
            style={styles.chatMessages}
            contentContainerStyle={styles.chatMessagesContent}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            showsVerticalScrollIndicator={false}
          >
            {conversation.length === 0 && (
              <Text style={styles.chatEmpty}>ابدأ المحادثة مع {friend.displayName}</Text>
            )}
            {conversation.map((m) => (
              <View
                key={m.id}
                style={[styles.msgRow, m.from === 'me' ? styles.msgRowMe : styles.msgRowFriend]}
              >
                <View
                  style={[
                    styles.msgBubble,
                    m.from === 'me' ? styles.msgBubbleMe : styles.msgBubbleFriend,
                  ]}
                >
                  <Text style={styles.msgText}>{m.text}</Text>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* حقل الإرسال */}
          <View style={styles.chatInputBar}>
            <TextInput
              style={styles.chatInput}
              placeholder="اكتب رسالة…"
              placeholderTextColor={COLORS.textFaint}
              selectionColor={COLORS.gold}
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
            />
            <Pressable style={styles.chatSend} onPress={send} hitSlop={6}>
              <SendIcon size={18} color={COLORS.onGold} />
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

export default function FriendsScreen() {
  const [tab, setTab] = useState<Tab>('search');
  const [query, setQuery] = useState('');
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const showError = (m: string) => {
    setErrMsg(m);
    setTimeout(() => setErrMsg(null), 3500);
  };
  const [activeChat, setActiveChat] = useState<FriendProfile | null>(null);

  const {
    friends,
    incoming,
    searchResults,
    search,
    sendRequest,
    acceptRequest,
    declineRequest,
    removeFriend,
    hasPendingOutgoing,
    searching,
    loadFriends,
  } = useFriendsStore();

  // جلب الأصدقاء والطلبات الحقيقية عند فتح الشاشة
  useEffect(() => {
    loadFriends();
  }, [loadFriends]);

  const handleSearch = (text: string) => {
    setQuery(text);
    search(text);
  };

  const pendingRequests = incoming.filter((r) => r.status === 'pending');

  return (
    <Screen>
      {/* ===== تنبيه خطأ مؤقت ===== */}
      {!!errMsg && (
        <View style={styles.errToast} pointerEvents="none">
          <Text style={styles.errToastText}>{errMsg}</Text>
        </View>
      )}

      {/* ===== العنوان ===== */}
      <View style={styles.header}>
        <Text style={styles.title}>الأصدقاء</Text>
        <Text style={styles.subtitle}>أضف من قابلتهم على الطاولة أو ابحث عنهم</Text>
      </View>

      {/* ===== التبويبات ===== */}
      <View style={styles.tabBar}>
        {TABS.map((t) => (
          <TabPill
            key={t.key}
            label={t.label}
            count={t.key === 'requests' ? pendingRequests.length : undefined}
            active={tab === t.key}
            onPress={() => setTab(t.key)}
          />
        ))}
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* ===== البحث ===== */}
        {tab === 'search' && (
          <View style={styles.pane}>
            <Input
              placeholder="ابحث بالاسم أو اسم المستخدم"
              value={query}
              onChangeText={handleSearch}
              autoCapitalize="none"
            />

            {query.trim().length === 0 && (
              <GlassCard style={styles.emptyCard}>
                <SearchIcon size={26} color={COLORS.textFaint} />
                <Text style={styles.emptyTitle}>ابحث عن صديق</Text>
                <Text style={styles.emptyText}>
                  اكتب اسم اللاعب أو اسم المستخدم لإرسال طلب صداقة
                </Text>
              </GlassCard>
            )}

            {query.trim().length > 0 && searching && (
              <GlassCard style={styles.emptyCard}>
                <ActivityIndicator color={COLORS.gold} />
                <Text style={styles.emptyText}>جارٍ البحث…</Text>
              </GlassCard>
            )}

            {query.trim().length > 0 && !searching && searchResults.length === 0 && (
              <GlassCard style={styles.emptyCard}>
                <SearchIcon size={26} color={COLORS.textFaint} />
                <Text style={styles.emptyTitle}>لا نتائج</Text>
                <Text style={styles.emptyText}>لم نعثر على لاعب بهذا الاسم أو اسم المستخدم</Text>
              </GlassCard>
            )}

            {searchResults.length > 0 && (
              <View style={styles.list}>
                {searchResults.map((p) => {
                  const isFriend = friends.some((f) => f.id === p.id);
                  const pending = hasPendingOutgoing(p.id);
                  return (
                    <GlassCard key={p.id} padding={SPACING.md}>
                      <PlayerRow
                        player={p}
                        trailing={
                          isFriend ? (
                            <Badge label="صديق" tone="success" />
                          ) : pending ? (
                            <Badge label="بانتظار الموافقة" tone="neutral" />
                          ) : (
                            <FriendActionButton active onPress={() => sendRequest(p.id, p.username).catch((e) => showError((e as Error).message || 'تعذر الإرسال'))}>
                              <UserPlusIcon size={16} color={COLORS.onGold} />
                              <Text style={styles.addText}>إضافة</Text>
                            </FriendActionButton>
                          )
                        }
                      />
                    </GlassCard>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {/* ===== الطلبات ===== */}
        {tab === 'requests' && (
          <View style={styles.pane}>
            {pendingRequests.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <UserCheckIcon size={26} color={COLORS.textFaint} />
                <Text style={styles.emptyTitle}>لا طلبات</Text>
                <Text style={styles.emptyText}>ليس لديك طلبات صداقة واردة</Text>
              </GlassCard>
            ) : (
              <View style={styles.list}>
                {pendingRequests.map((req) => (
                  <GlassCard key={req.id} padding={SPACING.md}>
                    <View style={styles.requestTop}>
                      <View style={styles.playerWho}>
                        <Avatar name={req.fromName} size={42} showBorder />
                        <View style={styles.playerMeta}>
                          <Text style={styles.playerName}>{req.fromName}</Text>
                          <Text style={styles.playerUsername}>@{req.fromUsername}</Text>
                        </View>
                      </View>
                      <Text style={styles.requestTime}>أرسل طلب صداقة</Text>
                    </View>

                    <View style={styles.requestActions}>
                      <FriendActionButton active onPress={() => acceptRequest(req.id)}>
                        <UserCheckIcon size={16} color={COLORS.onGold} />
                        <Text style={styles.addText}>قبول</Text>
                      </FriendActionButton>
                      <FriendActionButton danger onPress={() => declineRequest(req.id)}>
                        <UserXIcon size={16} color={COLORS.crimson} />
                        <Text style={styles.declineText}>رفض</Text>
                      </FriendActionButton>
                    </View>
                  </GlassCard>
                ))}
              </View>
            )}
          </View>
        )}

        {/* ===== الأصدقاء ===== */}
        {tab === 'friends' && (
          <View style={styles.pane}>
            {friends.length === 0 ? (
              <GlassCard style={styles.emptyCard}>
                <UserPlusIcon size={26} color={COLORS.textFaint} />
                <Text style={styles.emptyTitle}>لا أصدقاء بعد</Text>
                <Text style={styles.emptyText}>أضف لاعبين من الطاولة أو عبر البحث</Text>
              </GlassCard>
            ) : (
              <View style={styles.list}>
                {friends.map((f) => (
                  <GlassCard key={f.id} padding={SPACING.md}>
                    <PlayerRow
                      player={f}
                      trailing={
                        <View style={styles.friendActions}>
                          <FriendActionButton onPress={() => setActiveChat(f)}>
                            <MessageIcon size={16} color={COLORS.goldLight} />
                            <Text style={styles.chatText}>مراسلة</Text>
                          </FriendActionButton>
                          <FriendActionButton danger onPress={() => removeFriend(f.id)}>
                            <UserXIcon size={16} color={COLORS.textFaint} />
                          </FriendActionButton>
                        </View>
                      }
                    />
                  </GlassCard>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      {/* ===== نافذة المحادثة ===== */}
      {!!activeChat && (
        <ChatModal friend={activeChat} onClose={() => setActiveChat(null)} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  errToast: {
    position: 'absolute',
    top: 90,
    left: SPACING.lg,
    right: SPACING.lg,
    zIndex: 50,
    alignItems: 'center',
  },
  errToastText: {
    backgroundColor: 'rgba(122,31,43,0.95)',
    borderWidth: 1,
    borderColor: COLORS.crimson,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    color: '#FFDAD6',
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.small.fontSize,
    textAlign: 'center',
    overflow: 'hidden',
  },
  header: {
    paddingHorizontal: SIZES.screenPadding,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
    alignItems: 'flex-end',
  },
  title: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.display.fontSize,
    lineHeight: TYPE.display.lineHeight,
    color: COLORS.text,
  },
  subtitle: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
    marginTop: -4,
  },

  tabBar: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.045)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  tabActive: {
    backgroundColor: 'rgba(201,169,97,0.16)',
    borderColor: COLORS.gold,
  },
  tabText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textDim,
  },
  tabTextActive: {
    color: COLORS.goldLight,
  },
  tabCount: {
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 5,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,180,171,0.22)',
  },
  tabCountActive: {
    backgroundColor: COLORS.gold,
  },
  tabCountText: {
    fontFamily: FONTS.num.bold,
    fontSize: TYPE.caption.fontSize,
    color: '#ffdad6',
    includeFontPadding: false,
  },
  tabCountTextActive: {
    color: COLORS.onGold,
  },

  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: SIZES.screenPadding,
    paddingBottom: SPACING.xxxl,
  },
  pane: {
    gap: SPACING.md,
  },
  list: {
    gap: SPACING.md,
  },

  emptyCard: {
    alignItems: 'center',
    gap: SPACING.sm,
    paddingVertical: SPACING.xxl,
  },
  emptyTitle: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.h3.fontSize,
    color: COLORS.textDim,
  },
  emptyText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
  },

  playerRow: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  playerWho: {
    flex: 1,
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  playerMeta: {
    alignItems: 'flex-end',
    gap: 1,
  },
  playerName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  playerUsername: {
    fontFamily: FONTS.num.medium,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textDim,
  },
  statusDotWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginRight: SPACING.sm,
  },
  statusDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  statusText: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
  },

  actionBtn: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: SPACING.md,
    paddingVertical: 7,
    borderRadius: RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  actionBtnActive: {
    backgroundColor: 'rgba(201,169,97,0.16)',
    borderColor: COLORS.gold,
  },
  actionBtnDanger: {
    borderColor: 'rgba(255,180,171,0.35)',
    backgroundColor: 'rgba(255,180,171,0.08)',
  },
  addText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
  },
  declineText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: '#ffdad6',
  },


  requestTop: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: SPACING.md,
  },
  requestTime: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.caption.fontSize,
    color: COLORS.textFaint,
  },
  requestActions: {
    flexDirection: 'row-reverse',
    gap: SPACING.sm,
    marginTop: SPACING.md,
    alignSelf: 'flex-start',
  },

  friendActions: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  chatText: {
    fontFamily: FONTS.ar.semibold,
    fontSize: TYPE.small.fontSize,
    color: COLORS.goldLight,
  },

  // ===== نافذة المحادثة =====
  chatOverlay: {
    flex: 1,
    backgroundColor: 'rgba(10,13,18,0.72)',
    justifyContent: 'flex-end',
  },
  chatSheet: {
    height: '78%',
    backgroundColor: COLORS.bgSoft,
    borderTopLeftRadius: RADIUS.xl,
    borderTopRightRadius: RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.borderStrong,
    overflow: 'hidden',
  },
  chatHeader: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  chatHeaderWho: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
  },
  chatHeaderMeta: {
    alignItems: 'flex-end',
    gap: 1,
  },
  chatHeaderName: {
    fontFamily: FONTS.ar.bold,
    fontSize: TYPE.body.fontSize,
    color: COLORS.text,
  },
  chatHeaderStatus: {
    fontFamily: FONTS.ar.medium,
    fontSize: TYPE.caption.fontSize,
  },
  chatClose: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  chatMessages: {
    flex: 1,
  },
  chatMessagesContent: {
    padding: SPACING.lg,
    gap: SPACING.sm,
  },
  chatEmpty: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.small.fontSize,
    color: COLORS.textFaint,
    textAlign: 'center',
    marginTop: SPACING.xxl,
  },
  msgRow: {
    flexDirection: 'row',
  },
  msgRowMe: {
    justifyContent: 'flex-end',
  },
  msgRowFriend: {
    justifyContent: 'flex-start',
  },
  msgBubble: {
    maxWidth: '78%',
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: RADIUS.md,
  },
  msgBubbleMe: {
    backgroundColor: 'rgba(201,169,97,0.18)',
    borderWidth: 1,
    borderColor: 'rgba(201,169,97,0.35)',
  },
  msgBubbleFriend: {
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  msgText: {
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    lineHeight: TYPE.body.lineHeight,
    color: COLORS.text,
  },
  chatInputBar: {
    flexDirection: 'row-reverse',
    alignItems: 'center',
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
  },
  chatInput: {
    flex: 1,
    height: 46,
    backgroundColor: COLORS.surfaceSunken,
    borderRadius: RADIUS.full,
    paddingHorizontal: SPACING.lg,
    color: COLORS.text,
    fontFamily: FONTS.ar.regular,
    fontSize: TYPE.body.fontSize,
    textAlign: 'right',
  },
  chatSend: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: COLORS.gold,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
