// ============================================================
// جرب حظك — Socket.io Game Server
// ============================================================

import { Server, Socket } from 'socket.io';
import { TexasHoldemEngine } from '../game/texasHoldem';
import { GameSnapshot } from '../game/texasHoldem';
import { generateAgoraToken, AGORA_APP_ID } from '../game/agora';

interface TableRoom {
  engine: TexasHoldemEngine;
  players: Map<string, { id: string; name: string }>;
  autoStartTimer?: NodeJS.Timeout;
}

const tables = new Map<string, TableRoom>();

function getOrCreateTable(tableId: string): TableRoom {
  if (!tables.has(tableId)) {
    tables.set(tableId, {
      engine: new TexasHoldemEngine({
        maxPlayers: 6,
        smallBlind: 10,
        bigBlind: 20,
        minBuyIn: 500,
      }),
      players: new Map(),
    });
  }
  return tables.get(tableId)!;
}

export function setupGameHandlers(io: Server) {
  io.on('connection', (socket: Socket) => {
    console.log('🎮 Player connected:', socket.id);

    // ===== Join Table =====
    socket.on('table:join', (data: { tableId: string; playerId: string; name: string }) => {
      const { tableId, playerId, name } = data;

      socket.join(tableId);

      const table = getOrCreateTable(tableId);
      const success = table.engine.addPlayer(playerId, name, 10000);

      if (success) {
        table.players.set(socket.id, { id: playerId, name });

        // Send hole cards only to this player
        const holeCards = table.engine.getHoleCards(playerId);

        // Send snapshot to all
        io.to(tableId).emit('table:state', {
          ...table.engine.snapshot(),
          holeCards: null, // never send to others
        });

        // Send hole cards only to the player
        socket.emit('game:holeCards', { cards: holeCards });

        // Send Agora token for voice chat
        const agoraToken = generateAgoraToken(tableId, playerId);
        socket.emit('voice:token', {
          appId: AGORA_APP_ID,
          channelName: tableId,
          token: agoraToken,
        });

        // Check if we can start
        if (table.engine.canStart() && !table.autoStartTimer) {
          table.autoStartTimer = setTimeout(() => {
            const result = table.engine.startHand();
            if (!('error' in result)) {
              broadcastState(io, tableId, table);
            }
            table.autoStartTimer = undefined;
          }, 5000);
        }
      } else {
        socket.emit('error', { message: 'فشل الانضمام للطاولة' });
      }
    });

    // ===== Leave Table =====
    socket.on('table:leave', (data: { tableId: string; playerId: string }) => {
      const { tableId, playerId } = data;
      const table = tables.get(tableId);
      if (table) {
        table.engine.removePlayer(playerId);
        table.players.delete(socket.id);
        socket.leave(tableId);
        broadcastState(io, tableId, table);
      }
    });

    // ===== Game Action =====
    socket.on(
      'game:action',
      (data: {
        tableId: string;
        playerId: string;
        action: 'fold' | 'check' | 'call' | 'raise' | 'all_in' | 'bet';
        amount?: number;
      }) => {
        const { tableId, playerId, action, amount } = data;
        const table = tables.get(tableId);
        if (!table) return;

        const result = table.engine.performAction(playerId, action, amount);

        if ('error' in result) {
          socket.emit('error', { message: result.error });
          return;
        }

        // Send snapshot to all (no hole cards)
        io.to(tableId).emit('table:state', {
          ...result,
          holeCards: null,
        });

        // Send hole cards to the player whose turn it is
        const snapshot = table.engine.snapshot();
        const currentPlayer = snapshot.players.find((p) => p.isCurrentTurn);
        if (currentPlayer) {
          const holes = table.engine.getHoleCards(currentPlayer.id);
          // Find that player's socket
          for (const [socketId, p] of table.players) {
            if (p.id === currentPlayer.id) {
              const sock = io.sockets.sockets.get(socketId);
              if (sock) sock.emit('game:holeCards', { cards: holes });
              break;
            }
          }
        }

        // If game is over, auto-start next hand after delay
        if (result.phase === 'showdown') {
          setTimeout(() => {
            const startResult = table.engine.startHand();
            if (!('error' in startResult)) {
              broadcastState(io, tableId, table);
            }
          }, 5000);
        }
      }
    );

    // ===== Chat =====
    socket.on(
      'chat:message',
      (data: { tableId: string; playerId: string; name: string; text: string }) => {
        const { tableId } = data;
        io.to(tableId).emit('chat:message', data);
      }
    );

    // ===== Report =====
    socket.on(
      'player:report',
      (data: { reporterId: string; reportedId: string; reason: string }) => {
        console.log('🚨 Report:', data);
        // TODO: save to DB
      }
    );

    // ===== Disconnect =====
    socket.on('disconnect', () => {
      console.log('🎮 Player disconnected:', socket.id);
      // Remove from all tables
      for (const [tableId, table] of tables) {
        const player = table.players.get(socket.id);
        if (player) {
          table.engine.removePlayer(player.id);
          table.players.delete(socket.id);
          broadcastState(io, tableId, table);
        }
      }
    });
  });
}

function broadcastState(io: Server, tableId: string, table: TableRoom) {
  const snapshot = table.engine.snapshot();

  // Send hole cards to each player individually
  for (const [socketId, player] of table.players) {
    const sock = io.sockets.sockets.get(socketId);
    if (sock) {
      const holes = table.engine.getHoleCards(player.id);
      sock.emit('game:holeCards', { cards: holes });
    }
  }

  // Broadcast table state without hole cards
  io.to(tableId).emit('table:state', {
    ...snapshot,
    holeCards: null,
  });
}
