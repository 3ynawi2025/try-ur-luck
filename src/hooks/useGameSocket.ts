// ============================================================
// جرب حظك — Game Socket Hook
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { getAccessToken } from '../lib/supabase';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

interface JoinPayload {
  tableId: string;
  playerId: string;
  name: string;
  password?: string;
}

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  // آخر طاولة طلب اللاعب الانضمام إليها — نعيد إرسالها تلقائياً عند (إعادة) الاتصال
  // حتى لا يُطرد اللاعب بصمت من الطاولة عند أي انقطاع مؤقت للشبكة.
  const pendingJoinRef = useRef<JoinPayload | null>(null);
  const connectedRef = useRef(false);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    // مصافحة موثّقة: الخادم يتحقق من التوكن ويشتق الهوية منه
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
      auth: (cb: (data: object) => void) => {
        getAccessToken().then((token) => cb({ token }));
      },
    });

    socket.on('connect', () => {
      connectedRef.current = true;
      setIsConnected(true);
      // عند الاتصال أو إعادة الاتصال: أعد الانضمام للطاولة المطلوبة إن وُجدت.
      const pending = pendingJoinRef.current;
      if (pending) {
        socket.emit('table:join', pending);
      }
    });
    socket.on('disconnect', () => {
      connectedRef.current = false;
      setIsConnected(false);
    });

    socketRef.current = socket;

    return () => {
      pendingJoinRef.current = null;
      connectedRef.current = false;
      socket.disconnect();
    };
  }, []);

  // ===== Emit =====

  const joinTable = useCallback(
    (tableId: string, playerId: string, name: string, password?: string) => {
      const payload: JoinPayload = password ? { tableId, playerId, name, password } : { tableId, playerId, name };
      pendingJoinRef.current = payload;
      // لو لم نتصل بعد، سيُرسل الطلب تلقائياً عند حدوث connect (انظر أعلاه)
      // حتى لا يتكرر الانضمام مرتين.
      if (connectedRef.current) {
        socketRef.current?.emit('table:join', payload);
      }
    },
    []
  );

  const leaveTable = useCallback(
    (tableId: string, playerId: string) => {
      pendingJoinRef.current = null;
      socketRef.current?.emit('table:leave', { tableId, playerId });
    },
    []
  );

  const performAction = useCallback(
    (
      tableId: string,
      playerId: string,
      action: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'bet',
      amount?: number
    ) => {
      socketRef.current?.emit('game:action', { tableId, playerId, action, amount });
    },
    []
  );

  const sendChat = useCallback(
    (tableId: string, playerId: string, name: string, text: string) => {
      socketRef.current?.emit('chat:message', { tableId, playerId, name, text });
    },
    []
  );

  const reportPlayer = useCallback(
    (reporterId: string, reportedId: string, reason: string) => {
      socketRef.current?.emit('player:report', { reporterId, reportedId, reason });
    },
    []
  );

  // ===== Listen =====

  const on = useCallback(<T,>(event: string, handler: (data: T) => void) => {
    socketRef.current?.on(event, handler);
    return () => {
      socketRef.current?.off(event, handler);
    };
  }, []);

  return {
    isConnected,
    joinTable,
    leaveTable,
    performAction,
    sendChat,
    reportPlayer,
    on,
  };
}