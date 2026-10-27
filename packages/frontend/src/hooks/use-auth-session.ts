"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { useEffect } from "react";

import { me, type AuthUser } from "@/lib/auth.api";
import { useAuthStore } from "@/stores/auth-store";

export const sessionQueryKey = ["auth", "session"] as const;

/**
 * Fetches the current session via TanStack Query and mirrors the result into
 * authStore, which is what PrivateProvider/GuestOnlyProvider read. They
 * need a synchronous isAuthenticated/isLoading flag, not a query object.
 * `retry: false` because a 401 here already survived the axios interceptor's
 * own refresh-and-retry (see lib/axios.config.ts); a second layer of retries
 * on top of that would just delay knowing the visitor is logged out.
 */
export function useAuthSession(): UseQueryResult<AuthUser> {
  const setUser = useAuthStore((state) => state.setUser);
  const setLoading = useAuthStore((state) => state.setLoading);
  const setError = useAuthStore((state) => state.setError);
  const clearAuth = useAuthStore((state) => state.clearAuth);

  const query = useQuery({
    queryKey: sessionQueryKey,
    queryFn: me,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setLoading(query.isPending);
  }, [query.isPending, setLoading]);

  useEffect(() => {
    if (query.data) {
      setUser(query.data);
      return;
    }

    if (!query.isError) return;

    // A 401 just means "not logged in," not a real error to surface.
    const isUnauthenticated = isAxiosError(query.error) && query.error.response?.status === 401;
    if (isUnauthenticated) {
      clearAuth();
    } else {
      setError("Could not reach Milo. Check your connection.");
    }
  }, [query.data, query.isError, query.error, setUser, clearAuth, setError]);

  return query;
}
