import "server-only";

export type RateLimitVerdict = {
  allowed: boolean;
  retryAfterSeconds: number;
};

type Window = { count: number; resetAt: number };

const windows = new Map<string, Window>();

/**
 * Fixed-window, in-process limiter.
 *
 * Per-instance and therefore best-effort: a serverless deployment can run
 * several instances, each with its own map. That is fine here — it exists to
 * blunt casual form spam on a marketing page and is paired with a honeypot
 * field in the route handler. A shared store can replace this later without
 * changing callers.
 */
export function checkRateLimit(
  key: string,
  { limit, windowSeconds }: { limit: number; windowSeconds: number },
): RateLimitVerdict {
  const now = Date.now();
  const existing = windows.get(key);

  if (!existing || existing.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    pruneExpired(now);
    return { allowed: true, retryAfterSeconds: windowSeconds };
  }

  existing.count += 1;
  return {
    allowed: existing.count <= limit,
    retryAfterSeconds: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
  };
}

function pruneExpired(now: number): void {
  if (windows.size < 512) return;
  for (const [key, window] of windows) {
    if (window.resetAt <= now) windows.delete(key);
  }
}
