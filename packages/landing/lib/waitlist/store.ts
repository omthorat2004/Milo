import "server-only";

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { getWaitlistCollection } from "./mongo";
import type { WaitlistEntry, WaitlistResult, WaitlistStore } from "./types";

export type { WaitlistEntry, WaitlistResult, WaitlistStore };

/** Mongo's duplicate-key error, i.e. this email is already on the list. */
const DUPLICATE_KEY = 11000;

/**
 * MongoDB — the production store, and the same database the FastAPI backend
 * will use, so nothing has to be migrated when it lands.
 *
 * Duplicates are rejected by a unique index rather than a read-then-write
 * check, which would race between concurrent signups.
 */
class MongoWaitlistStore implements WaitlistStore {
  readonly name = "mongodb";

  constructor(
    private readonly uri: string,
    private readonly dbName: string,
  ) {}

  async add(entry: WaitlistEntry): Promise<WaitlistResult> {
    const collection = await getWaitlistCollection(this.uri, this.dbName);

    try {
      await collection.insertOne(entry);
      return "subscribed";
    } catch (error: unknown) {
      if (isDuplicateKeyError(error)) return "already_subscribed";
      throw error;
    }
  }

  async count(): Promise<number> {
    const collection = await getWaitlistCollection(this.uri, this.dbName);
    return collection.estimatedDocumentCount();
  }
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === DUPLICATE_KEY
  );
}

/**
 * Local JSON file. Used in development so signups survive a restart and can be
 * inspected by hand at `.data/waitlist.json`.
 */
class FileWaitlistStore implements WaitlistStore {
  readonly name = "file";

  constructor(private readonly filePath: string) {}

  private async read(): Promise<WaitlistEntry[]> {
    try {
      const raw = await readFile(this.filePath, "utf8");
      const parsed: unknown = JSON.parse(raw);
      return Array.isArray(parsed) ? (parsed as WaitlistEntry[]) : [];
    } catch {
      return [];
    }
  }

  async add(entry: WaitlistEntry): Promise<WaitlistResult> {
    const entries = await this.read();
    if (entries.some((existing) => existing.email === entry.email)) {
      return "already_subscribed";
    }

    entries.push(entry);
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, `${JSON.stringify(entries, null, 2)}\n`, "utf8");
    return "subscribed";
  }

  async count(): Promise<number> {
    return (await this.read()).length;
  }
}

/**
 * Production fallback while there is no database.
 *
 * Writes one structured line per signup to stdout, which the hosting platform
 * retains in its logs, so a signup is never silently dropped. Deduplication is
 * per-instance only, which is acceptable for a launch-day waitlist.
 */
class LogWaitlistStore implements WaitlistStore {
  readonly name = "log";
  private readonly seen = new Set<string>();

  async add(entry: WaitlistEntry): Promise<WaitlistResult> {
    if (this.seen.has(entry.email)) return "already_subscribed";
    this.seen.add(entry.email);
    console.info(`[milo.waitlist] ${JSON.stringify(entry)}`);
    return "subscribed";
  }

  async count(): Promise<number> {
    return this.seen.size;
  }
}

/**
 * Forwards signups as JSON to an HTTP endpoint. This is the seam for the
 * FastAPI backend: set WAITLIST_FORWARD_URL to its waitlist route and nothing
 * else in this package changes.
 */
class ForwardingWaitlistStore implements WaitlistStore {
  readonly name = "forward";

  constructor(
    private readonly url: string,
    private readonly secret: string | undefined,
    private readonly fallback: WaitlistStore,
  ) {}

  async add(entry: WaitlistEntry): Promise<WaitlistResult> {
    const response = await fetch(this.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(this.secret ? { "X-Milo-Signature": this.secret } : {}),
      },
      body: JSON.stringify(entry),
      signal: AbortSignal.timeout(5_000),
      cache: "no-store",
    });

    if (response.status === 409) return "already_subscribed";
    if (!response.ok) throw new Error(`Waitlist forward responded ${response.status}`);
    return "subscribed";
  }

  async count(): Promise<number> {
    return this.fallback.count();
  }
}

let cached: WaitlistStore | null = null;

/**
 * Picks a store, most durable first:
 *
 *   1. MONGODB_URI          → MongoDB (production)
 *   2. WAITLIST_FORWARD_URL → forward to another service, e.g. FastAPI
 *   3. development          → a local JSON file
 *   4. production, none set → structured logs, so signups are at least
 *                             recoverable rather than silently dropped
 */
export function getWaitlistStore(): WaitlistStore {
  if (cached) return cached;

  const mongoUri = process.env.MONGODB_URI;
  if (mongoUri) {
    cached = new MongoWaitlistStore(mongoUri, process.env.MONGODB_DB ?? "milo");
    return cached;
  }

  const local: WaitlistStore =
    process.env.NODE_ENV === "production"
      ? new LogWaitlistStore()
      : new FileWaitlistStore(
          process.env.WAITLIST_DATA_FILE ?? path.join(process.cwd(), ".data", "waitlist.json"),
        );

  const forwardUrl = process.env.WAITLIST_FORWARD_URL;
  cached = forwardUrl
    ? new ForwardingWaitlistStore(forwardUrl, process.env.WAITLIST_FORWARD_SECRET, local)
    : local;

  if (process.env.NODE_ENV === "production") {
    console.warn(
      "[milo.waitlist] No MONGODB_URI set — signups are only recoverable from runtime logs.",
    );
  }

  return cached;
}
