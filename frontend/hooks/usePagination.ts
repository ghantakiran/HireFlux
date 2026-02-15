'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';

interface UsePaginationOptions<T> {
  items: T[];
  itemsPerPage?: number;
  initialPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  setCurrentPage: (page: number) => void;
  totalPages: number;
  paginatedItems: T[];
  pageInfo: {
    startIndex: number;
    endIndex: number;
    totalItems: number;
  };
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

export function usePagination<T>({
  items,
  itemsPerPage = 10,
  initialPage = 1,
}: UsePaginationOptions<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(initialPage);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(items.length / itemsPerPage)),
    [items.length, itemsPerPage]
  );

  // Reset to page 1 when items change significantly
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return items.slice(start, start + itemsPerPage);
  }, [items, currentPage, itemsPerPage]);

  const pageInfo = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage + 1;
    const endIndex = Math.min(currentPage * itemsPerPage, items.length);
    return { startIndex, endIndex, totalItems: items.length };
  }, [currentPage, itemsPerPage, items.length]);

  const handlePageChange = useCallback((page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  }, [totalPages]);

  return {
    currentPage,
    setCurrentPage: handlePageChange,
    totalPages,
    paginatedItems,
    pageInfo,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
  };
}
