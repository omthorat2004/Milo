import "server-only";

import { MongoClient, type Collection, type Db, type MongoClientOptions } from "mongodb";

import type { WaitlistEntry } from "./types";

/**
 * MongoDB connection, shared across invocations.
 *
 * Serverless functions are frozen and thawed rather than torn down, so the
 * client is cached on `globalThis`, a new MongoClient per request would
 * exhaust the connection pool under any real traffic. In development the same
 * cache survives hot reloads.
 */
declare global {
  var __miloMongoClient: Promise<MongoClient> | undefined;
}

const CLIENT_OPTIONS: MongoClientOptions = {
  /*
   * Long enough to absorb an Atlas free-tier cluster waking from auto-pause
   * (SRV lookup, TLS handshake, replica-set discovery), short enough that a
   * genuinely unreachable cluster fails the request rather than hanging it.
   */
  serverSelectionTimeoutMS: 10_000,
  connectTimeoutMS: 10_000,
  maxPoolSize: 10,
  retryWrites: true,
};

function getClient(uri: string): Promise<MongoClient> {
  globalThis.__miloMongoClient ??= new MongoClient(uri, CLIENT_OPTIONS)
    .connect()
    .catch((error: unknown) => {
      /*
       * Drop the cache on failure. Without this, a rejected connect promise
       * stays memoised on a warm serverless instance and every later request
       * re-awaits the same rejection, so fixing the cluster or its credentials
       * appears to change nothing until the instance is recycled.
       */
      globalThis.__miloMongoClient = undefined;
      throw error;
    });

  return globalThis.__miloMongoClient;
}

/** Document shape as stored. `_id` is Mongo's own; the email is the unique key. */
export type WaitlistDocument = WaitlistEntry;

/**
 * Turns a driver error into the specific thing to go and fix.
 *
 * The driver's own messages bury the cause in a replica-set topology dump, and
 * the three realistic production failures need three different fixes, so the
 * log line should name which one it is.
 */
export function diagnoseMongoError(error: unknown): string | null {
  const message = error instanceof Error ? `${error.name}: ${error.message}` : String(error);

  if (/bad auth|Authentication failed|SCRAM/i.test(message)) {
    return "Authentication failed. The password in MONGODB_URI is wrong, or that database user does not exist. Fix in Atlas → Database Access, and URL-encode the password if it contains @ : / ? # [ ] or %.";
  }

  if (/querySrv|ENOTFOUND|EAI_AGAIN/i.test(message)) {
    return "The cluster hostname did not resolve. Check the host in MONGODB_URI, and that it starts with mongodb+srv:// for an Atlas SRV string.";
  }

  if (/ServerSelection|tlsv1 alert|ETIMEDOUT|ECONNREFUSED|connection.*closed/i.test(message)) {
    return "Could not reach the cluster. In Atlas → Network Access allow 0.0.0.0/0 (Vercel has no fixed egress IP), and check the cluster is not paused.";
  }

  return null;
}

export async function getWaitlistCollection(
  uri: string,
  dbName: string,
): Promise<Collection<WaitlistDocument>> {
  const client = await getClient(uri);
  const db: Db = client.db(dbName);
  const collection = db.collection<WaitlistDocument>("waitlist");

  await ensureIndexes(collection);
  return collection;
}

let indexesReady: Promise<void> | null = null;

/**
 * Unique index on email is what makes duplicate signups a database-level
 * guarantee rather than a race between two concurrent requests. Created once
 * per process, not per request.
 */
function ensureIndexes(collection: Collection<WaitlistDocument>): Promise<void> {
  indexesReady ??= collection
    .createIndex({ email: 1 }, { unique: true, name: "email_unique" })
    .then(() => undefined)
    .catch((error: unknown) => {
      // A failed index build must not take the signup form down with it.
      console.error("[milo.waitlist] index creation failed", error);
      indexesReady = null;
    });

  return indexesReady;
}
