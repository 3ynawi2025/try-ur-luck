// ============================================================
// جرب حظك — Friends Store
// إدارة الأصدقاء: بحث، طلبات واردة/صادرة، قبول ورفض
//
// البحث يتم عبر خادم اللعبة (/api/users/search) في قاعدة Supabase.
// الأصدقاء والطلبات ما زالت محلية مؤقتاً حتى اكتمال ربطها.
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
  /** من أرسل الطلب */
  fromId: string;
  fromName: string;
  fromUsername: string;
  status: FriendRequestStatus;
  createdAt: number;
}

/** لاعبون يمكن العثور عليهم عبر البحث */
const DIRECTORY: FriendProfile[] = [
  { id: 'u-1', username: 'sultan', displayName: 'سلطان', status: 'in_game' },
  { id: 'u-2', username: 'noura', displayName: 'نورة', status: 'online' },
  { id: 'u-3', username: 'fahad', displayName: 'فهد', status: 'offline' },
  { id: 'u-4', username: 'lama', displayName: 'لمى', status: 'online' },
  { id: 'u-5', username: 'khaled', displayName: 'خالد', status: 'in_game' },
  { id: 'u-6', username: 'reem', displayName: 'ريم', status: 'online' },
  { id: 'u-7', username: 'bader', displayName: 'بدر', status: 'offline' },
  { id: 'u-8', username: 'hend', displayName: 'هند', status: 'in_game' },
  { id: 'u-9', username: 'majed', displayName: 'ماجد', status: 'online' },
  { id: 'u-10', username: 'sarah', displayName: 'سارة', status: 'offline' },
];

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
  outgoing: string[]; // معرفات من أُرسل إليهم طلب
  searchResults: FriendProfile[];
  searchQuery: string;
  searching: boolean;

  search: (query: string) => Promise<void>;
  clearSearch: () => void;
  sendRequest: (userId: string) => void;
  /** إضافة لاعب مباشرة من الطاولة (طلب/قبول فوري) */
  addFriendDirectly: (friend: FriendProfile) => void;
  acceptRequest: (requestId: string) => void;
  declineRequest: (requestId: string) => void;
  removeFriend: (userId: string) => void;

  isFriend: (userId: string) => boolean;
  hasPendingOutgoing: (userId: string) => boolean;
  findById: (userId: string) => FriendProfile | undefined;
}

export const useFriendsStore = create<FriendsState>((set, get) => ({
  friends: [
    { id: 'u-friend-1', username: 'sultan', displayName: 'سلطان', status: 'in_game' },
    { id: 'u-friend-2', username: 'noura', displayName: 'نورة', status: 'online' },
  ],
  incoming: [
    {
      id: 'req-1',
      fromId: 'u-3',
      fromName: 'فهد',
      fromUsername: 'fahad',
      status: 'pending',
      createdAt: Date.now() - 1000 * 60 * 60 * 2,
    },
  ],
  outgoing: [],
  searchResults: [],
  searchQuery: '',
  searching: false,

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
        status: 'offline',
      }));

      set({ searchResults: results, searching: false });
    } catch {
      set({ searchResults: [], searching: false });
    }
  },

  clearSearch: () => set({ searchResults: [], searchQuery: '' }),

  sendRequest: (userId) => {
    const { outgoing, searchResults, friends, incoming } = get();
    if (outgoing.includes(userId) || friends.some((f) => f.id === userId)) return;

    const target = searchResults.find((p) => p.id === userId) || DIRECTORY.find((p) => p.id === userId);
    // إزالة أي طلب وارد سابق من نفس الشخص (طلب متبادل -> يصبح صديقاً مباشرة)
    const backRequest = incoming.find((r) => r.fromId === userId && r.status === 'pending');

    if (backRequest) {
      set({
        friends: [
          ...friends,
          {
            id: userId,
            username: target?.username ?? backRequest.fromUsername,
            displayName: target?.displayName ?? backRequest.fromName,
            status: 'online',
          },
        ],
        incoming: incoming.filter((r) => r.id !== backRequest.id),
      });
      return;
    }

    set({ outgoing: [...outgoing, userId] });
  },

  addFriendDirectly: (friend) => {
    const { friends, outgoing } = get();
    if (friends.some((f) => f.id === friend.id)) return;
    set({
      friends: [...friends, friend],
      outgoing: outgoing.filter((id) => id !== friend.id),
    });
  },

  acceptRequest: (requestId) => {
    const { friends, incoming } = get();
    const req = incoming.find((r) => r.id === requestId);
    if (!req) return;

    set({
      friends: [
        ...friends,
        {
          id: req.fromId,
          username: req.fromUsername,
          displayName: req.fromName,
          status: 'online',
        },
      ],
      incoming: incoming.filter((r) => r.id !== requestId),
    });
  },

  declineRequest: (requestId) => {
    set({ incoming: get().incoming.filter((r) => r.id !== requestId) });
  },

  removeFriend: (userId) => {
    set({ friends: get().friends.filter((f) => f.id !== userId) });
  },

  isFriend: (userId) => get().friends.some((f) => f.id === userId),
  hasPendingOutgoing: (userId) => get().outgoing.includes(userId),
  findById: (userId) =>
    get().friends.find((f) => f.id === userId) ||
    DIRECTORY.find((p) => p.id === userId),
}));