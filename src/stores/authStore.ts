// ============================================================
// جرب حظك — Auth Store
// حساب باسم مستخدم + كلمة مرور عبر خادم اللعبة، الذي يتحقق من
// تفرّد الاسم ومن صحة كلمة المرور على السيرفر (Supabase) عالمياً.
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
  /** إنشاء حساب جديد (يمنع تكرار اسم المستخدم) — ref = اسم الداعي */
  register: (
    username: string,
    displayName: string,
    password: string,
    ref?: string
  ) => Promise<{ inviteBonus?: boolean }>;
  /** تسجيل الدخول باسم المستخدم وكلمة المرور (يعمل على أي جهاز) */
  login: (username: string, password: string) => Promise<void>;
  /** تعيين/تغيير كلمة المرور لحساب قائم (للحسابات القديمة بلا كلمة مرور) */
  setPassword: (password: string) => Promise<void>;
  bindEmail: (email: string) => Promise<void>;
  /** طلب رابط استعادة كلمة المرور (يرسل بريدًا إن كان مسجلًا) */
  forgotPassword: (email: string) => Promise<{ ok: boolean }>;
  /** تذكير باسم المستخدم عبر البريد */
  forgotUsername: (email: string) => Promise<{ found: boolean; usernameMasked?: string }>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
}

/** تخزين الجلسة الحقيقية (access + refresh) — supabase-js يجدّدها تلقائيًا */
async function applySession(data: any) {
  if (data?.session?.access_token && data?.session?.refresh_token) {
    const sb = getSupabase();
    await sb.auth.setSession({
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
    });
  }
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      profile: null,
      isAuthenticated: false,
      busy: false,

      register: async (username, displayName, password, ref) => {
        if (password.length < 6) {
          throw new Error('PASSWORD_TOO_SHORT');
        }
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
              password,
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

          await applySession(data);

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

      login: async (username, password) => {
        if (!password) {
          throw new Error('PASSWORD_REQUIRED');
        }
        set({ busy: true });
        try {
          const clean = username.replace(/^@/, '').trim().toLowerCase();

          const res = await fetch(`${API_URL}/api/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username: clean, password }),
          });

          const data = await res.json().catch(() => ({}));

          if (!res.ok) {
            throw new Error(data.error || 'LOGIN_FAILED');
          }

          await applySession(data);

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
        } catch (e) {
          set({ busy: false });
          throw e;
        }
      },

      setPassword: async (password) => {
        if (password.length < 6) {
          throw new Error('PASSWORD_TOO_SHORT');
        }
        await apiFetch('/api/auth/set-password', {
          method: 'POST',
          body: JSON.stringify({ password }),
        });
      },

      // ربط البريد الإلكتروني: يرسل البريد للسيرفر (خلف توكن) ليرسل رابط تأكيد.
      // أخطاء السيرفر تُرمى برموزها الواضحة:
      // EMAIL_INVALID / EMAIL_TAKEN / EMAIL_SERVICE_UNAVAILABLE / BIND_EMAIL_FAILED
      bindEmail: async (email) => {
        await apiFetch('/api/auth/bind-email', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
      },

      // طلب رابط استعادة كلمة المرور — يرمي EMAIL_SERVICE_UNAVAILABLE / EMAIL_INVALID
      forgotPassword: async (email) => {
        await apiFetch('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email }),
        });
        return { ok: true };
      },

      // تذكير باسم المستخدم عبر البريد — يعيد ما إذا وُجد حساب بهذا البريد
      forgotUsername: async (email) => {
        const res = await apiFetch<{ found: boolean; usernameMasked?: string }>(
          '/api/auth/forgot-username',
          {
            method: 'POST',
            body: JSON.stringify({ email }),
          }
        );
        return {
          found: Boolean(res?.found),
          ...(res?.usernameMasked ? { usernameMasked: res.usernameMasked } : {}),
        };
      },

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
