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

          console.log("✅ Test analytics events sent successfully");
        } catch (error) {
          console.error("❌ Error sending test event:", error);
        }
      };
      
      // Add function to test cookie deletion
      globalWindow.testCookieDeletion = () => {
        console.log("🍪 Current cookies before deletion:", document.cookie);
        const { disableAnalytics } = require("../utils/analytics-consent");
        disableAnalytics();
        console.log("🍪 Current cookies after deletion:", document.cookie);
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
