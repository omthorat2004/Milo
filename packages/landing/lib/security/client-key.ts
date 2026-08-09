import "server-only";

/**
 * Derives a short-lived, non-reversible key for a request, used only for abuse
 * control on the waitlist endpoint.
 *
 * The raw IP is read from proxy headers, hashed with a rotating daily salt, and
 * never stored, logged, or returned. Rotating the salt daily means yesterday's
 * keys cannot be correlated with today's.
 */
export async function deriveClientKey(headers: Headers): Promise<string> {
  const forwarded = headers.get("x-forwarded-for");
  const address = forwarded?.split(",")[0]?.trim() || headers.get("x-real-ip") || "unknown";

  const daySalt = new Date().toISOString().slice(0, 10);
  const secret = process.env.WAITLIST_WEBHOOK_SECRET ?? "milo-local-salt";

  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(`${secret}:${daySalt}:${address}`),
  );

  return Array.from(new Uint8Array(digest).slice(0, 12))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
