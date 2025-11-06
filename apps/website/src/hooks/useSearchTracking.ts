import { useEffect, useRef } from "react";

import { hasAnalyticsConsent } from "../utils/analytics-consent";

declare global {
  interface Window {
    appInsights?: {
      trackEvent: (event: {
        name: string;
        properties: Record<string, unknown>;
      }) => void;
    };
  }
}

const MIN_QUERY_LENGTH = 2;
const INPUT_DEBOUNCE_MS = 1500;

// Track search queries with analytics
const trackSearchEvent = (
  query: string,
  searchType: "input" | "submit",
): void => {
  if (!hasAnalyticsConsent() || !window.appInsights) {
    return;
  }

  const trimmedQuery = query.trim();
  if (trimmedQuery.length < MIN_QUERY_LENGTH) {
    return;
  }

  try {
    window.appInsights.trackEvent({
      name: "Search_Event",
      properties: {
        query: trimmedQuery,
        searchType,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Silently fail if tracking fails
  }
};

/**
 * Hook to track search input events on Docusaurus search bar.
 *
 * Since Docusaurus controls the search component, we attach DOM event listeners
 * to track user search behavior with debouncing to avoid multiple events.
 */
export const useSearchTracking = (): void => {
  const debounceTimerRef = useRef<NodeJS.Timeout>();
  const lastTrackedQueryRef = useRef<string>("");

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleInput = (event: Event): void => {
      const input = event.target as HTMLInputElement;
      const query = input.value?.trim();

      if (!query || query.length < MIN_QUERY_LENGTH) {
        return;
      }

      // Clear existing timer and set new one for debouncing
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        // Only track if query has changed
        if (query !== lastTrackedQueryRef.current) {
          trackSearchEvent(query, "input");
          lastTrackedQueryRef.current = query;
        }
      }, INPUT_DEBOUNCE_MS);
    };

    const handleSubmit = (event: Event): void => {
      const form = event.target as HTMLFormElement;
      const input = form.querySelector<HTMLInputElement>(
        '.DocSearch-Input, input[type="search"], input[aria-label*="Search"]',
      );

      if (!input?.value) {
        return;
      }

      const query = input.value.trim();
      if (query.length < MIN_QUERY_LENGTH) {
        return;
      }

      // Clear debounce timer and track immediately on submit
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      trackSearchEvent(query, "submit");
      lastTrackedQueryRef.current = query;
    };

    const attachListeners = (): (() => void) => {
      // Find all Docusaurus search inputs
      const searchInputs = document.querySelectorAll<HTMLInputElement>(
        '.DocSearch-Input, input[type="search"], input[aria-label*="Search"]',
      );

      // Find all search forms
      const searchForms = document.querySelectorAll<HTMLFormElement>(
        'form[role="search"], .DocSearch-Form',
      );

      searchInputs.forEach((searchInput) => {
        console.log("Attaching input listener to search input:", searchInput);
        searchInput.addEventListener("input", handleInput);
      });

      searchForms.forEach((searchForm) => {
        searchForm.addEventListener("submit", handleSubmit);
      });

      // Cleanup function
      return () => {
        searchInputs.forEach((searchInput) => {
          searchInput.removeEventListener("input", handleInput);
        });
        searchForms.forEach((searchForm) => {
          searchForm.removeEventListener("submit", handleSubmit);
        });
      };
    };

    // Initial attachment
    const cleanup = attachListeners();

    // Re-attach on route changes (Docusaurus SPA navigation)
    const handleRouteChange = (): void => {
      setTimeout(attachListeners, 100);
    };

    window.addEventListener("popstate", handleRouteChange);

    return () => {
      cleanup();
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);
};
