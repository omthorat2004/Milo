import { z } from "zod";

/**
 * Where the signup came from, used only to tell "hero CTA" from "footer CTA"
 * so we can tune the page. Not a user identifier.
 */
export const waitlistSourceSchema = z.enum(["hero", "closing", "story", "unknown"]);

export type WaitlistSource = z.infer<typeof waitlistSourceSchema>;

export const waitlistRequestSchema = z.object({
  email: z
    .string()
    .trim()
    .min(3, "Enter your email address.")
    .max(254, "That email address is too long.")
    .toLowerCase()
    .pipe(z.email("Enter a valid email address.")),
  source: waitlistSourceSchema.default("unknown"),
  /**
   * Honeypot. Real people never see this field, so any value means a bot.
   * We accept the request and return success so the bot does not learn.
   */
  company: z.string().max(0).optional().or(z.string().optional()),
});

export type WaitlistRequest = z.infer<typeof waitlistRequestSchema>;

export const waitlistResponseSchema = z.object({
  status: z.enum(["subscribed", "already_subscribed"]),
  message: z.string(),
});

export type WaitlistResponse = z.infer<typeof waitlistResponseSchema>;
