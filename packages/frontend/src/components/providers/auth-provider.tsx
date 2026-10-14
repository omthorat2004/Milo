"use client";

import { useAuthSession } from "@/hooks/use-auth-session";

/**
 * Mounted once at the root so auth state (user/isAuthenticated/isLoading) is
 * ready before PrivateProvider/GuestOnlyProvider need to read it, regardless
 * of which route group the visitor lands on first.
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  useAuthSession();

  return children;
}
