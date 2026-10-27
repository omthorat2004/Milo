"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { AuthProvider } from "@/components/providers/auth-provider";
import { getQueryClient } from "@/lib/get-query-client";

export function Provider({ children }: { children: React.ReactNode }) {
  // getQueryClient() returns a per-request client on the server (via React
  // cache()) and the one browser singleton once this hydrates on the client
  // See lib/get-query-client.ts. No useState needed to pick between them.
  const queryClient = getQueryClient();

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>{children}</AuthProvider>
      {process.env.NODE_ENV === "development" ? <ReactQueryDevtools initialIsOpen={false} /> : null}
    </QueryClientProvider>
  );
}
