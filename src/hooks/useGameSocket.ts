// ============================================================
// جرب حظك — Game Socket Hook
// ============================================================

import { useEffect, useRef, useCallback, useState } from 'react';
import { io, Socket } from 'socket.io-client';

const SOCKET_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

export function useGameSocket() {
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });

    socket.on('connect', () => setIsConnected(true));
    socket.on('disconnect', () => setIsConnected(false));

    socketRef.current = socket;

    return () => {
      socket.disconnect();
    };
  }, []);

  // ===== Emit =====

  const joinTable = useCallback(
    (tableId: string, playerId: string, name: string) => {
      socketRef.current?.emit('table:join', { tableId, playerId, name });
    },
    []
  );

  const leaveTable = useCallback(
    (tableId: string, playerId: string) => {
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
    socket: socketRef.current,
    isConnected,
    joinTable,
    leaveTable,
    performAction,
    sendChat,
    reportPlayer,
    on,
  };
}
