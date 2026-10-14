import { create } from "zustand";

import type { AuthUser } from "@/lib/auth.api";

type AuthState = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  setUser: (user: AuthUser) => void;
  setLoading: (isLoading: boolean) => void;
  setError: (error: string | null) => void;
  clearAuth: () => void;
};

/**
 * Pure client state — who's logged in, and whether the initial session check
 * is still in flight. The check itself (fetching /auth/me and keeping it
 * fresh) lives in useAuthSession (hooks/use-auth-session.ts), which calls
 * these setters from a TanStack Query result.
 */
export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  error: null,

  setUser(user) {
    set({ user, isAuthenticated: true, isLoading: false, error: null });
  },

  setLoading(isLoading) {
    set({ isLoading });
  },

  setError(error) {
    set({ user: null, isAuthenticated: false, isLoading: false, error });
  },

  clearAuth() {
    set({ user: null, isAuthenticated: false, isLoading: false, error: null });
  },
}));
