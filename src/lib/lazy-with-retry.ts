import { lazy, type ComponentType } from "react";

const RELOAD_KEY = "lovable:chunk-reloaded";

/**
 * Lazy loader resilient to stale chunk references after a new deploy.
 * Retries once, then forces a single full reload to fetch the new manifest.
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) {
  return lazy(async () => {
    try {
      const mod = await factory();
      sessionStorage.removeItem(RELOAD_KEY);
      return mod;
    } catch (error) {
      try {
        // Second attempt: transient network hiccup.
        const mod = await factory();
        sessionStorage.removeItem(RELOAD_KEY);
        return mod;
      } catch (err) {
        const alreadyReloaded = sessionStorage.getItem(RELOAD_KEY) === "1";
        if (!alreadyReloaded) {
          sessionStorage.setItem(RELOAD_KEY, "1");
          window.location.reload();
          // Never resolves; the page is reloading.
          return new Promise<{ default: T }>(() => {});
        }
        throw err;
      }
    }
  });
}
