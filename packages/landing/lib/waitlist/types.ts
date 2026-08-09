import type { WaitlistSource } from "./schema";

export type WaitlistEntry = {
  email: string;
  source: WaitlistSource;
  createdAt: string;
};

export type WaitlistResult = "subscribed" | "already_subscribed";

/**
 * Storage boundary for waitlist signups.
 *
 * Kept in its own module so adapters can import the contract without importing
 * the adapter registry that constructs them.
 */
export interface WaitlistStore {
  readonly name: string;
  add(entry: WaitlistEntry): Promise<WaitlistResult>;
  /** Count only. Emails are never returned over HTTP. */
  count(): Promise<number>;
}
