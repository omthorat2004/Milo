import { QueryClient, defaultShouldDehydrateQuery } from "@tanstack/react-query";
import { cache } from "react";

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
      },
      dehydrate: {
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) || query.state.status === "pending",
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;


const isServer = typeof window === "undefined";

/**
 * Server render: a fresh client per request, memoized for the duration of that
 * request via React's cache() so multiple prefetches in one render tree share
 * it. A module-level singleton on the server would leak query state between
 * unrelated requests.
 */
const getServerQueryClient = cache(makeQueryClient);

/**
 * Browser: one client for the tab's whole lifetime, created lazily. A new
 * instance per render would wipe the cache on every re-render.
 */
export function getQueryClient(): QueryClient {
  if (isServer) return getServerQueryClient();

  browserQueryClient ??= makeQueryClient();
  return browserQueryClient;
}
