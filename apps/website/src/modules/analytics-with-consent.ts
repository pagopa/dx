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
  appInsights?: ApplicationInsights;
}

interface GlobalWindow extends Window {
  initializeAnalytics?: () => void;
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

    // Make appInsights globally available
    const globalWindow = window as any;
    globalWindow.appInsights = appInsights;

    // Track initial page view
    appInsights.trackPageView({
      name: window.location.pathname + window.location.search,
    });
  } catch {
    // Silent error handling for production
  }
}

// Make the initialization function globally available
interface GlobalWindow extends Window {
  initializeAnalytics?: () => void;
}

if (typeof window !== "undefined") {
  const globalWindow = window as GlobalWindow;
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

        const globalWindow = window as any;
        globalWindow.appInsights = appInsights;

        // Only track page view if user has consented
        try {
          appInsights.trackPageView({
            name: window.location.pathname + window.location.search,
          });
        } catch (error) {
          // eslint-disable-next-line no-console
          console.error("❌ Error tracking initial page view:", error);
        }
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error("❌ Error initializing Application Insights:", error);
      }
    } else {
      // User has not consented - don't initialize Application Insights at all
      // This prevents any cookies from being created
      const globalWindow = window as any;
      globalWindow.appInsights = null;
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
