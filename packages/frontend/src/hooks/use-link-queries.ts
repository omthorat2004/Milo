"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  getLink,
  getLinkBySlug,
  listLinkEvents,
  listLinksForResume,
  listMyEvents,
  listMyLinks,
  type AnalyticsEvent,
  type TrackingLink,
} from "@/lib/links.api";

export const linksQueryKey = ["links"] as const;
export const linkQueryKey = (id: string) => ["links", id] as const;
export const linkBySlugQueryKey = (slug: string) => ["links", "by-slug", slug] as const;
export const linkEventsQueryKey = (id: string) => ["links", id, "events"] as const;
export const eventsQueryKey = ["events"] as const;
export const resumeLinksQueryKey = (resumeId: string) => ["resumes", resumeId, "links"] as const;

export function useMyLinksQuery(): UseQueryResult<TrackingLink[]> {
  return useQuery({ queryKey: linksQueryKey, queryFn: listMyLinks, staleTime: 30 * 1000 });
}

export function useLinkQuery(id: string): UseQueryResult<TrackingLink> {
  return useQuery({
    queryKey: linkQueryKey(id),
    queryFn: () => getLink(id),
    enabled: Boolean(id),
  });
}

/** The authenticated dashboard/links/logs pages key their route on a link's
 * slug (see linkBySlugQueryKey), not its Mongo id, matching the public share
 * URL. Everything downstream (events, revoke, update-expiry) still uses the
 * real id once this resolves it. */
export function useLinkBySlugQuery(slug: string): UseQueryResult<TrackingLink> {
  return useQuery({
    queryKey: linkBySlugQueryKey(slug),
    queryFn: () => getLinkBySlug(slug),
    enabled: Boolean(slug),
  });
}

export function useLinkEventsQuery(id: string): UseQueryResult<AnalyticsEvent[]> {
  return useQuery({
    queryKey: linkEventsQueryKey(id),
    queryFn: () => listLinkEvents(id),
    enabled: Boolean(id),
  });
}

export function useMyEventsQuery(): UseQueryResult<AnalyticsEvent[]> {
  return useQuery({ queryKey: eventsQueryKey, queryFn: listMyEvents, staleTime: 30 * 1000 });
}

/** One resume can back several tracking links (one per job application, for instance).
 * Used to warn before an edit that would silently change every sibling link too. */
export function useResumeLinksQuery(resumeId: string): UseQueryResult<TrackingLink[]> {
  return useQuery({
    queryKey: resumeLinksQueryKey(resumeId),
    queryFn: () => listLinksForResume(resumeId),
    enabled: Boolean(resumeId),
    staleTime: 30 * 1000,
  });
}
