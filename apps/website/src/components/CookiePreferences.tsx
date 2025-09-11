import React, { useState } from "react";

import CookieConsent from "./CookieConsent";

const CookiePreferences: React.FC = () => {
  const [showConsent, setShowConsent] = useState(false);

  const openPreferences = () => {
    // Clear stored consent to trigger the banner again
    localStorage.removeItem("cookieConsent");
    setShowConsent(true);
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
        Preferenze Cookie
      </button>
      {showConsent && (
        <div style={{ display: "block" }}>
          <CookieConsent />
        </div>
      )}
    </>
  );
};

export default CookiePreferences;
