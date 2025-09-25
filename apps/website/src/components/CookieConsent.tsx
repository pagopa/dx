import React, { useState } from "react";

import { disableAnalytics, enableAnalytics } from "../utils/analytics-consent";
import styles from "./CookieConsent.module.css";

interface CookieConsentProps {
  onConsentGiven?: () => void;
}

interface CookiePreferences {
  analytics: boolean;
  necessary: boolean;
}

const initializeAnalytics = (prefs: CookiePreferences) => {
  if (prefs.analytics) {
    enableAnalytics();
  } else {
    disableAnalytics();
  }
};

const CookieConsent: React.FC<CookieConsentProps> = ({ onConsentGiven }) => {
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState<CookiePreferences>({
    analytics: false,
    necessary: true, // Always true, cannot be changed
  });

  const handleConsentGiven = () => {
    if (onConsentGiven) {
      onConsentGiven();
    }
  };

  const acceptAll = () => {
    const allAccepted: CookiePreferences = {
      analytics: true,
      necessary: true,
    };
    localStorage.setItem("cookieConsent", JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setShowPreferences(false);
    initializeAnalytics(allAccepted);
    handleConsentGiven();
  };

  const acceptNecessary = () => {
    const necessaryOnly: CookiePreferences = {
      analytics: false,
      necessary: true,
    };
    localStorage.setItem("cookieConsent", JSON.stringify(necessaryOnly));
    setPreferences(necessaryOnly);
    setShowPreferences(false);

    // Disable analytics and delete existing cookies
    disableAnalytics();

    initializeAnalytics(necessaryOnly);
    handleConsentGiven();
  };

  const savePreferences = () => {
    localStorage.setItem("cookieConsent", JSON.stringify(preferences));
    setShowPreferences(false);

    // Enable or disable analytics based on user choice
    if (preferences.analytics) {
      enableAnalytics();
    } else {
      disableAnalytics();
    }

    initializeAnalytics(preferences);
    handleConsentGiven();
  };

  const handlePreferenceChange = (type: "analytics") => {
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  return (
    <aside
      aria-label="Cookie consent banner"
      className={styles.cookieConsent}
      role="complementary"
    >
      <div className={styles.cookieContent}>
        {!showPreferences ? (
          <>
            <div className={styles.cookieText}>
              <h3>Cookie Settings</h3>
              <p>
                This website uses cookies to improve your browsing experience.
                Essential cookies are always active to ensure the website
                functions properly. You can choose whether to also accept
                analytics cookies to help us improve the site.
              </p>
              <p>
                For more information, please see our{" "}
                <a
                  href="/privacy-notice"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Privacy Notice
                </a>
                .
              </p>
            </div>
            <div className={styles.cookieButtons}>
              <button
                className={styles.buttonSecondary}
                onClick={acceptNecessary}
              >
                Essential Only
              </button>
              <button
                className={styles.buttonSecondary}
                onClick={() => setShowPreferences(true)}
              >
                Customize
              </button>
              <button className={styles.buttonPrimary} onClick={acceptAll}>
                Accept All
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.cookieText}>
              <h3>Customize Cookies</h3>
              <div className={styles.cookieCategory}>
                <div className={styles.categoryHeader}>
                  <label>
                    <input
                      checked={preferences.necessary}
                      disabled
                      type="checkbox"
                    />
                    <strong>Essential Cookies</strong>
                  </label>
                </div>
                <p>
                  These cookies are essential for the website to function and
                  cannot be disabled.
                </p>
              </div>

              <div className={styles.cookieCategory}>
                <div className={styles.categoryHeader}>
                  <label>
                    <input
                      checked={preferences.analytics}
                      onChange={() => handlePreferenceChange("analytics")}
                      type="checkbox"
                    />
                    <strong>Analytics Cookies</strong>
                  </label>
                </div>
                <p>
                  These cookies help us understand how visitors interact with
                  the website by collecting and reporting anonymous information
                  via Azure Application Insights.
                </p>
              </div>
            </div>
            <div className={styles.cookieButtons}>
              <button
                className={styles.buttonSecondary}
                onClick={() => setShowPreferences(false)}
              >
                Back
              </button>
              <button
                className={styles.buttonPrimary}
                onClick={savePreferences}
              >
                Save Preferences
              </button>
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default CookieConsent;
