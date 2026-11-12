/**
 * Remembers an in-flight password reset across a page refresh.
 *
 * The forgot-password form keeps its step and resend timer in React state, so a
 * refresh used to drop both: the user landed back on the email step, could ask
 * for another code straight away, and got a fresh timer even though the server
 * (which silently ignores a request inside its own cooldown) had sent nothing.
 * Storing the cooldown's end time, not the seconds left, lets the timer pick up
 * where it was.
 *
 * sessionStorage on purpose: it is per tab and gone when the tab closes, and it
 * never leaves the browser. Every access is wrapped because storage can be
 * blocked or throw (private windows, blocked site data).
 */

const STORAGE_KEY = "milo:forgot-password";

/** How long after the cooldown ends we still restore the "enter your code" step. */
const RESTORE_WINDOW_MS = 15 * 60 * 1000;

export type ResetCooldown = {
  email: string;
  /** Epoch ms at which the resend button may be used again. */
  until: number;
};

function getStorage(): Storage | null {
  try {
    return typeof window === "undefined" ? null : window.sessionStorage;
  } catch {
    return null;
  }
}

export function saveResetCooldown(
  email: string,
  seconds: number,
  now: number = Date.now(),
  storage: Storage | null = getStorage(),
): void {
  if (!storage) return;
  try {
    const value: ResetCooldown = { email, until: now + Math.max(0, seconds) * 1000 };
    storage.setItem(STORAGE_KEY, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the timer just won't survive a refresh.
  }
}

export function loadResetCooldown(
  now: number = Date.now(),
  storage: Storage | null = getStorage(),
): ResetCooldown | null {
  if (!storage) return null;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      typeof (parsed as ResetCooldown).email !== "string" ||
      typeof (parsed as ResetCooldown).until !== "number"
    ) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    const { email, until } = parsed as ResetCooldown;
    if (now > until + RESTORE_WINDOW_MS) {
      storage.removeItem(STORAGE_KEY);
      return null;
    }
    return { email, until };
  } catch {
    return null;
  }
}

export function clearResetCooldown(storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY);
  } catch {
    // Nothing to do.
  }
}

/** Whole seconds left on a stored cooldown, never negative. */
export function secondsLeft(until: number, now: number = Date.now()): number {
  return Math.max(0, Math.ceil((until - now) / 1000));
}
