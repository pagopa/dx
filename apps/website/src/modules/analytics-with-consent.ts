// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
// Modified to support cookie consent

/// <reference lib="dom" />

import type { ClientModule } from "@docusaurus/types";

import { ApplicationInsights } from "@microsoft/applicationinsights-web";

import { hasAnalyticsConsent } from "../utils/analytics-consent";

interface WindowWithAppInsights extends Window {
  appInsightsPluginConfig?: {
    config: Record<string, unknown>;
    enableClickAnalytics?: boolean;
  };
}

let appInsights: ApplicationInsights;

// Function to initialize Application Insights
function initializeAppInsights() {
  if (typeof window === "undefined") return;
  
  const typedWindow = window as WindowWithAppInsights;
  const pluginConfig = typedWindow.appInsightsPluginConfig;
  
  if (!pluginConfig || appInsights) return; // Already initialized or no config
  
  try {
    appInsights = new ApplicationInsights({
      config: pluginConfig.config,
    });

    appInsights.loadAppInsights();

    // Make appInsights globally available for debugging
    const globalWindow = window as any;
    globalWindow.appInsights = appInsights;

    // Add test function for manual testing
    globalWindow.testAnalytics = () => {
      try {
        appInsights.trackEvent({
          name: "Manual_Test_Event",
          properties: {
            testType: "manual_console_test",
            timestamp: new Date().toISOString(),
            url: window.location.href,
            userAgent: navigator.userAgent,
          },
        });

        // Also send a page view for good measure
        appInsights.trackPageView({
          name: "Test_Page_View",
          properties: {
            test: true,
            timestamp: new Date().toISOString(),
          },
        });

        console.log("✅ Test analytics events sent successfully");
      } catch (error) {
        console.error("❌ Error sending test event:", error);
      }
    };

    // Track initial page view
    try {
      appInsights.trackPageView({
        name: window.location.pathname + window.location.search,
      });
    } catch (error) {
      console.error("❌ Error tracking initial page view:", error);
    }
  } catch (error) {
    console.error("❌ Error initializing Application Insights:", error);
  }
}

// Make the initialization function globally available
if (typeof window !== "undefined") {
  const globalWindow = window as any;
  globalWindow.initializeAnalytics = initializeAppInsights;
}

if (typeof window !== "undefined") {
  const typedWindow = window as WindowWithAppInsights;
  const pluginConfig = typedWindow.appInsightsPluginConfig;

  if (pluginConfig) {
    // Check if user has consented to analytics
    const hasConsent = hasAnalyticsConsent();

    // Only initialize Application Insights if user has consented
    if (hasConsent) {
      // Ensure telemetry is enabled for consenting users
      pluginConfig.config.disableTelemetry = false;

      try {
        appInsights = new ApplicationInsights({
          config: pluginConfig.config,
        });

        appInsights.loadAppInsights();

        // Make appInsights globally available for debugging
        const globalWindow = window as any;
        globalWindow.appInsights = appInsights;

        // Add test function for manual testing
        globalWindow.testAnalytics = () => {
          try {
            appInsights.trackEvent({
              name: "Manual_Test_Event",
              properties: {
                testType: "manual_console_test",
                timestamp: new Date().toISOString(),
                url: window.location.href,
                userAgent: navigator.userAgent,
              },
            });

            // Also send a page view for good measure
            appInsights.trackPageView({
              name: "Test_Page_View",
              properties: {
                test: true,
                timestamp: new Date().toISOString(),
              },
            });

            // eslint-disable-next-line no-console
            console.log("✅ Test analytics events sent successfully");
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("❌ Error sending test event:", error);
          }
        };

        // Add function to test cookie deletion
        globalWindow.testCookieDeletion = async () => {
          // eslint-disable-next-line no-console
          console.log("🍪 Current cookies before deletion:", document.cookie);
          try {
            const { disableAnalytics } = await import("../utils/analytics-consent");
            disableAnalytics();
            // eslint-disable-next-line no-console
            console.log("🍪 Current cookies after deletion:", document.cookie);
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("❌ Error importing analytics utils:", error);
          }
        };

        // Add function to test search tracking
        globalWindow.testSearchTracking = (query = "test search query") => {
          try {
            appInsights.trackEvent({
              name: "Search_Event",
              properties: {
                hasResults: true,
                pathname: window.location.pathname,
                query,
                queryLength: query.length,
                resultCount: 3,
                resultTitles: [
                  "Git Configuration",
                  "API Documentation",
                  "Getting Started Guide",
                ],
                searchType: "manual_test",
                timestamp: new Date().toISOString(),
                url: window.location.href,
              },
            });

            // eslint-disable-next-line no-console
            console.log("✅ Test search tracking event sent successfully");
          } catch (error) {
            // eslint-disable-next-line no-console
            console.error("❌ Error sending test search event:", error);
          }
        };

        // Add function to debug search input detection
        globalWindow.debugSearchInput = () => {
          const selectors = [
            'input[type="text"][placeholder*="Search"]',
            'input[name="q"]',
            ".DocSearch-Input",
            '[class*="searchBox"] input',
            'input[placeholder*="search"]',
            ".navbar__search-input",
            'input[class*="searchInput"]',
            'input[aria-label="Search"]',
          ];

          // eslint-disable-next-line no-console
          console.log("🔍 Debugging search input detection:");

          selectors.forEach((selector) => {
            const elements = document.querySelectorAll(selector);
            // eslint-disable-next-line no-console
            console.log(
              `Selector "${selector}": ${elements.length} elements found`,
              elements,
            );
          });

          // Check specifically for the navbar search input
          const navbarInput = document.querySelector(".navbar__search-input");
          if (navbarInput) {
            // eslint-disable-next-line no-console
            console.log("✅ Found navbar search input:", navbarInput);
            // eslint-disable-next-line no-console
            console.log(
              "Current value:",
              (navbarInput as HTMLInputElement).value,
            );
          } else {
            // eslint-disable-next-line no-console
            console.log("❌ Navbar search input not found");
          }
        };

        // Add function to debug search results detection
        globalWindow.debugSearchResults = () => {
          // eslint-disable-next-line no-console
          console.log("🔍 Debugging search results detection:");

          // Check for results containers
          const containerSelectors = [
            '[role="listbox"]',
            '[class*="dropdownMenu"]',
            '[class*="DocSearch-Dropdown"]',
            '[id*="listbox"]',
          ];

          containerSelectors.forEach((selector) => {
            const containers = document.querySelectorAll(selector);
            // eslint-disable-next-line no-console
            console.log(
              `Container "${selector}": ${containers.length} found`,
              containers,
            );

            containers.forEach((container, index) => {
              const results = container.querySelectorAll('[role="option"]');
              // eslint-disable-next-line no-console
              console.log(
                `Container ${index + 1} has ${results.length} results:`,
                results,
              );

              results.forEach((result, resultIndex) => {
                const titleEl = result.querySelector(
                  '[class*="hitTitle"], .hitTitle_ss18',
                );
                const pathEl = result.querySelector(
                  '[class*="hitPath"], .hitPath_KtrR',
                );
                const title = titleEl?.textContent?.trim();
                const path = pathEl?.textContent?.trim();
                // eslint-disable-next-line no-console
                console.log(`Result ${resultIndex + 1}:`, {
                  element: result,
                  extractedTitle: path || title, // What we actually use as title
                  path: pathEl?.textContent?.trim(),
                  rawTitle: title,
                });
              });
            });
          });
        };

        // Only track page view if user has consented
        try {
          appInsights.trackPageView({
            name: window.location.pathname + window.location.search,
          });
        } catch (error) {
          console.error("❌ Error tracking initial page view:", error);
        }
      } catch (error) {
        console.error("❌ Error initializing Application Insights:", error);
      }
    } else {
      // User has not consented - don't initialize Application Insights at all
      // This prevents any cookies from being created
      const globalWindow = window as any;
      globalWindow.appInsights = null;
      globalWindow.testAnalytics = () => {
        console.warn("⚠️ Analytics not initialized - user has not consented to analytics cookies");
      };
    }
  }
}

const clientModule: ClientModule = {
  onRouteDidUpdate({ location, previousLocation }) {
    if (
      previousLocation &&
      (location.pathname !== previousLocation.pathname ||
        location.search !== previousLocation.search ||
        location.hash !== previousLocation.hash)
    ) {
      const hasConsent = hasAnalyticsConsent();

      // Only track if Application Insights is initialized and user has consented
      if (appInsights && hasConsent) {
        const pageName = location.pathname + location.search;

        try {
          appInsights.trackPageView({
            name: pageName,
          });
        } catch (error) {
          console.error("❌ Error tracking page view:", error);
        }
      }
    }
  },
};

export default clientModule;
