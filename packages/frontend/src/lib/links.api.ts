import { isAxiosError } from "axios";

import { api } from "@/lib/axios.config";

export type TrackingLink = {
  id: string;
  slug: string;
  share_url: string;
  resume_id: string;
  resume_title: string;
  resume_source_url: string;
  created_at: string;
  expires_at: string | null;
  revoked_at: string | null;
};

export type CreateLinkInput = { expires_in_days?: number | null };

export type AnalyticsEventType = "view" | "download";

export type AnalyticsEvent = {
  id: string;
  link_id: string;
  event_type: AnalyticsEventType;
  occurred_at: string;
  session_id: string | null;
  device_category: string | null;
  browser: string | null;
  os: string | null;
  referrer_domain: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  page_number: number | null;
  dwell_time_seconds: number | null;
};

export async function createLink(
  resumeId: string,
  input: CreateLinkInput = {},
): Promise<TrackingLink> {
  const { data } = await api.post<TrackingLink>(`/resumes/${resumeId}/links`, input);
  return data;
}

export async function listLinksForResume(resumeId: string): Promise<TrackingLink[]> {
  const { data } = await api.get<TrackingLink[]>(`/resumes/${resumeId}/links`);
  return data;
}

export async function listMyLinks(): Promise<TrackingLink[]> {
  const { data } = await api.get<TrackingLink[]>("/links");
  return data;
}

export async function getLink(linkId: string): Promise<TrackingLink> {
  const { data } = await api.get<TrackingLink>(`/links/${linkId}`);
  return data;
}

export async function revokeLink(linkId: string): Promise<void> {
  await api.delete(`/links/${linkId}`);
}

export async function updateLinkExpiry(
  linkId: string,
  expiresInDays: number | null,
): Promise<TrackingLink> {
  const { data } = await api.patch<TrackingLink>(`/links/${linkId}`, {
    expires_in_days: expiresInDays,
  });
  return data;
}

export type DwellBeaconInput = {
  sessionId: string | null;
  pageNumber: number | null;
  dwellSeconds: number;
};

/**
 * Fire-and-forget via `navigator.sendBeacon`, survives the tab closing,
 * unlike a normal fetch. There is no response to read; a failed send (e.g. no
 * `sendBeacon` support) is silently dropped, same as the backend treats a
 * beacon for a since-expired link.
 */
export function sendDwellBeacon(slug: string, input: DwellBeaconInput): void {
  if (typeof navigator === "undefined" || typeof navigator.sendBeacon !== "function") return;

  const body = JSON.stringify({
    session_id: input.sessionId,
    page_number: input.pageNumber,
    dwell_seconds: input.dwellSeconds,
  });
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "";
  navigator.sendBeacon(
    `${baseUrl}/l/${slug}/dwell`,
    new Blob([body], { type: "application/json" }),
  );
}

export async function listLinkEvents(linkId: string): Promise<AnalyticsEvent[]> {
  const { data } = await api.get<AnalyticsEvent[]>(`/links/${linkId}/events`);
  return data;
}

export async function listMyEvents(): Promise<AnalyticsEvent[]> {
  const { data } = await api.get<AnalyticsEvent[]>("/events");
  return data;
}

export type LinkStatus = "active" | "expired" | "revoked";

/** Milo has no "paused" state: a link is live until it expires or is revoked (irreversible). */
export function linkStatus(link: TrackingLink): LinkStatus {
  if (link.revoked_at) return "revoked";
  if (link.expires_at && new Date(link.expires_at).getTime() <= Date.now()) return "expired";
  return "active";
}

/** Backend errors arrive as `{ code, msg }` (see docs/api-design.md). */
export function getLinkErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ code?: string; msg?: string }>(error) && error.response?.data?.msg) {
    return error.response.data.msg;
  }
  return fallback;
}
