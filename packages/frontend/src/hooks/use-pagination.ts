import { useMemo, useState } from "react";

type Pagination<T> = {
  page: number;
  pageCount: number;
  pageItems: T[];
  setPage: (page: number) => void;
};

/**
 * Paginates an already-fetched array client-side rather than adding
 * limit/skip params to the backend: every list this feeds (links, activity
 * logs) is capped at a few hundred/thousand rows by the DAO layer already
 * and fetched in one TanStack Query call, so slicing the array that's
 * already in memory is simpler than a second round-trip per page for data
 * this small. Clamps back to the last valid page if the source array
 * shrinks (a revoke, a filter) past the current page.
 */
export function usePagination<T>(items: T[], pageSize: number): Pagination<T> {
  const [page, setPage] = useState(1);

  const pageCount = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, pageCount);

  const pageItems = useMemo(
    () => items.slice((safePage - 1) * pageSize, safePage * pageSize),
    [items, safePage, pageSize],
  );

  return { page: safePage, pageCount, pageItems, setPage };
}
