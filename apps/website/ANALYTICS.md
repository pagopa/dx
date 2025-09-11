# Analytics Implementation

This document describes the analytics implementation for the DX website, ensuring GDPR compliance and respecting user cookie preferences.

## Overview

The website uses Azure Application Insights for analytics tracking, but only after explicit user consent through a cookie consent banner. The implementation is based on the official Microsoft Docusaurus plugin with added cookie consent functionality.

## Implementation Details

### Architecture

1. **Custom Plugin**: A custom Docusaurus plugin (`./src/plugins/analytics-with-consent.ts`) wraps the Application Insights functionality
2. **Client Module**: A custom client module (`./src/modules/analytics-with-consent.ts`) handles the initialization and tracking based on user consent
3. **Cookie Consent**: A React component (`./src/components/CookieConsent.tsx`) manages user preferences
4. **Consent Utilities**: Helper functions (`./src/utils/analytics-consent.ts`) manage consent state and analytics configuration

### Key Features

- **GDPR Compliant**: Analytics only initialize after explicit user consent
- **Dynamic Control**: Users can change their preferences at any time
- **Graceful Degradation**: The site works normally even if analytics fail to load
- **Privacy Focused**: No data is sent to Application Insights without consent

### Configuration

The plugin is configured in `docusaurus.config.ts`:

```typescript
[
  "./src/plugins/analytics-with-consent",
  {
    config: {
      connectionString: process.env.APPLICATIONINSIGHTS_CONNECTION_STRING,
      // ... other Application Insights configuration
    },
    enableClickAnalytics: false,
  },
],
```

### Environment Variables

#### Production
Set these environment variables in your production deployment:
- `APPLICATIONINSIGHTS_CONNECTION_STRING`: The connection string for your Application Insights resource

#### Development
By default, analytics are **disabled in development** to avoid polluting production data.

If you need to test analytics locally, export the environment variables before starting the server:

```bash
# Export environment variables and start the development server
export APPLICATIONINSIGHTS_CONNECTION_STRING="your-connection-string"
export ENABLE_ANALYTICS_DEV=true
pnpm start
```

Or run it in a single command:
```bash
APPLICATIONINSIGHTS_CONNECTION_STRING="your-connection-string" ENABLE_ANALYTICS_DEV=true pnpm start
```

## Cookie Consent Flow

1. **First Visit**: User sees a cookie consent banner with options:
   - "Solo Necessari" (Necessary Only): Accept only essential cookies
   - "Personalizza" (Customize): Open preferences dialog
   - "Accetta Analytics" (Accept Analytics): Accept all cookies including analytics

2. **Preferences Storage**: User preferences are stored in `localStorage` as:
   ```json
   {
     "necessary": true,
     "analytics": boolean
   }
   ```

3. **Analytics Initialization**: Application Insights only initializes and tracks data when `analytics: true`

## Technical Implementation

### Consent Checking

The `hasAnalyticsConsent()` function checks localStorage for user consent:

```typescript
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
```

### Dynamic Analytics Control

The implementation allows enabling/disabling analytics dynamically:

- When user accepts: `enableAnalytics()` sets `disableTelemetry: false`
- When user rejects: `disableAnalytics()` sets `disableTelemetry: true`

### Route Tracking

Page views are only tracked when:
1. User has consented to analytics
2. Application Insights is loaded
3. Telemetry is not disabled

## Privacy Considerations

1. **No Default Tracking**: Analytics do not start without explicit consent
2. **Transparent Information**: Clear information about what data is collected
3. **Easy Opt-out**: Users can revoke consent at any time
4. **Minimal Data**: Only essential analytics data is collected (page views, basic performance)
5. **No Personal Data**: No personally identifiable information is collected

## Legal Compliance

- **GDPR Compliant**: Explicit consent mechanism for analytics cookies
- **Cookie Policy**: Clear information about cookie usage in the privacy policy
- **Opt-out Rights**: Easy way for users to change their preferences
- **Data Retention**: Follows Application Insights data retention policies

## Testing

### Development Testing
Analytics are disabled by default in development. To test analytics locally:

```bash
# Start with analytics enabled for testing
APPLICATIONINSIGHTS_CONNECTION_STRING="your-connection-string" ENABLE_ANALYTICS_DEV=true pnpm start
```

Then test in the browser:
1. **Accept analytics cookies** through the consent banner
2. **Open browser DevTools** → Console tab
3. **Run manual test**: `window.testAnalytics()` in the console
4. **Check Network tab** for requests to `applicationinsights.azure.com`
5. **Verify in Azure Portal** that events appear in Application Insights

### Production Testing
Test with browser developer tools:
- Check localStorage for consent preferences: `localStorage.getItem("cookieConsent")`
- Verify Application Insights initialization in Network tab
- Confirm no tracking requests when consent is denied
- Test page view tracking by navigating between pages

## Future Enhancements

- Add click analytics support (if needed)
- Implement more granular consent categories
- Add analytics dashboard for privacy-compliant metrics
- Consider server-side analytics for essential metrics
