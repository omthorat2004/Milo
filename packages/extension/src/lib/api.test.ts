import { describe, expect, it, vi } from "vitest";

import { createApi, SessionExpiredError } from "@/lib/api";
import type { Session } from "@/lib/schemas";
import type { SessionStore } from "@/lib/storage";

const user = { id: "u1", name: "Ada", email: "ada@example.com", email_verified: true };
const old: Session = { accessToken: "old-access", refreshToken: "old-refresh", user };

function memoryStore(initial: Session | null): SessionStore & { current: Session | null } {
  const store = {
    current: initial,
    get: async () => store.current,
    set: async (session: Session) => void (store.current = session),
    clear: async () => void (store.current = null),
  };
  return store;
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status });
}

describe("createApi", () => {
  it("sends the stored access token as a Bearer header", async () => {
    const fetchImpl = vi.fn(async () => json([]));
    const api = createApi({ baseUrl: "http://api", store: memoryStore(old), fetchImpl });

    await api.listResumes();

    const init = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1];
    const headers = new Headers(init.headers);
    expect(headers.get("Authorization")).toBe("Bearer old-access");
    expect(headers.get("X-Milo-Client")).toBe("extension");
  });

  it("refreshes once on 401, stores the new pair, and retries", async () => {
    const store = memoryStore(old);
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(json({ code: "invalid_token" }, 401))
      .mockResolvedValueOnce(
        json({ user, access_token: "new-access", refresh_token: "new-refresh" }),
      )
      .mockResolvedValueOnce(json([]));
    const api = createApi({ baseUrl: "http://api", store, fetchImpl });

    await api.listResumes();

    expect(store.current?.accessToken).toBe("new-access");
    expect(store.current?.refreshToken).toBe("new-refresh");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it("clears the session when the refresh is rejected", async () => {
    const store = memoryStore(old);
    const fetchImpl = vi.fn(async () => json({ code: "invalid_token" }, 401));
    const api = createApi({ baseUrl: "http://api", store, fetchImpl });

    await expect(api.listResumes()).rejects.toBeInstanceOf(SessionExpiredError);
    expect(store.current).toBeNull();
  });

  it("requires a session before calling", async () => {
    const api = createApi({ baseUrl: "http://api", store: memoryStore(null), fetchImpl: vi.fn() });

    await expect(api.listResumes()).rejects.toBeInstanceOf(SessionExpiredError);
  });

  it("stores the token pair after login", async () => {
    const store = memoryStore(null);
    const fetchImpl = vi.fn(async () => json({ user, access_token: "a", refresh_token: "r" }));
    const api = createApi({ baseUrl: "http://api", store, fetchImpl });

    await api.login("ada@example.com", "supersecret");

    expect(store.current).toEqual({ accessToken: "a", refreshToken: "r", user });
  });
});
