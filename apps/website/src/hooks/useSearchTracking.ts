import { useCallback, useEffect } from "react";

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
  searchType: string,
  resultCount?: number,
  resultTitles?: string[],
) => {
  // Check if analytics tracking is enabled
  if (!hasAnalyticsConsent()) {
    return;
  }

  if (!window.appInsights) {
    return;
  }

  // Only track for queries with at least 2 characters
  if (!query || query.trim().length < 2) {
    return;
  }

  try {
    window.appInsights.trackEvent({
      name: "Search_Event",
      properties: {
        query: query.trim(),
        resultCount: resultCount || 0,
        resultTitles: resultTitles || [],
        searchType,
        timestamp: new Date().toISOString(),
      },
    });
  } catch {
    // Silently fail if tracking fails
  }
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

// Helper function to create results container observer
const createResultsObserver = (
  resultsContainer: Element,
  clearPendingTimeout: () => void,
) => {
  let resultsTimeout: NodeJS.Timeout;
  let lastTrackedQuery = "";

  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const searchInput = document.querySelector(
          'input[type="text"][placeholder*="Search"], input[name="q"], .DocSearch-Input, [class*="searchBox"] input, input[placeholder*="search"], .navbar__search-input, input[class*="searchInput"], input[aria-label="Search"]',
        ) as HTMLInputElement;

        if (
          searchInput &&
          searchInput.value &&
          searchInput.value.trim().length >= 2
        ) {
          const currentQuery = searchInput.value.trim();
          clearTimeout(resultsTimeout);

          resultsTimeout = setTimeout(() => {
            if (currentQuery !== lastTrackedQuery) {
              const results = resultsContainer.querySelectorAll(
                '[class*="searchResult"], .search-result-item, li, .DocSearch-Hit, [class*="aa-suggestion"], [class*="searchResultItem"], [role="option"], [class*="suggestion"]',
              );

              if (results.length > 0) {
                const searchResults = extractSearchResults(resultsContainer);
                clearPendingTimeout();
                trackSearchEvent(
                  currentQuery,
                  "results",
                  results.length,
                  searchResults,
                );
                lastTrackedQuery = currentQuery;
              }
            }
          }, 500);
        }
      }
    });
  });

  observer.observe(resultsContainer, {
    childList: true,
    subtree: true,
  });

  return () => {
    clearTimeout(resultsTimeout);
    observer.disconnect();
  };
};

// Helper function to create dynamic dropdown observer
const createDynamicDropdownObserver = (clearPendingTimeout: () => void) => {
  let documentResultsTimeout: NodeJS.Timeout;
  let lastDocumentTrackedQuery = "";

  const documentObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === "childList" && mutation.addedNodes.length > 0) {
        const newDropdown = Array.from(mutation.addedNodes).find((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            return (
              element.matches &&
              element.matches(
                '[class*="DocSearch-Dropdown"], [class*="aa-dropdown"], [class*="search-dropdown"], [id*="listbox"], [role="listbox"], [class*="searchDropdown"], [class*="dropdownMenu"], .dropdownMenu_XBat, [id^="searchBar_"], [class*="searchBar"]',
              )
            );
          }
          return false;
        }) as Element;

        if (newDropdown) {
          const dropdownObserver = new MutationObserver((dropdownMutations) => {
            dropdownMutations.forEach((mutation) => {
              if (
                mutation.type === "childList" ||
                mutation.type === "attributes"
              ) {
                const searchInput = document.querySelector(
                  'input[type="text"][placeholder*="Search"], input[name="q"], .DocSearch-Input, [class*="searchBox"] input, input[placeholder*="search"], .navbar__search-input, input[class*="searchInput"], input[aria-label="Search"]',
                ) as HTMLInputElement;

                if (
                  searchInput &&
                  searchInput.value &&
                  searchInput.value.trim().length >= 2
                ) {
                  const currentQuery = searchInput.value.trim();
                  clearTimeout(documentResultsTimeout);

                  documentResultsTimeout = setTimeout(() => {
                    if (currentQuery !== lastDocumentTrackedQuery) {
                      const resultElements = newDropdown.querySelectorAll(
                        '[class*="searchResult"], .search-result-item, li, .DocSearch-Hit, [class*="aa-suggestion"], [class*="searchResultItem"], [role="option"], [class*="suggestion"]',
                      );

                      if (resultElements.length > 0) {
                        const searchResultTitles =
                          extractSearchResults(newDropdown);
                        clearPendingTimeout();
                        trackSearchEvent(
                          currentQuery,
                          "results",
                          resultElements.length,
                          searchResultTitles,
                        );
                        lastDocumentTrackedQuery = currentQuery;
                      }
                    }
                  }, 300);
                }
              }
            });
          });

          dropdownObserver.observe(newDropdown, {
            attributeFilter: ["style", "class"],
            attributes: true,
            childList: true,
            subtree: true,
          });
        }
      }
    });
  });

  documentObserver.observe(document.body, {
    childList: true,
    subtree: true,
  });

  return () => {
    clearTimeout(documentResultsTimeout);
    documentObserver.disconnect();
  };
};

export const useSearchTracking = () => {
  const observeSearchResults = useCallback(
    (clearPendingTimeout: () => void) => {
      // Look for the search results container
      const resultsContainer = document.querySelector(
        '[class*="searchResultsColumn"], [class*="search-result"], .search-results, [class*="DocSearch-Dropdown"], [class*="aa-dropdown"], [class*="searchBox"] + div, .DocSearch-Dropdown-Container, [id*="listbox"], [role="listbox"], [class*="searchDropdown"], [class*="dropdownMenu"], .dropdownMenu_XBat, [id^="searchBar_"]',
      );

      if (resultsContainer) {
        return createResultsObserver(resultsContainer, clearPendingTimeout);
      }

      return createDynamicDropdownObserver(clearPendingTimeout);
    },
    [],
  );

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    let searchTimeout: NodeJS.Timeout;
    let lastInputTrackedQuery = "";

    const debouncedTrackSearch = (query: string) => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        if (query !== lastInputTrackedQuery) {
          trackSearchEvent(query, "input");
          lastInputTrackedQuery = query;
        }
      }, 1500);
    };

    const handleSearchInput = (event: Event) => {
      const target = event.target as HTMLInputElement;
      if (target && target.value && target.value.trim().length >= 2) {
        debouncedTrackSearch(target.value);
      }
    };

    const handleSearchSubmit = (event: Event) => {
      const form = event.target as HTMLFormElement;
      const input = form.querySelector(
        'input[type="text"], input[name="q"], input[placeholder*="Search"], .DocSearch-Input, input[placeholder*="search"], .navbar__search-input, input[class*="searchInput"], input[aria-label="Search"]',
      ) as HTMLInputElement;

      if (input && input.value) {
        clearTimeout(searchTimeout);
        trackSearchEvent(input.value, "submit");
      }
    };

    const addSearchListeners = () => {
      const searchInputs = document.querySelectorAll(
        'input[type="text"][placeholder*="Search"], input[name="q"], input[placeholder*="search"], [class*="searchBox"] input, .DocSearch-Input, input[class*="DocSearch"], input[aria-label*="search"], .navbar__search-input, input[class*="searchInput"]',
      );

      searchInputs.forEach((input) => {
        input.addEventListener("input", handleSearchInput);
      });

      const searchForms = document.querySelectorAll(
        'form[role="search"], form[class*="search"], form:has(input[placeholder*="Search"]), form:has(.DocSearch-Input), [class*="DocSearch-Form"]',
      );

      searchForms.forEach((form) => {
        form.addEventListener("submit", handleSearchSubmit);
      });

      return () => {
        searchInputs.forEach((input) => {
          input.removeEventListener("input", handleSearchInput);
        });
        searchForms.forEach((form) => {
          form.removeEventListener("submit", handleSearchSubmit);
        });
      };
    };

    const clearPendingTimeout = () => {
      clearTimeout(searchTimeout);
    };

    const searchCleanup = addSearchListeners();
    const resultsCleanup = observeSearchResults(clearPendingTimeout);

    const handleRouteChange = () => {
      setTimeout(() => {
        addSearchListeners();
      }, 500);
    };

    window.addEventListener("popstate", handleRouteChange);

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
  }, [observeSearchResults]);
};
