// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
// Modified to support cookie consent

/// <reference lib="dom" />

import type { ClientModule } from "@docusaurus/types";

import { ApplicationInsights } from "@microsoft/applicationinsights-web";

import { hasAnalyticsConsent } from "../utils/analytics-consent";

interface GlobalWindow extends Window {
  appInsights?: ApplicationInsights;
  appInsightsPluginConfig?: {
    config: Record<string, unknown>;
    enableClickAnalytics?: boolean;
  };
  initializeAnalytics?: () => void;
}

let appInsights: ApplicationInsights;

// Function to initialize Application Insights
function initializeAppInsights() {
  if (typeof window === "undefined") return;

  const typedWindow = window as unknown as GlobalWindow;
  const pluginConfig = typedWindow.appInsightsPluginConfig;

  if (!pluginConfig || appInsights) return; // Already initialized or no config

  try {
    appInsights = new ApplicationInsights({
      config: pluginConfig.config,
    });

    appInsights.loadAppInsights();

    // Make appInsights globally available
    typedWindow.appInsights = appInsights;

    // Track initial page view
    appInsights.trackPageView({
      name: window.location.pathname + window.location.search,
    });
  } catch {
    // Silent error handling for production
  }
}

// Make the initialization function globally available
if (typeof window !== "undefined") {
  const globalWindow = window as unknown as GlobalWindow;
  globalWindow.initializeAnalytics = initializeAppInsights;
}

if (typeof window !== "undefined") {
  const typedWindow = window as unknown as GlobalWindow;
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

        typedWindow.appInsights = appInsights;

        // Track initial page view
        appInsights.trackPageView({
          name: window.location.pathname + window.location.search,
        });
      } catch {
        // Silent error handling for production
      }
    } else {
      // User has not consented - don't initialize Application Insights at all
      // This prevents any cookies from being created
      typedWindow.appInsights = undefined;
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
        } catch {
          // Silent error handling for production
        }
      }
    }
  },
};

export default clientModule;
