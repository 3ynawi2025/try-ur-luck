import { create } from 'zustand';

export interface Profile {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  balance: number;
  status: 'active' | 'muted' | 'banned';
}

interface AuthState {
  session: any | null;
  profile: Profile | null;
  isLoading: boolean;
  setSession: (session: any) => void;
  setProfile: (profile: Profile | null) => void;
  setLoading: (isLoading: boolean) => void;
  signOut: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  session: null,
  profile: null,
  isLoading: true,
  setSession: (session) => set({ session }),
  setProfile: (profile) => set({ profile }),
  setLoading: (isLoading) => set({ isLoading }),
  signOut: () => set({ session: null, profile: null }),
}));
