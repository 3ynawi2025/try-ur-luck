// ============================================================
// جرب حظك — Friends Store
// إدارة الأصدقاء عبر الخادم (قاعدة بيانات حقيقية):
// البحث /api/users/search — الطلبات /api/friends/* — العلاقات friendships
// حالة الاتصال (online/offline) تأتي من تتبع الحضور الحي في السيرفر.
// ============================================================

import { create } from 'zustand';
import { apiFetch } from '../lib/api';
import { PRESENCE_COLORS } from '../constants/theme';

export type FriendStatus = 'online' | 'in_game' | 'offline';
export type FriendRequestStatus = 'pending' | 'accepted' | 'declined';

export interface FriendProfile {
  id: string;
  username: string;
  displayName: string;
  status: FriendStatus;
}

export interface FriendRequest {
  id: string;
  fromId: string;
  fromName: string;
  fromUsername: string;
  status: FriendRequestStatus;
  createdAt: number;
}

const STATUS_LABEL: Record<FriendStatus, string> = {
  online: 'متصل',
  in_game: 'في طاولة',
  offline: 'غير متصل',
};

export const friendStatusLabel = (s: FriendStatus) => STATUS_LABEL[s];
export const friendStatusColor = (s: FriendStatus) => PRESENCE_COLORS[s];

interface FriendsState {
  friends: FriendProfile[];
  incoming: FriendRequest[];
  outgoing: string[]; // أسماء مستخدمين أُرسل إليهم طلب
  searchResults: FriendProfile[];
  searchQuery: string;
  searching: boolean;
  loading: boolean;

  loadFriends: () => Promise<void>;
  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  /** يرمي خطأ برسالة عربية عند الفشل (يعرضها المستخدم) */
  sendRequest: (userId: string, username: string) => Promise<void>;
  acceptRequest: (requestId: string) => Promise<void>;
  declineRequest: (requestId: string) => Promise<void>;
  removeFriend: (userId: string) => Promise<void>;

  isFriend: (userId: string) => boolean;
  hasPendingOutgoing: (userId: string) => boolean;
  findById: (userId: string) => FriendProfile | undefined;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [],
  incoming: [],
  outgoing: [],
  searchResults: [],
  searchQuery: '',
  searching: false,
  loading: false,

  // جلب الأصدقاء + الطلبات الواردة من السيرفر
  loadFriends: async () => {
    set({ loading: true });
    try {
      const [friends, requests] = await Promise.all([
        apiFetch<any[]>('/api/friends'),
        apiFetch<any[]>('/api/friends/requests'),
      ]);
      set({
        friends: (friends ?? []).map((f: any) => ({
          id: String(f.id ?? ''),
          username: f.username ?? '',
          displayName: f.displayName ?? f.username ?? '',
          status: (f.online ? 'online' : 'offline') as FriendStatus,
        })),
        incoming: (requests ?? []).map((r: any) => ({
          id: String(r.id ?? ''),
          fromId: '',
          fromName: r.displayName ?? r.username ?? '',
          fromUsername: r.username ?? '',
          status: 'pending' as FriendRequestStatus,
          createdAt: Date.now(),
        })),
        loading: false,
      });
    } catch {
      set({ loading: false });
    }
  },

  search: async (query) => {
    const q = query.trim();
    if (!q) {
      set({ searchResults: [], searchQuery: query, searching: false });
      return;
    }

    set({ searching: true, searchQuery: query });
    try {
      // مصادقة بالتوكن — لا معرّف مستخدم من العميل
      const data = await apiFetch<any[]>(`/api/users/search?q=${encodeURIComponent(q)}`);

      const results: FriendProfile[] = (data ?? []).map((u: any) => ({
        id: u.id,
        username: u.username,
        displayName: u.display_name ?? u.username,
        status: (u.online ? 'online' : 'offline') as FriendStatus,
      }));

      set({ searchResults: results, searching: false });
    } catch {
      set({ searchResults: [], searching: false });
    }
  },

  clearSearch: () => set({ searchResults: [], searchQuery: '' }),

  sendRequest: async (userId, username) => {
    const { outgoing, friends } = get();
    if (outgoing.includes(userId) || friends.some((f) => f.id === userId)) return;
    // يرمي عند الفشل — الرسالة تظهر للمستخدم
    await apiFetch('/api/friends/request', {
      method: 'POST',
      body: JSON.stringify({ user_id: userId, username }),
    });
    set({ outgoing: [...get().outgoing, userId] });
  },

  acceptRequest: async (requestId) => {
    await apiFetch('/api/friends/accept', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId }),
    });
    set({ incoming: get().incoming.filter((r) => r.id !== requestId) });
    await get().loadFriends();
  },

  declineRequest: async (requestId) => {
    await apiFetch('/api/friends/reject', {
      method: 'POST',
      body: JSON.stringify({ request_id: requestId }),
    });
    set({ incoming: get().incoming.filter((r) => r.id !== requestId) });
  },

  removeFriend: async (userId) => {
    await apiFetch('/api/friends/remove', {
      method: 'POST',
      body: JSON.stringify({ friend_id: userId }),
    });
    set({ friends: get().friends.filter((f) => f.id !== userId) });
  },

  isFriend: (userId) => get().friends.some((f) => f.id === userId),
  hasPendingOutgoing: (userId) => get().outgoing.includes(userId),
  findById: (userId) => get().friends.find((f) => f.id === userId),
}));
