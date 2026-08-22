// ============================================================
// جرب حظك — Chat Store
// محادثات خاصة بين اللاعب وأصدقائه
//
// ملاحظة: تستخدم بيانات تجريبية (mock) حتى ربط Socket.io/Supabase.
// عند الربط بالإنتاج، استبدل `sendMessage` بإرسال `direct:message`
// عبر السوكيت وتخزين الرسائل في جدول direct_messages.
// ============================================================

import { create } from 'zustand';

export interface ChatMessage {
  id: string;
  /** معرف الطرف الآخر في المحادثة */
  friendId: string;
  text: string;
  /** من أرسل الرسالة */
  from: 'me' | 'friend';
  createdAt: number;
}

interface ChatState {
  conversations: Record<string, ChatMessage[]>;
  sendMessage: (friendId: string, text: string) => void;
  getConversation: (friendId: string) => ChatMessage[];
}

let seq = 1;
const mid = () => `m-${Date.now()}-${seq++}`;

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: {},

  sendMessage: (friendId, text) => {
    const value = text.trim();
    if (!value) return;

    const message: ChatMessage = {
      id: mid(),
      friendId,
      text: value,
      from: 'me',
      createdAt: Date.now(),
    };

    const prev = get().conversations[friendId] ?? [];
    set({
      conversations: {
        ...get().conversations,
        [friendId]: [...prev, message],
      },
    });
  },

  getConversation: (friendId) => get().conversations[friendId] ?? [],
}));