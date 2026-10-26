"use client";

import { useQuery, type UseQueryResult } from "@tanstack/react-query";

import { getResume, listResumes, type Resume } from "@/lib/resumes.api";

export const resumesQueryKey = ["resumes"] as const;
export const resumeQueryKey = (id: string) => ["resumes", id] as const;

export function useResumesQuery(): UseQueryResult<Resume[]> {
  return useQuery({ queryKey: resumesQueryKey, queryFn: listResumes, staleTime: 60 * 1000 });
}

export function useResumeQuery(id: string): UseQueryResult<Resume> {
  return useQuery({
    queryKey: resumeQueryKey(id),
    queryFn: () => getResume(id),
    enabled: Boolean(id),
  });
}
