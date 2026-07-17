"use client";

import { createContext, useCallback, useContext, useRef, useState } from "react";

interface CrawlLockValue {
  /** True while any crawl is running anywhere in the admin panel. */
  isCrawling: boolean;
  /**
   * Run a crawl with the global lock held. Crawls are serialized: if one is
   * already running, the function is NOT called and `null` is returned, so the
   * shared Cloudflare rate limit is never split between concurrent crawls.
   * Sets `isCrawling` true for the duration and clears it when the promise
   * settles — even if the component that started it unmounts (e.g. the admin
   * navigates to another tab), because the lock state lives in the admin
   * layout, not the calling page.
   */
  withCrawlLock: <T>(fn: () => Promise<T>) => Promise<T | null>;
}

const CrawlLockContext = createContext<CrawlLockValue | null>(null);

export function CrawlLockProvider({ children }: { children: React.ReactNode }) {
  const [isCrawling, setIsCrawling] = useState(false);
  // Ref, not state: the guard must be synchronous so two clicks in the same
  // tick can't both pass before React re-renders.
  const lockRef = useRef(false);

  const withCrawlLock = useCallback(
    async <T,>(fn: () => Promise<T>): Promise<T | null> => {
      if (lockRef.current) return null;
      lockRef.current = true;
      setIsCrawling(true);
      try {
        return await fn();
      } finally {
        lockRef.current = false;
        setIsCrawling(false);
      }
    },
    []
  );

  return (
    <CrawlLockContext.Provider value={{ isCrawling, withCrawlLock }}>
      {children}
    </CrawlLockContext.Provider>
  );
}

export function useCrawlLock(): CrawlLockValue {
  const ctx = useContext(CrawlLockContext);
  if (!ctx) {
    throw new Error("useCrawlLock must be used within a CrawlLockProvider");
  }
  return ctx;
}
