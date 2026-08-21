// ============================================================
// جرب حظك — API Client (REST مع توكن المصادقة)
// كل طلب يُوقّع بـ Authorization: Bearer <JWT> —
// لم نعد نرسل معرّف المستخدم من العميل إطلاقًا.
// ============================================================

import { API_URL } from './config';
import { getAccessToken } from './supabase';

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init.headers ?? {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error((data as { error?: string })?.error ?? `HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}
