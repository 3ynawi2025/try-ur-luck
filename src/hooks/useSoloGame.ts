// ============================================================
// جرب حظك — Solo Game Socket Hook (Blackjack/3-card/Russian)
// يربط ألعاب اللاعب الفردي بالسيرفر (Server-authoritative).
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { getAccessToken } from '../lib/supabase';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export type SoloGameKind = 'blackjack' | 'three-card' | 'russian' | 'roulette';

interface JoinPayload {
  game: SoloGameKind;
  tableId: string;
  playerId: string;
  name: string;
  userId: string | null;
}

export function useSoloGame(
  game: SoloGameKind,
  tableId: string,
  onError?: (message: string) => void
) {
  const socketRef = useRef<Socket | null>(null);
  const pendingJoinRef = useRef<JoinPayload | null>(null);
  const connectedRef = useRef(false);
  const onErrorRef = useRef(onError);

  const [isConnected, setIsConnected] = useState(false);
  const [snapshot, setSnapshot] = useState<any>(null);

  const profile = useAuthStore((s) => s.profile);
  const userId = profile?.id ?? null;
  const displayName = profile?.displayName ?? 'أنت';

  useEffect(() => {
    onErrorRef.current = onError;
  }, [onError]);

  useEffect(() => {
    // مصافحة موثّقة: التوكن يُرسل مع الاتصال — الخادم يشتق الهوية منه فقط
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb: (data: object) => void) => {
        getAccessToken().then((token) => cb({ token }));
      },
    });

    socket.on('connect', () => {
      connectedRef.current = true;
      setIsConnected(true);
      const pending = pendingJoinRef.current;
      if (pending) socket.emit('solo:join', pending);
    });
    socket.on('disconnect', () => {
      connectedRef.current = false;
      setIsConnected(false);
    });
    socket.on('solo:state', (s: any) => setSnapshot(s));
    socket.on('error', (d: any) => onErrorRef.current?.(d?.message ?? 'حدث خطأ'));

    socketRef.current = socket;
    return () => {
      pendingJoinRef.current = null;
      connectedRef.current = false;
      socket.disconnect();
    };
  }, []);

  // Join/re-join when identity or table changes (and on reconnect above)
  useEffect(() => {
    const payload: JoinPayload = {
      game,
      tableId,
      playerId: userId ?? `guest-${game}`,
      name: displayName,
      userId,
    };
    pendingJoinRef.current = payload;
    if (connectedRef.current) {
      socketRef.current?.emit('solo:join', payload);
    }
  }, [game, tableId, userId, displayName]);

  const sendAction = useCallback(
    (action: string, extra: Record<string, unknown> = {}) => {
      const playerId = userId ?? `guest-${game}`;
      socketRef.current?.emit('solo:action', { playerId, action, ...extra });
    },
    [game, userId]
  );

  return { isConnected, snapshot, sendAction };
}