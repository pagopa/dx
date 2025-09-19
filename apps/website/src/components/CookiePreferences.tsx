import React, { useState } from "react";

import CookieConsent from "./CookieConsent";

interface CookiePreferencesProps {
  onConsentChange?: () => void;
}

const CookiePreferences: React.FC<CookiePreferencesProps> = ({
  onConsentChange,
}) => {
  const [showConsent, setShowConsent] = useState(false);

  const openPreferences = () => {
    // Clear stored consent to trigger the banner again
    localStorage.removeItem("cookieConsent");
    setShowConsent(true);
  };

  const handleConsentGiven = () => {
    setShowConsent(false);
    if (onConsentChange) {
      onConsentChange();
    }
  };

  return (
    <>
      <button
        onClick={openPreferences}
        style={{
          background: "none",
          border: "1px solid var(--ifm-color-primary)",
          borderRadius: "4px",
          color: "var(--ifm-color-primary)",
          cursor: "pointer",
          fontSize: "0.8rem",
          padding: "0.25rem 0.5rem",
        }}
        type="button"
      >
        Cookie Preferences
      </button>
      {showConsent && (
        <div style={{ display: "block" }}>
          <CookieConsent onConsentGiven={handleConsentGiven} />
        </div>
      )}
    </>
  );
};

export default CookiePreferences;
