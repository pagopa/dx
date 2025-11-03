import { useEffect } from "react";

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

// Function to track search queries with results
const trackSearchEvent = (
  query: string,
  searchType: "input" | "results" | "submit" = "input",
  resultCount?: number,
  resultTitles?: string[],
) => {
  // Only track if user has consented to analytics
  if (!hasAnalyticsConsent() || !window.appInsights) {
    return;
  }

  try {
    // Don't track empty queries or very short queries (< 2 characters)
    if (!query || query.trim().length < 2) {
      return;
    }

    window.appInsights.trackEvent({
      name: "Search_Event",
      properties: {
        hasResults: resultCount !== undefined ? resultCount > 0 : undefined,
        pathname: window.location.pathname,
        query: query.trim(),
        queryLength: query.trim().length,
        resultCount: resultCount ?? undefined,
        resultTitles: resultTitles ?? undefined,
        searchType,
        timestamp: new Date().toISOString(),
        url: window.location.href,
      },
    });
  } catch {
    // Silent error handling for production
  }
};

// Function to observe search results - this is our PRIMARY tracking method
// Works for both header search bar dropdowns and dedicated search page results
const observeSearchResults = (clearPendingTimeout: () => void) => {
  // Look for the search results container - include both header search dropdown and search page
  const resultsContainer = document.querySelector(
    '[class*="searchResultsColumn"], [class*="search-result"], .search-results, [class*="DocSearch-Dropdown"], [class*="aa-dropdown"], [class*="searchBox"] + div, .DocSearch-Dropdown-Container, [id*="listbox"], [role="listbox"], [class*="searchDropdown"], [class*="dropdownMenu"]',
  );

  if (resultsContainer) {
    // Debounce results tracking to avoid tracking on every keystroke
    let resultsTimeout: NodeJS.Timeout;
    let lastTrackedQuery = "";

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
          // Try to get the current search query from the input - include header search and page search
          const searchInput = document.querySelector(
            'input[type="text"][placeholder*="Search"], input[name="q"], .DocSearch-Input, [class*="searchBox"] input, input[placeholder*="search"], .navbar__search-input, input[class*="searchInput"], input[aria-label="Search"]',
          ) as HTMLInputElement;

          if (
            searchInput &&
            searchInput.value &&
            searchInput.value.trim().length >= 2
          ) {
            const currentQuery = searchInput.value.trim();

            // Clear previous timeout
            clearTimeout(resultsTimeout);

            // Debounce the results tracking
            resultsTimeout = setTimeout(() => {
              // Only track if query has changed or this is a new search
              if (currentQuery !== lastTrackedQuery) {
                // Count the search results - include various result containers
                const results = resultsContainer.querySelectorAll(
                  '[class*="searchResult"], .search-result-item, li, .DocSearch-Hit, [class*="aa-suggestion"], [class*="searchResultItem"], [role="option"], [class*="suggestion"]',
                );

                // Only track if there are actually results
                if (results.length > 0) {
                  // Extract result data
                  const searchResults = extractSearchResults(resultsContainer);

                  // Clear any pending debounced tracking since we have real results now
                  clearPendingTimeout();

                  // Track search with results - this is the MAIN tracking event
                  trackSearchEvent(
                    currentQuery,
                    "results",
                    results.length,
                    searchResults,
                  );

                  // Remember the last tracked query
                  lastTrackedQuery = currentQuery;
                }
              }
            }, 500); // Wait 500ms for results to stabilize
          }
        }
      });
    });

    observer.observe(resultsContainer, {
      childList: true,
      subtree: true,
    });

    // Cleanup function
    return () => {
      clearTimeout(resultsTimeout);
      observer.disconnect();
    };
  }

  // If no specific results container found, observe document body for dynamic dropdowns
  // This catches cases where search dropdowns are created dynamically (like DocSearch)
  let documentResultsTimeout: NodeJS.Timeout;
  let lastDocumentTrackedQuery = "";

  const documentObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        // Check if a search dropdown was just added
        const newDropdown = Array.from(mutation.addedNodes).find((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            return (
              element.matches &&
              element.matches(
                '[class*="DocSearch-Dropdown"], [class*="aa-dropdown"], [class*="search-dropdown"], [id*="listbox"], [role="listbox"], [class*="searchDropdown"], [class*="dropdownMenu"]',
              )
            );
          }
          return false;
        }) as Element;

        if (newDropdown) {
          // Search dropdown appeared, try to track the current query
          const searchInput = document.querySelector(
            'input[type="text"][placeholder*="Search"], input[name="q"], .DocSearch-Input, [class*="searchBox"] input, input[placeholder*="search"], .navbar__search-input, input[class*="searchInput"], input[aria-label="Search"]',
          ) as HTMLInputElement;

          if (
            searchInput &&
            searchInput.value &&
            searchInput.value.trim().length >= 2
          ) {
            const currentQuery = searchInput.value.trim();

            // Clear previous timeout
            clearTimeout(documentResultsTimeout);

            // Debounce the results tracking
            documentResultsTimeout = setTimeout(() => {
              // Only track if query has changed or this is a new search
              if (currentQuery !== lastDocumentTrackedQuery) {
                // Count results in the new dropdown and extract their data
                const resultElements = newDropdown.querySelectorAll(
                  '[class*="searchResult"], .search-result-item, li, .DocSearch-Hit, [class*="aa-suggestion"], [class*="searchResultItem"], [role="option"], [class*="suggestion"]',
                );

                // Only track if there are actually results
                if (resultElements.length > 0) {
                  // Extract result data
                  const searchResultTitles = extractSearchResults(newDropdown);

                  clearPendingTimeout();
                  trackSearchEvent(
                    currentQuery,
                    "results",
                    resultElements.length,
                    searchResultTitles,
                  );

                  // Remember the last tracked query
                  lastDocumentTrackedQuery = currentQuery;
                }
              }
            }, 500); // Wait 500ms for results to stabilize
          }
        }
      }
    });
  });

  // Observe the document body for dynamic dropdowns
  documentObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    clearTimeout(documentResultsTimeout);
    documentObserver.disconnect();
  };
};

// Function to extract Docusaurus search results (no direct links)
const extractDocusaurusResults = (resultsContainer: Element): string[] => {
  const titles: string[] = [];
  const docusaurusResults =
    resultsContainer.querySelectorAll('[role="option"]');

  for (const result of Array.from(docusaurusResults)) {
    const element = result as Element;

    // Extract title and path
    const titleEl = element.querySelector(
      '[class*="hitTitle"], .hitTitle_ss18',
    );
    const pathEl = element.querySelector('[class*="hitPath"], .hitPath_KtrR');

    let title = "";
    let path = "";

    if (titleEl) {
      title = titleEl.textContent?.trim() || "";
      title = title.replace(/^…|…$/g, "").replace(/\s+/g, " ").trim();
    }

    if (pathEl) {
      path = pathEl.textContent?.trim() || "";
    }

    // Use path as title since it's more descriptive (page name)
    const displayTitle = path || title;
    if (displayTitle) {
      titles.push(displayTitle);
    }
  }

  return titles;
};

// Function to extract search results with direct links
const extractLinkedResults = (resultsContainer: Element): string[] => {
  const titles: string[] = [];
  const resultSelectors = [
    ".DocSearch-Hit a, .DocSearch-Hit-Container a",
    '[class*="searchResult"] a, [class*="searchResultItem"] a',
    '.search-result-item a, [role="option"] a',
    "li a[href]",
  ];

  for (const selector of resultSelectors) {
    const links = resultsContainer.querySelectorAll(selector);

    for (const link of Array.from(links)) {
      const element = link as HTMLAnchorElement;
      const href = element.href;

      // Check for safe URL schemes only
      const isSafeUrl =
        href &&
        (href.startsWith("http://") ||
          href.startsWith("https://") ||
          href.startsWith("/") ||
          href.startsWith("./") ||
          href.startsWith("../") ||
          href.startsWith("#"));

      if (isSafeUrl) {
        let title = element.textContent?.trim() || "";

        if (!title) {
          const parent = element.closest(
            '[class*="searchResult"], .DocSearch-Hit, .search-result-item, li',
          );
          if (parent) {
            const titleEl = parent.querySelector(
              '[class*="title"], h1, h2, h3, h4, h5, h6, .DocSearch-Hit-title',
            );
            title = titleEl?.textContent?.trim() || "";
          }
        }

        if (!title) {
          title = href;
        }

        title = title.replace(/\s+/g, " ").trim();

        if (title) {
          titles.push(title);
        }
      }
    }

    if (titles.length > 0) {
      break;
    }
  }

  return titles;
};

// Function to extract search result data from DOM elements
const extractSearchResults = (resultsContainer: Element): string[] => {
  // First try Docusaurus-style results (no direct links)
  const docusaurusResults = extractDocusaurusResults(resultsContainer);
  if (docusaurusResults.length > 0) {
    return docusaurusResults;
  }

  // Fallback to results with direct links
  return extractLinkedResults(resultsContainer);
};

export function useSearchTracking() {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    // Search timeout for cleanup
    let searchTimeout: NodeJS.Timeout;
    let lastInputTrackedQuery = "";

    // Debounced tracking for input (fallback when mutation observers don't catch everything)
    const debouncedTrackSearch = (query: string) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        // Only track if query has changed to avoid duplicates
        if (query !== lastInputTrackedQuery) {
          trackSearchEvent(query, "input");
          lastInputTrackedQuery = query;
        }
      }, 1500); // 1.5 second delay - balances responsiveness with avoiding keystroke tracking
    };

    // Track search input changes (with proper debouncing)
    const handleSearchInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.value && target.value.trim().length >= 2) {
        // Use debounced tracking as fallback
        debouncedTrackSearch(target.value);
      }
    };

    // Track search form submissions
    const handleSearchSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const input = form.querySelector(
        'input[type="text"], input[name="q"], input[placeholder*="Search"], .DocSearch-Input, input[placeholder*="search"], .navbar__search-input, input[class*="searchInput"], input[aria-label="Search"]',
      ) as HTMLInputElement;

      if (input && input.value) {
        // Clear any pending debounced calls since this is an explicit submit
        clearTimeout(searchTimeout);
        trackSearchEvent(input.value, "submit");
      }
    };

    // Add event listeners for search inputs
    const addSearchListeners = () => {
      // Find search inputs - include header search bar and page search
      const searchInputs = document.querySelectorAll(
        'input[type="text"][placeholder*="Search"], input[name="q"], input[placeholder*="search"], [class*="searchBox"] input, .DocSearch-Input, input[class*="DocSearch"], input[aria-label*="search"], .navbar__search-input, input[class*="searchInput"]',
      );

      searchInputs.forEach((input) => {
        input.addEventListener("input", handleSearchInput);
      });

      // Find search forms - include header and page search forms
      const searchForms = document.querySelectorAll(
        'form[role="search"], form[class*="search"], form:has(input[placeholder*="Search"]), form:has(.DocSearch-Input), [class*="DocSearch-Form"]',
      );

      searchForms.forEach((form) => {
        form.addEventListener("submit", handleSearchSubmit);
      });

      // Cleanup function
      return () => {
        searchInputs.forEach((input) => {
          input.removeEventListener("input", handleSearchInput);
        });
        searchForms.forEach((form) => {
          form.removeEventListener("submit", handleSearchSubmit);
        });
      };
    };

    // Clear timeout function to share between components
    const clearPendingTimeout = () => {
      clearTimeout(searchTimeout);
    };

    // Initialize tracking with delay to ensure search components are rendered
    const searchCleanup = addSearchListeners();
    const resultsCleanup = observeSearchResults(clearPendingTimeout);

    // Also re-initialize when route changes (for SPA navigation)
    const handleRouteChange = () => {
      setTimeout(() => {
        addSearchListeners();
      }, 500);
    };

    // Listen for route changes
    window.addEventListener("popstate", handleRouteChange);

    // Cleanup function
    return () => {
      if (searchCleanup) {
        searchCleanup();
      }
      if (resultsCleanup) {
        resultsCleanup();
      }
      clearTimeout(searchTimeout);
      window.removeEventListener("popstate", handleRouteChange);
    };
  }, []);
}
