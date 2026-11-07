import { z } from "zod";

import {
  apiErrorSchema,
  linkSchema,
  resumeSchema,
  tokenResponseSchema,
  type Resume,
  type Session,
  type TrackingLink,
} from "@/lib/schemas";
import type { SessionStore } from "@/lib/storage";

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code?: string,
  ) {
    super(message);
  }
}

/** The stored session is gone or no longer refreshable: show the sign-in form. */
export class SessionExpiredError extends Error {
  constructor() {
    super("Your session expired. Sign in again.");
  }
}

type Options = { baseUrl: string; store: SessionStore; fetchImpl?: typeof fetch };

export function createApi({ baseUrl, store, fetchImpl = fetch }: Options) {
  let refreshing: Promise<Session> | null = null;

  async function send(path: string, init: RequestInit, accessToken?: string): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set("X-Milo-Client", "extension");
    if (init.body) headers.set("Content-Type", "application/json");
    if (accessToken) headers.set("Authorization", `Bearer ${accessToken}`);
    return fetchImpl(`${baseUrl}${path}`, { ...init, headers });
  }

  async function fail(response: Response): Promise<never> {
    const body = apiErrorSchema.safeParse(await response.json().catch(() => null));
    throw new ApiError(
      (body.success && body.data.msg) || "Something went wrong. Try again.",
      response.status,
      body.success ? body.data.code : undefined,
    );
  }

  /** A body that does not match the schema means the backend is not what this build expects
   * (typically an old server that has not been restarted). Never show the raw Zod issues. */
  async function parseBody<T>(response: Response, schema: z.ZodType<T>): Promise<T> {
    const parsed = schema.safeParse(await response.json().catch(() => null));
    if (!parsed.success) {
      throw new ApiError(
        "Unexpected response from the Milo API. Make sure the backend is up to date and restarted.",
        response.status,
        "unexpected_response",
      );
    }
    return parsed.data;
  }

  function refreshSession(current: Session): Promise<Session> {
    refreshing ??= (async () => {
      const response = await send("/auth/refresh", {
        method: "POST",
        body: JSON.stringify({ refresh_token: current.refreshToken }),
      });
      if (!response.ok) {
        await store.clear();
        throw new SessionExpiredError();
      }
      const data = await parseBody(response, tokenResponseSchema);
      const next: Session = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      };
      await store.set(next);
      return next;
    })().finally(() => {
      refreshing = null;
    });
    return refreshing;
  }

  /** Authenticated call: Bearer token, one refresh-and-retry on 401 (mirrors the web app). */
  async function authed<T>(path: string, schema: z.ZodType<T>, init: RequestInit = {}): Promise<T> {
    let session = await store.get();
    if (!session) throw new SessionExpiredError();

    let response = await send(path, init, session.accessToken);
    if (response.status === 401) {
      session = await refreshSession(session);
      response = await send(path, init, session.accessToken);
    }
    if (!response.ok) return fail(response);
    return parseBody(response, schema);
  }

  return {
    async login(email: string, password: string): Promise<Session> {
      const response = await send("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      if (!response.ok) return fail(response);
      const data = await parseBody(response, tokenResponseSchema);
      const session: Session = {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        user: data.user,
      };
      await store.set(session);
      return session;
    },

    /** Tokens only live here, so signing out is just forgetting them. */
    logout: () => store.clear(),

    listResumes: () => authed("/resumes", z.array(resumeSchema)),

    createResume: (input: { title: string; source_url: string }): Promise<Resume> =>
      authed("/resumes", resumeSchema, { method: "POST", body: JSON.stringify(input) }),

    createLink: (resumeId: string): Promise<TrackingLink> =>
      authed(`/resumes/${encodeURIComponent(resumeId)}/links`, linkSchema, {
        method: "POST",
        body: JSON.stringify({}),
      }),
  };
}

export type Api = ReturnType<typeof createApi>;
