"use client";

import { useMutation, useQueryClient, type UseMutationResult } from "@tanstack/react-query";

import { linksQueryKey } from "@/hooks/use-link-queries";
import { resumeQueryKey, resumesQueryKey } from "@/hooks/use-resume-queries";
import { updateResume, type Resume, type UpdateResumeInput } from "@/lib/resumes.api";

export function useUpdateResumeMutation(): UseMutationResult<
  Resume,
  unknown,
  { id: string; input: UpdateResumeInput }
> {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }) => updateResume(id, input),
    onSuccess: (resume) => {
      queryClient.invalidateQueries({ queryKey: resumesQueryKey });
      queryClient.invalidateQueries({ queryKey: resumeQueryKey(resume.id) });
      // Links denormalize resume_title/resume_source_url onto their own
      // listing (LinkOverview on the backend) — those need a refetch too.
      queryClient.invalidateQueries({ queryKey: linksQueryKey });
    },
  });
}
