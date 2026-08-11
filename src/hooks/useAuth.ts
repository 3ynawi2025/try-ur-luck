// ============================================================
// جرب حظك — useAuth Hook
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { getProfile, getSession, signIn, signOut, signUp } from '../lib/supabase';

interface User {
  id: string;
  username: string;
  display_name: string;
  balance: number;
  avatar_url: string | null;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const init = async () => {
      try {
        const session = await getSession();
        if (session?.user) {
          const profile = await getProfile(session.user.id);
          if (profile) {
            setUser(profile as User);
            setIsAuthenticated(true);
          }
        }
      } catch (err) {
        console.warn('Session check failed:', err);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await signIn(email, password);
    const profile = await getProfile(result.userId);
    if (profile) {
      setUser(profile as User);
      setIsAuthenticated(true);
    }
  }, []);

  const register = useCallback(async (email: string, password: string, username: string) => {
    await signUp(email, password, username);
  }, []);

  const logout = useCallback(async () => {
    await signOut();
    setUser(null);
    setIsAuthenticated(false);
  }, []);

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    register,
    logout,
    refreshSession: async () => {
      const session = await getSession();
      if (session?.user) {
        const profile = await getProfile(session.user.id);
        if (profile) {
          setUser(profile as User);
          setIsAuthenticated(true);
        }
      }
    },
  };
}
