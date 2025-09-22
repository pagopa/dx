// Type definitions for Application Insights window objects
interface ApplicationInsightsConfig {
  config: {
    disableTelemetry: boolean;
  };
}

interface ApplicationInsightsInstance {
  config: {
    disableTelemetry: boolean;
  };
  trackEvent: (event: {
    name: string;
    properties: Record<string, unknown>;
  }) => void;
}

interface WindowWithAnalytics extends Window {
  appInsights?: ApplicationInsightsInstance;
  appInsightsPluginConfig?: ApplicationInsightsConfig;
  initializeAnalytics?: () => void;
}

/**
 * Disable analytics tracking by updating the Application Insights configuration
 */
export function disableAnalytics(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const typedWindow = window as unknown as WindowWithAnalytics;

    // Get the Application Insights configuration
    const config = typedWindow.appInsightsPluginConfig;
    if (config) {
      // Disable telemetry
      config.config.disableTelemetry = true;

      // If Application Insights is already loaded, update its configuration
      const appInsights = typedWindow.appInsights;
      if (appInsights) {
        appInsights.config.disableTelemetry = true;
      }
    }

    // Delete Application Insights cookies
    deleteApplicationInsightsCookies();
  } catch {
    // Silently handle errors
  }
}

/**
 * Enable analytics tracking by updating the Application Insights configuration
 */
export function enableAnalytics(): void {
  if (typeof window === "undefined") {
    return;
  }

  try {
    const typedWindow = window as unknown as WindowWithAnalytics;

    // Get the Application Insights configuration
    const config = typedWindow.appInsightsPluginConfig;
    if (config) {
      // Enable telemetry
      config.config.disableTelemetry = false;

      // If Application Insights is already loaded, update its configuration
      const appInsights = typedWindow.appInsights;
      if (appInsights) {
        appInsights.config.disableTelemetry = false;
      }
    }

    // Initialize Application Insights if not already done
    if (typedWindow.initializeAnalytics && !typedWindow.appInsights) {
      typedWindow.initializeAnalytics();
    }
  } catch {
    // Silently handle errors
  }
}

/**
 * Utility to check if analytics cookies are consented to
 */
export function hasAnalyticsConsent(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  try {
    const consent = localStorage.getItem("cookieConsent");

    if (!consent) {
      return false;
    }

    const preferences = JSON.parse(consent);

    return preferences.analytics === true;
  } catch {
    return false;
  }
}

/**
 * Delete Application Insights cookies
 */
function deleteApplicationInsightsCookies(): void {
  if (typeof document === "undefined") {
    return;
  }

  // List of Application Insights cookie names
  const aiCookies = ["ai_user", "ai_session", "ai_authUser"];

  // Get current domain and all possible domain variations
  const hostname = window.location.hostname;
  const domains = [
    hostname,
    `.${hostname}`,
    hostname.startsWith("www.") ? hostname.substring(4) : `www.${hostname}`,
    `.${hostname.startsWith("www.") ? hostname.substring(4) : hostname}`,
  ];

  aiCookies.forEach((cookieName) => {
    domains.forEach((domain) => {
      // Delete cookie for each domain variation
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=${domain};`;
      document.cookie = `${cookieName}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
    });
  });
}
