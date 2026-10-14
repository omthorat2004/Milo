"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/auth-store";

function AuthGate({ fullScreen = false }: { fullScreen?: boolean }) {
  return (
    <div
      className={cn("flex items-center justify-center", fullScreen ? "min-h-dvh" : "min-h-72")}
      role="status"
      aria-live="polite"
    >
      <Loader2 className="size-6 animate-spin text-foreground-muted" aria-hidden="true" />
      <span className="sr-only">Checking your session…</span>
    </div>
  );
}

/**
 * Wraps the (app) route group. Redirects to /login once AuthProvider's
 * initial check resolves and there's no session — never renders the
 * protected children for a signed-out visitor, not even for a frame.
 */
export function PrivateProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) router.replace("/login");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || !isAuthenticated) return <AuthGate fullScreen />;

  return children;
}

/**
 * Wraps the (auth) route group's form slot. Redirects an already-signed-in
 * visitor to /dashboard instead of letting them see login/register again.
 */
export function GuestOnlyProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const isLoading = useAuthStore((state) => state.isLoading);

  useEffect(() => {
    if (!isLoading && isAuthenticated) router.replace("/dashboard");
  }, [isLoading, isAuthenticated, router]);

  if (isLoading || isAuthenticated) return <AuthGate />;

  return children;
}
