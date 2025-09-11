import type { Props } from "@theme/Layout";

import Layout from "@theme-original/Layout";
import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

import CookieConsent from "../../components/CookieConsent";
import CookiePreferences from "../../components/CookiePreferences";
import { useSearchTracking } from "../../hooks/useSearchTracking";

export default function LayoutWrapper(props: Props): JSX.Element {
  const [showCookieBanner, setShowCookieBanner] = useState(false);

  // Initialize search tracking
  useSearchTracking();

  useEffect(() => {
    // Check cookie consent status once at app level
    const checkCookieConsent = () => {
      try {
        const consent = localStorage.getItem("cookieConsent");
        
        if (!consent) {
          setShowCookieBanner(true);
        } else {
          setShowCookieBanner(false);
        }
      } catch {
        // If localStorage is not available, show banner
        setShowCookieBanner(true);
      }
    };

    checkCookieConsent();

    // Mount cookie preferences component in footer with ability to trigger banner
    const container = document.getElementById("cookie-preferences-link");
    if (container && !container.hasChildNodes()) {
      const root = createRoot(container);
      root.render(
        <CookiePreferences
          onConsentChange={() => {
            // When consent changes from footer, hide banner and recheck consent
            setShowCookieBanner(false);
            setTimeout(checkCookieConsent, 100); // Small delay to ensure localStorage is updated
          }}
        />,
      );
    }
  }, []);

  return (
    <>
      <Layout {...props} />
      {showCookieBanner && (
        <CookieConsent onConsentGiven={() => setShowCookieBanner(false)} />
      )}
    </>
  );
}
