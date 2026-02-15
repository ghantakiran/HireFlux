'use client';

import { useCallback, useEffect, useRef, useMemo } from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

export interface URLStateConfig {
  [key: string]: { defaultValue: string };
}

export interface UseURLStateReturn {
  getParam: (key: string) => string;
  setParam: (key: string, value: string) => void;
  setParams: (params: Record<string, string>) => void;
  clearParams: () => void;
  params: Record<string, string>;
}

export function useURLState(config: URLStateConfig): UseURLStateReturn {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const pendingRef = useRef<Record<string, string>>({});
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const params = useMemo(() => {
    const result: Record<string, string> = {};
    for (const key of Object.keys(config)) {
      result[key] = searchParams.get(key) || config[key].defaultValue;
    }
    return result;
  }, [searchParams, config]);

  const flush = useCallback(() => {
    const current = new URLSearchParams(searchParams.toString());

    for (const [key, value] of Object.entries(pendingRef.current)) {
      const defaultVal = config[key]?.defaultValue;
      if (value === defaultVal || value === '') {
        current.delete(key);
      } else {
        current.set(key, value);
      }
    }

    pendingRef.current = {};
    const qs = current.toString();
    const newUrl = qs ? `${pathname}?${qs}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [searchParams, pathname, router, config]);

  const scheduleFlush = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      flush();
      timerRef.current = null;
    }, 100);
  }, [flush]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, []);

  const getParam = useCallback(
    (key: string): string => {
      return searchParams.get(key) || config[key]?.defaultValue || '';
    },
    [searchParams, config]
  );

  const setParam = useCallback(
    (key: string, value: string) => {
      pendingRef.current[key] = value;
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const setParams = useCallback(
    (newParams: Record<string, string>) => {
      Object.assign(pendingRef.current, newParams);
      scheduleFlush();
    },
    [scheduleFlush]
  );

  const clearParams = useCallback(() => {
    for (const key of Object.keys(config)) {
      pendingRef.current[key] = config[key].defaultValue;
    }
    scheduleFlush();
  }, [config, scheduleFlush]);

  return { getParam, setParam, setParams, clearParams, params };
}
