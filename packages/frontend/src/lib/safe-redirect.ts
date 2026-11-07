/**
 * Post-login redirect targets. The `from` query param carries where a signed-out visitor was
 * heading, so login can send them back. It is attacker-controllable (anyone can craft a login
 * link), so only same-origin relative paths are ever honoured. Anything else falls back.
 */

export const DEFAULT_AFTER_LOGIN = "/dashboard";

const AUTH_PATHS = ["/login", "/register", "/verify", "/forgot-password"];

export function safeRedirectTarget(
  from: string | null | undefined,
  fallback: string = DEFAULT_AFTER_LOGIN,
): string {
  if (!from || !from.startsWith("/")) return fallback;
  // "//evil.com" and "/\evil.com" are treated as protocol-relative by browsers.
  if (from.startsWith("//") || from.startsWith("/\\")) return fallback;
  // Control characters (tabs/newlines get stripped by URL parsers, hiding a second slash).
  if (/[\u0000-\u001f\u007f]/.test(from)) return fallback;

  // Never bounce back into an auth page, that would loop.
  const path = from.split(/[?#]/)[0];
  if (AUTH_PATHS.some((p) => path === p || path.startsWith(`${p}/`))) return fallback;

  return from;
}

/** `/login?from=<current path>` for a signed-out visitor. */
export function loginUrlFor(pathWithSearch: string): string {
  const target = safeRedirectTarget(pathWithSearch, "");
  return target ? `/login?from=${encodeURIComponent(target)}` : "/login";
}
