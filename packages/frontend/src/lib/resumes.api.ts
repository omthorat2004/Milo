import { isAxiosError } from "axios";

import { api } from "@/lib/axios.config";

export type Resume = {
  id: string;
  title: string;
  source_url: string;
  created_at: string;
  updated_at: string;
};

export type CreateResumeInput = { title: string; source_url: string };
export type UpdateResumeInput = { title?: string; source_url?: string };

export async function createResume(input: CreateResumeInput): Promise<Resume> {
  const { data } = await api.post<Resume>("/resumes", input);
  return data;
}

export async function updateResume(id: string, input: UpdateResumeInput): Promise<Resume> {
  const { data } = await api.patch<Resume>(`/resumes/${id}`, input);
  return data;
}

export async function listResumes(): Promise<Resume[]> {
  const { data } = await api.get<Resume[]>("/resumes");
  return data;
}

export async function getResume(id: string): Promise<Resume> {
  const { data } = await api.get<Resume>(`/resumes/${id}`);
  return data;
}

/** Backend errors arrive as `{ code, msg }` (see docs/api-design.md). */
export function getResumeErrorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ code?: string; msg?: string }>(error) && error.response?.data?.msg) {
    return error.response.data.msg;
  }
  return fallback;
}
