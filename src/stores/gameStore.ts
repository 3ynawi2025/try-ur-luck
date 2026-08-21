import { create } from 'zustand';

export type GameType = 'texas_holdem' | 'blackjack';

export interface TablePlayer {
  id: string;
  user_id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  seat_number: number;
  balance_at_table: number;
  status: 'active' | 'folded' | 'sitting_out' | 'left';
}

export interface Table {
  id: string;
  game_type: GameType;
  name: string;
  min_buy_in: number;
  small_blind?: number;
  big_blind?: number;
  max_players: number;
  is_private: boolean;
  status: 'waiting' | 'playing' | 'closed';
  players: TablePlayer[];
}

interface GameState {
  currentTable: Table | null;
  isInTable: boolean;
  voiceMuted: boolean;
  setCurrentTable: (table: Table | null) => void;
  toggleVoice: () => void;
  leaveTable: () => void;
}

export const useGameStore = create<GameState>((set) => ({
  currentTable: null,
  isInTable: false,
  voiceMuted: true,
  setCurrentTable: (currentTable) => set({ currentTable, isInTable: !!currentTable }),
  toggleVoice: () => set((state) => ({ voiceMuted: !state.voiceMuted })),
  leaveTable: () => set({ currentTable: null, isInTable: false }),
}));
