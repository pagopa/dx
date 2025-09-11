// Custom Docusaurus plugin wrapper for Application Insights with cookie consent
import type { LoadContext, Plugin } from "@docusaurus/types";

import { resolve } from "node:path";

export interface PluginOptions {
  config: {
    [key: string]: unknown;
    connectionString?: string;
    disableTelemetry?: boolean;
    instrumentationKey?: string;
  };
  enableClickAnalytics?: boolean;
}

export default function pluginApplicationInsightsWithConsent(
  _context: LoadContext,
  options: PluginOptions,
): Plugin {
  const isProd = process.env.NODE_ENV === "production";
  // Only enable analytics in production or when explicitly enabled for testing
  const enableAnalytics = isProd || process.env.ENABLE_ANALYTICS_DEV === "true";

  return {
    getClientModules() {
      const modules = enableAnalytics
        ? [resolve(__dirname, "../modules/analytics-with-consent")]
        : [];
      return modules;
    },

    injectHtmlTags() {
      if (!enableAnalytics) {
        return {};
      }

      const configJson = JSON.stringify(options);
      
      return {
        headTags: [
          {
            innerHTML: `window.appInsightsPluginConfig = ${configJson};`,
            tagName: "script",
          },
        ],
      };
    },

    name: "docusaurus-plugin-application-insights-with-consent",
  };
}
