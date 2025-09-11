import React, { useEffect, useState } from "react";

import styles from "./CookieConsent.module.css";

const CookieConsent: React.FC = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    analytics: false,
    marketing: false,
    necessary: true, // Always true, cannot be changed
  });

  useEffect(() => {
    // Check if user has already made a choice
    const consent = localStorage.getItem("cookieConsent");
    if (!consent) {
      setIsVisible(true);
    } else {
      const storedPreferences = JSON.parse(consent);
      setPreferences(storedPreferences);
    }
  }, []);

  const acceptAll = () => {
    const allAccepted = {
      analytics: true,
      marketing: true,
      necessary: true,
    };
    localStorage.setItem("cookieConsent", JSON.stringify(allAccepted));
    setPreferences(allAccepted);
    setIsVisible(false);
    setShowPreferences(false);
    // Initialize analytics and marketing cookies here
    initializeCookies(allAccepted);
  };

  const acceptNecessary = () => {
    const necessaryOnly = {
      analytics: false,
      marketing: false,
      necessary: true,
    };
    localStorage.setItem("cookieConsent", JSON.stringify(necessaryOnly));
    setPreferences(necessaryOnly);
    setIsVisible(false);
    setShowPreferences(false);
    initializeCookies(necessaryOnly);
  };

  const savePreferences = () => {
    localStorage.setItem("cookieConsent", JSON.stringify(preferences));
    setIsVisible(false);
    setShowPreferences(false);
    initializeCookies(preferences);
  };

  const initializeCookies = (prefs: typeof preferences) => {
    // Initialize analytics cookies if accepted
    if (prefs.analytics) {
      // Add Google Analytics or other analytics initialization
      // console.log("Analytics cookies initialized");
    }

    // Initialize marketing cookies if accepted
    if (prefs.marketing) {
      // Add marketing cookies initialization
      // console.log("Marketing cookies initialized");
    }
  };

  const handlePreferenceChange = (type: "analytics" | "marketing") => {
    setPreferences((prev) => ({
      ...prev,
      [type]: !prev[type],
    }));
  };

  if (!isVisible) return null;

  return (
    <div className={styles.cookieConsent}>
      <div className={styles.cookieContent}>
        {!showPreferences ? (
          <>
            <div className={styles.cookieText}>
              <h3>Informativa sui Cookie</h3>
              <p>
                Questo sito utilizza cookie per migliorare la tua esperienza di
                navigazione. I cookie necessari sono sempre attivi per garantire
                il funzionamento del sito. Puoi scegliere di accettare tutti i
                cookie o personalizzare le tue preferenze.
              </p>
              <p>
                Per maggiori informazioni, consulta la nostra{" "}
                <a
                  href="/dx/informativa-privacy"
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  Informativa Privacy
                </a>
                .
              </p>
            </div>
            <div className={styles.cookieButtons}>
              <button
                className={styles.buttonSecondary}
                onClick={acceptNecessary}
              >
                Solo Necessari
              </button>
              <button
                className={styles.buttonSecondary}
                onClick={() => setShowPreferences(true)}
              >
                Personalizza
              </button>
              <button className={styles.buttonPrimary} onClick={acceptAll}>
                Accetta Tutti
              </button>
            </div>
          </>
        ) : (
          <>
            <div className={styles.cookieText}>
              <h3>Personalizza Cookie</h3>
              <div className={styles.cookieCategory}>
                <div className={styles.categoryHeader}>
                  <label>
                    <input
                      checked={preferences.necessary}
                      disabled
                      type="checkbox"
                    />
                    <strong>Cookie Necessari</strong>
                  </label>
                </div>
                <p>
                  Questi cookie sono essenziali per il funzionamento del sito e
                  non possono essere disabilitati.
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
                    <strong>Cookie Analitici</strong>
                  </label>
                </div>
                <p>
                  Questi cookie ci aiutano a capire come i visitatori
                  interagiscono con il sito raccogliendo e riportando
                  informazioni anonime.
                </p>
              </div>

              <div className={styles.cookieCategory}>
                <div className={styles.categoryHeader}>
                  <label>
                    <input
                      checked={preferences.marketing}
                      onChange={() => handlePreferenceChange("marketing")}
                      type="checkbox"
                    />
                    <strong>Cookie di Marketing</strong>
                  </label>
                </div>
                <p>
                  Questi cookie sono utilizzati per tracciare i visitatori
                  attraverso i siti web per mostrare annunci pertinenti e
                  coinvolgenti.
                </p>
              </div>
            </div>
            <div className={styles.cookieButtons}>
              <button
                className={styles.buttonSecondary}
                onClick={() => setShowPreferences(false)}
              >
                Indietro
              </button>
              <button
                className={styles.buttonPrimary}
                onClick={savePreferences}
              >
                Salva Preferenze
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default CookieConsent;
