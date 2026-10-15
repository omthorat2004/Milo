import { isAxiosError } from "axios";

import { api } from "@/lib/axios.config";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  email_verified: boolean;
};

export type VerificationPending = {
  email: string;
  expires_in_seconds: number;
  resend_after_seconds: number;
  msg: string;
};

export type VerificationStatus = {
  email: string;
  status: "none" | "pending" | "verified";
  expires_in_seconds: number;
  resend_after_seconds: number;
  attempts_remaining: number;
};

export type RegisterInput = { name: string; email: string; password: string };
export type LoginInput = { email: string; password: string };
export type EmailInput = { email: string };
export type VerifyOtpInput = { email: string; code: string };

type AuthEnvelope = { user: AuthUser };

// None of these establish or depend on an existing session — register/login/verify-otp create one
// from scratch, the verify-email endpoints are public lookups — so a 401 from any of them is a
// real domain error, never "the access token needs refreshing." ignoreRefresh skips
// axios.config.ts's refresh-and-retry for exactly that reason (see its own comment for the default
// case: anything *without* this flag, like me(), gets the refresh-and-retry automatically).

export async function register(input: RegisterInput): Promise<VerificationPending> {
  const { data } = await api.post<VerificationPending>("/auth/register", input, {
    ignoreRefresh: true,
  });
  return data;
}

export async function startVerification(input: EmailInput): Promise<VerificationPending> {
  const { data } = await api.post<VerificationPending>("/auth/verify-email/start", input, {
    ignoreRefresh: true,
  });
  return data;
}

export async function verificationStatus(input: EmailInput): Promise<VerificationStatus> {
  const { data } = await api.post<VerificationStatus>("/auth/verify-email/status", input, {
    ignoreRefresh: true,
  });
  return data;
}

export async function verifyOtp(input: VerifyOtpInput): Promise<AuthUser> {
  const { data } = await api.post<AuthEnvelope>("/auth/verify-otp", input, {
    ignoreRefresh: true,
  });
  return data.user;
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { data } = await api.post<AuthEnvelope>("/auth/login", input, { ignoreRefresh: true });
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout", undefined, { ignoreRefresh: true });
}

export async function me(): Promise<AuthUser> {
  const { data } = await api.get<AuthEnvelope>("/auth/me");
  return data.user;
}

/**
 * Backend errors arrive as `{ code, msg }` (see docs/api-design.md). Render `msg`; branch on
 * `code` only where the caller actually needs to (e.g. `email_not_verified`), never on status text.
 */
export function getAuthErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ code?: string; msg?: string }>(error) && error.response?.data?.msg) {
    return error.response.data.msg;
  }
  return fallback;
}
