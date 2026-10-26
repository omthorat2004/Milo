"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { linkQueryKey, linksQueryKey } from "@/hooks/use-link-queries";
import { resumesQueryKey } from "@/hooks/use-resume-queries";
import { createLink, revokeLink, updateLinkExpiry, type TrackingLink } from "@/lib/links.api";
import { createResume } from "@/lib/resumes.api";

export type CreateTrackingLinkInput = {
  title: string;
  sourceUrl: string;
  expiresInDays?: number | null;
};

/**
 * One "create a link" submission is two backend calls: Milo has no combined
 * resume+link entity, so this creates the Resume (title + source URL) first,
 * then a TrackingLink for it.
 */
export function useCreateTrackingLinkMutation(): UseMutationResult<
  TrackingLink,
  unknown,
  CreateTrackingLinkInput
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTrackingLinkInput) => {
      const resume = await createResume({ title: input.title, source_url: input.sourceUrl });
      return createLink(resume.id, { expires_in_days: input.expiresInDays ?? null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linksQueryKey });
      queryClient.invalidateQueries({ queryKey: resumesQueryKey });
    },
  });
}

/** Revoking is permanent — there is no un-revoke endpoint. */
export function useRevokeLinkMutation(): UseMutationResult<void, unknown, string> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (linkId: string) => revokeLink(linkId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: linksQueryKey });
    },
  });
}

/** The only editable field on a link — expiry. `null` clears it (never expires). */
export function useUpdateLinkExpiryMutation(): UseMutationResult<
  TrackingLink,
  unknown,
  { linkId: string; expiresInDays: number | null }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ linkId, expiresInDays }) => updateLinkExpiry(linkId, expiresInDays),
    onSuccess: (link) => {
      queryClient.invalidateQueries({ queryKey: linksQueryKey });
      queryClient.invalidateQueries({ queryKey: linkQueryKey(link.id) });
    },
  });
}
