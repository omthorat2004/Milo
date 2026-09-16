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

export async function register(input: RegisterInput): Promise<VerificationPending> {
  const { data } = await api.post<VerificationPending>("/auth/register", input);
  return data;
}

export async function startVerification(input: EmailInput): Promise<VerificationPending> {
  const { data } = await api.post<VerificationPending>("/auth/verify-email/start", input);
  return data;
}

export async function verificationStatus(input: EmailInput): Promise<VerificationStatus> {
  const { data } = await api.post<VerificationStatus>("/auth/verify-email/status", input);
  return data;
}

export async function verifyOtp(input: VerifyOtpInput): Promise<AuthUser> {
  const { data } = await api.post<AuthEnvelope>("/auth/verify-otp", input);
  return data.user;
}

export async function login(input: LoginInput): Promise<AuthUser> {
  const { data } = await api.post<AuthEnvelope>("/auth/login", input);
  return data.user;
}

export async function logout(): Promise<void> {
  await api.post("/auth/logout");
}

export async function me(): Promise<AuthUser> {
  const { data } = await api.get<AuthEnvelope>("/auth/me");
  return data.user;
}
