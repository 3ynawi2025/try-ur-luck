// ============================================================
// جرب حظك — Auth Store
// إنشاء حساب باسم مستخدم يختاره اللاعب، عبر خادم اللعبة
// الذي يتحقق من تفرّد الاسم على السيرفر (Supabase) عالمياً.
// ============================================================

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '../lib/config';
import { getSupabase } from '../lib/supabase';
import { apiFetch } from '../lib/api';

export interface PlayerProfile {
  id: string;
  username: string;
  displayName: string;
  email: string | null;
  createdAt: number;
}

interface AuthState {
  profile: PlayerProfile | null;
  isAuthenticated: boolean;
  busy: boolean;
  /** إنشاء حساب حقيقي على السيرفر (يمنع تكرار اسم المستخدم) — ref = اسم الداعي */
  signInWithUsername: (
    username: string,
    displayName: string,
    ref?: string
  ) => Promise<{ inviteBonus?: boolean }>;
  bindEmail: (email: string) => void;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      isAuthenticated: false,
      busy: false,

      signInWithUsername: async (username, displayName, ref) => {
        set({ busy: true });
        try {
          const clean = username.replace(/^@/, '').trim();
          const name = displayName.trim() || clean;

          const res = await fetch(`${API_URL}/api/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              username: clean,
              displayName: name,
              ...(ref ? { ref: String(ref).replace(/^@/, '').trim().toLowerCase() } : {}),
            }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            if (data.error === 'USERNAME_TAKEN') {
              throw new Error('USERNAME_TAKEN');
            }
            throw new Error(data.error || 'REGISTER_FAILED');
          }

          // تخزين الجلسة الحقيقية (access + refresh) — supabase-js يجدّدها تلقائيًا
          if (data.session?.access_token && data.session?.refresh_token) {
            const sb = getSupabase();
            await sb.auth.setSession({
              access_token: data.session.access_token,
              refresh_token: data.session.refresh_token,
            });
          }

          set({
            profile: {
              id: data.userId,
              username: data.username,
              displayName: data.displayName,
              email: null,
              createdAt: Date.now(),
            },
            isAuthenticated: true,
            busy: false,
          });

          return { inviteBonus: Boolean(data.inviteBonus) };
        } catch (e) {
          set({ busy: false });
          throw e;
        }
      },

      // ملاحظة: ربط البريد محلي مؤقت فقط — ربط البريد على السيرفر معلّق حتى يُضاف لاحقًا.
      bindEmail: (email) =>
        set((state) => ({
          profile: state.profile ? { ...state.profile, email: email.trim() } : state.profile,
        })),

      signOut: async () => {
        set({ profile: null, isAuthenticated: false });
        try {
          await getSupabase().auth.signOut();
        } catch {
          /* ignore */
        }
      },

      // حذف الحساب نهائيًا: يُرسل الطلب للسيرفر ثم يمسح الجلسة محليًا
      // (الانتقال إلى شاشة الدخول مسؤولية المُستدعي — profile).
      deleteAccount: async () => {
        await apiFetch('/api/account', { method: 'DELETE' });
        set({ profile: null, isAuthenticated: false });
        try {
          await getSupabase().auth.signOut();
        } catch {
          /* ignore */
        }
      },
    }),
    {
      name: 'jrbhzk-auth',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);