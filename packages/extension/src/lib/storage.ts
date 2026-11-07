import { sessionSchema, type Session } from "@/lib/schemas";

export type SessionStore = {
  get(): Promise<Session | null>;
  set(session: Session): Promise<void>;
  clear(): Promise<void>;
};

const KEY = "milo_session";

/**
 * chrome.storage.local is private to this extension (web pages and other extensions cannot read
 * it). Never use storage.sync: it would copy the tokens to the user's other devices via their
 * Google account.
 */
export const chromeSessionStore: SessionStore = {
  async get() {
    const stored = await chrome.storage.local.get(KEY);
    const parsed = sessionSchema.safeParse(stored[KEY]);
    return parsed.success ? parsed.data : null;
  },
  async set(session) {
    await chrome.storage.local.set({ [KEY]: session });
  },
  async clear() {
    await chrome.storage.local.remove(KEY);
  },
};
