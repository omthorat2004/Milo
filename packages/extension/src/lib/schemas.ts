import { z } from "zod";

export const userSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  email_verified: z.boolean(),
});

/** POST /auth/login and /auth/refresh with `X-Milo-Client: extension`. */
export const tokenResponseSchema = z.object({
  user: userSchema,
  access_token: z.string().min(1),
  refresh_token: z.string().min(1),
});

export const resumeSchema = z.object({
  id: z.string(),
  title: z.string(),
  source_url: z.string(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const linkSchema = z.object({
  id: z.string(),
  slug: z.string(),
  share_url: z.string(),
  resume_id: z.string(),
  created_at: z.string(),
  expires_at: z.string().nullable(),
  revoked_at: z.string().nullable(),
});

export const apiErrorSchema = z.object({ code: z.string().optional(), msg: z.string().optional() });

export type User = z.infer<typeof userSchema>;
export type Resume = z.infer<typeof resumeSchema>;
export type TrackingLink = z.infer<typeof linkSchema>;

/** What chrome.storage.local holds. */
export const sessionSchema = z.object({
  accessToken: z.string().min(1),
  refreshToken: z.string().min(1),
  user: userSchema,
});
export type Session = z.infer<typeof sessionSchema>;
