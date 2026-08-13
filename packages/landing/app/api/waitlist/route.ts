import { NextResponse } from "next/server";

import { deriveClientKey } from "@/lib/security/client-key";
import { checkRateLimit } from "@/lib/security/rate-limit";
import { diagnoseMongoError } from "@/lib/waitlist/mongo";
import { waitlistRequestSchema } from "@/lib/waitlist/schema";
import { getWaitlistStore } from "@/lib/waitlist/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RATE_LIMIT = { limit: 5, windowSeconds: 60 * 10 } as const;

export async function POST(request: Request): Promise<NextResponse> {
  if (request.headers.get("content-type")?.includes("application/json") !== true) {
    return jsonError(415, "Send JSON.");
  }

  const clientKey = await deriveClientKey(request.headers);
  const verdict = checkRateLimit(`waitlist:${clientKey}`, RATE_LIMIT);
  if (!verdict.allowed) {
    return NextResponse.json(
      { error: "Too many attempts. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(verdict.retryAfterSeconds) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Malformed request body.");
  }

  const parsed = waitlistRequestSchema.safeParse(body);
  if (!parsed.success) {
    const message = parsed.error.issues[0]?.message ?? "Check the details and try again.";
    return jsonError(400, message);
  }

  const { email, source, company } = parsed.data;

  // Honeypot: bots fill hidden fields. Answer as though it worked so they do
  // not learn to skip it, but store nothing.
  if (company && company.length > 0) {
    return NextResponse.json({ status: "subscribed", message: "You're on the list." });
  }

  try {
    const result = await getWaitlistStore().add({
      email,
      source,
      createdAt: new Date().toISOString(),
    });

    return NextResponse.json({
      status: result,
      message:
        result === "subscribed"
          ? "You're on the list. We'll email you when Milo opens up."
          : "You're already on the list.",
    });
  } catch (error) {
    const diagnosis = diagnoseMongoError(error);
    console.error(`[milo.waitlist] signup failed${diagnosis ? `, ${diagnosis}` : ""}`, error);
    return jsonError(503, "We couldn't save that right now. Please try again in a moment.");
  }
}

/**
 * Signup count, for the operator only.
 *
 * The count is deliberately not public: early numbers are small and small
 * numbers read as "nobody wants this". Requires WAITLIST_ADMIN_TOKEN as a
 * bearer token. Emails are never returned over HTTP at all.
 */
export async function GET(request: Request): Promise<NextResponse> {
  const adminToken = process.env.WAITLIST_ADMIN_TOKEN;
  const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");

  if (!adminToken || !provided || !timingSafeEqual(provided, adminToken)) {
    return jsonError(404, "Not found.");
  }

  try {
    const count = await getWaitlistStore().count();
    return NextResponse.json({ count }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("[milo.waitlist] count failed", error);
    return jsonError(503, "Unavailable.");
  }
}

/** Constant-time-ish comparison so the token cannot be guessed byte by byte. */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i += 1) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

function jsonError(status: number, message: string): NextResponse {
  return NextResponse.json({ error: message }, { status });
}
