import "server-only";

import { MongoClient, type Collection, type Db, type MongoClientOptions } from "mongodb";

import type { WaitlistEntry } from "./types";

/**
 * MongoDB connection, shared across invocations.
 *
 * Serverless functions are frozen and thawed rather than torn down, so the
 * client is cached on `globalThis` — a new MongoClient per request would
 * exhaust the connection pool under any real traffic. In development the same
 * cache survives hot reloads.
 */
declare global {
  var __miloMongoClient: Promise<MongoClient> | undefined;
}

const CLIENT_OPTIONS: MongoClientOptions = {
  // Fail fast rather than holding a request open: the form shows an error and
  // the visitor can retry.
  serverSelectionTimeoutMS: 5_000,
  connectTimeoutMS: 5_000,
  maxPoolSize: 10,
  retryWrites: true,
};

function getClient(uri: string): Promise<MongoClient> {
  if (!globalThis.__miloMongoClient) {
    globalThis.__miloMongoClient = new MongoClient(uri, CLIENT_OPTIONS).connect();
  }
  return globalThis.__miloMongoClient;
}

/** Document shape as stored. `_id` is Mongo's own; the email is the unique key. */
export type WaitlistDocument = WaitlistEntry;

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
