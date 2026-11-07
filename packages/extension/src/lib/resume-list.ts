import type { Resume, TrackingLink } from "@/lib/schemas";

export const PAGE_SIZE = 3;

/** Revoked or expired links no longer resolve, so they are not worth offering to copy. */
export function isActiveLink(link: TrackingLink, now: Date = new Date()): boolean {
  if (link.revoked_at) return false;
  if (link.expires_at && new Date(link.expires_at).getTime() <= now.getTime()) return false;
  return true;
}

/** Active links keyed by resume id, newest first. */
export function groupActiveLinks(
  links: TrackingLink[],
  now: Date = new Date(),
): Map<string, TrackingLink[]> {
  const grouped = new Map<string, TrackingLink[]>();
  const active = links
    .filter((link) => isActiveLink(link, now))
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
  for (const link of active) {
    grouped.set(link.resume_id, [...(grouped.get(link.resume_id) ?? []), link]);
  }
  return grouped;
}

export type Page<T> = { items: T[]; page: number; pageCount: number };

/** Clamps `page` (0-based) into range, so deleting items never leaves an empty page. */
export function paginate<T>(items: T[], page: number, size: number = PAGE_SIZE): Page<T> {
  const pageCount = Math.max(1, Math.ceil(items.length / size));
  const current = Math.min(Math.max(page, 0), pageCount - 1);
  return { items: items.slice(current * size, (current + 1) * size), page: current, pageCount };
}

export function byNewest(resumes: Resume[]): Resume[] {
  return [...resumes].sort((a, b) => b.created_at.localeCompare(a.created_at));
}
