"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { sessionQueryKey } from "@/hooks/use-auth-session";
import {
  login,
  register,
  startVerification,
  verificationStatus,
  verifyOtp,
  type AuthUser,
  type EmailInput,
  type LoginInput,
  type RegisterInput,
  type VerificationPending,
  type VerifyOtpInput,
} from "@/lib/auth.api";
import { useAuthStore } from "@/stores/auth-store";

/** Shared by any mutation that returns a logged-in user: login and verify-otp both do. */
function useAdoptSession() {
  const setUser = useAuthStore((state) => state.setUser);
  const queryClient = useQueryClient();

  return (user: AuthUser) => {
    setUser(user);
    // Seeds useAuthSession's query cache so it doesn't immediately re-fetch /auth/me — we
    // already have the user from this response.
    queryClient.setQueryData(sessionQueryKey, user);
  };
}

/**
 * On success, writes straight to auth-store so PrivateProvider/GuestOnlyProvider see the new
 * session immediately — GuestOnlyProvider's own effect is what navigates away from /login, this
 * hook doesn't redirect itself.
 */
export function useLoginMutation(): UseMutationResult<AuthUser, unknown, LoginInput> {
  const adoptSession = useAdoptSession();

  return useMutation({
    mutationFn: login,
    onSuccess: adoptSession,
  });
}

/**
 * Registering doesn't establish a session (the backend requires OTP verification first), so this
 * doesn't touch auth-store — it just hands the caller the VerificationPending response, which is
 * what the OTP step needs (email, resend cooldown).
 */
export function useRegisterMutation(): UseMutationResult<
  VerificationPending,
  unknown,
  RegisterInput
> {
  return useMutation({
    mutationFn: register,
  });
}

/** Submits the OTP code. Same session-adoption as login — this is what completes registration. */
export function useVerifyOtpMutation(): UseMutationResult<AuthUser, unknown, VerifyOtpInput> {
  const adoptSession = useAdoptSession();

  return useMutation({
    mutationFn: verifyOtp,
    onSuccess: adoptSession,
  });
}

/** Resends the OTP code. No session change — just a fresh VerificationPending for the cooldown. */
export function useResendOtpMutation(): UseMutationResult<
  VerificationPending,
  unknown,
  EmailInput
> {
  return useMutation({
    mutationFn: startVerification,
  });
}

export type VerificationChallenge =
  | { status: "pending"; email: string; resendAfterSeconds: number }
  | { status: "verified"; email: string };

/**
 * The single source of truth the /verify page (and login's email_not_verified handler) resolves
 * against. Always checks /auth/verify-email/status first — cheap, side-effect-free, and what gives
 * the OTP step its live cooldown on every page load/refresh — and only calls startVerification
 * (which sends another email) when there's genuinely no pending code yet. An already-verified
 * email is reported as such rather than falling through into startVerification, which would
 * otherwise hit EmailAlreadyVerified.
 */
export function useResolveVerificationMutation(): UseMutationResult<
  VerificationChallenge,
  unknown,
  EmailInput
> {
  return useMutation({
    mutationFn: async ({ email }) => {
      const status = await verificationStatus({ email });

      if (status.status === "verified") {
        return { status: "verified", email: status.email } as const;
      }

      if (status.status === "pending") {
        return {
          status: "pending",
          email: status.email,
          resendAfterSeconds: status.resend_after_seconds,
        } as const;
      }

      const challenge = await startVerification({ email });
      return {
        status: "pending",
        email: challenge.email,
        resendAfterSeconds: challenge.resend_after_seconds,
      } as const;
    },
  });
}
