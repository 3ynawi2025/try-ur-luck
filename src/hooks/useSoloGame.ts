// ============================================================
// جرب حظك — Solo Game Socket Hook (Blackjack/3-card/Russian)
// يربط ألعاب اللاعب الفردي بالسيرفر (Server-authoritative).
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../stores/authStore';
import { getAccessToken } from '../lib/supabase';
import { useAgoraVoice } from './useAgoraVoice';
import { AGORA_APP_ID as FALLBACK_AGORA_APP_ID } from '../lib/config';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export type SoloGameKind = 'blackjack' | 'three-card' | 'russian' | 'roulette';

export interface SoloPlayer {
  id: string;
  name: string;
}

export interface RouletteRoomState {
  phase: 'betting' | 'spinning' | 'result';
  endsAt: number;
  winningNumber: number | null;
}

export interface RouletteOtherBets {
  name: string;
  bets: { id: string; type: string; numbers: number[]; amount: number }[];
}

export interface RouletteWinners {
  number: number;
  winners: { name: string; netWin: number }[];
}

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
  const [players, setPlayers] = useState<SoloPlayer[]>([]);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  // الروليت المشترك: دورة موقّتة + رهانات الآخرين + النتائج
  const [rouletteRoom, setRouletteRoom] = useState<RouletteRoomState | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [othersBets, setOthersBets] = useState<RouletteOtherBets[]>([]);
  const [winners, setWinners] = useState<RouletteWinners | null>(null);
  // عداد بدء البلاك جاك (30 ثانية) + إعادة الرهان التلقائي للروليت
  const [soloCountdown, setSoloCountdown] = useState<number | null>(null);
  const [autoRebet, setAutoRebet] = useState(false);

  // الدردشة الصوتية — نفس قناة طاولة اللعبة
  const { isMuted, toggleMute, joinChannel, joinError, leaveChannel } = useAgoraVoice();

  // إظهار أخطاء الصوت للمستخدم بدل الفشل الصامت
  useEffect(() => {
    if (joinError) onErrorRef.current?.(joinError);
  }, [joinError]);

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
    socket.on('solo:seat', (d: any) => {
      if (typeof d?.playerId === 'string') setMyPlayerId(d.playerId);
    });
    socket.on('error', (d: any) => onErrorRef.current?.(d?.message ?? 'حدث خطأ'));
    socket.on('solo:players', (d: any) => {
      if (Array.isArray(d?.players)) setPlayers(d.players);
    });
    // توكن الصوت: انضم لقناة طاولة اللعبة
    socket.on('voice:token', (d: any) => {
      if (d?.channelName) {
        joinChannel(d.appId || FALLBACK_AGORA_APP_ID, d.channelName, d.token ?? '');
      }
    });
    // الروليت المشترك
    socket.on('roulette:room', (d: any) => setRouletteRoom({ phase: d?.phase, endsAt: d?.endsAt ?? 0, winningNumber: d?.winningNumber ?? null }));
    socket.on('roulette:countdown', (d: any) => setCountdown(typeof d?.seconds === 'number' ? d.seconds : null));
    socket.on('roulette:bets', (d: any) => setOthersBets(Array.isArray(d?.players) ? d.players : []));
    socket.on('roulette:winners', (d: any) => setWinners(d ?? null));
    socket.on('roulette:auto', (d: any) => {
      setAutoRebet(Boolean(d?.enabled));
      if (d?.reason) onErrorRef.current?.(d.reason);
    });
    // عداد بدء البلاك جاك
    socket.on('solo:countdown', (d: any) => {
      setSoloCountdown(typeof d?.seconds === 'number' ? d.seconds : null);
    });
    socket.on('solo:notice', (d: any) => {
      if (typeof d?.text === 'string') onErrorRef.current?.(d.text);
    });

    socketRef.current = socket;
    return () => {
      pendingJoinRef.current = null;
      connectedRef.current = false;
      socket.disconnect();
      // إغلاق قناة الصوت عند الخروج من اللعبة (لا يبقى المايك مفتوحًا في اللوبي)
      leaveChannel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return {
    isConnected,
    snapshot,
    sendAction,
    players,
    isMuted,
    toggleMute,
    myPlayerId,
    rouletteRoom,
    countdown,
    othersBets,
    winners,
    soloCountdown,
    autoRebet,
  };
}