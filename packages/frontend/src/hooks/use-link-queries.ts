"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import {
  getLink,
  listLinkEvents,
  listMyEvents,
  listMyLinks,
  type AnalyticsEvent,
  type TrackingLink,
} from "@/lib/links.api";

export const linksQueryKey = ["links"] as const;
export const linkQueryKey = (id: string) => ["links", id] as const;
export const linkEventsQueryKey = (id: string) => ["links", id, "events"] as const;
export const eventsQueryKey = ["events"] as const;

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
