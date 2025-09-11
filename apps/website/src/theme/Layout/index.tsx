import type { Props } from "@theme/Layout";

import Layout from "@theme-original/Layout";
import React, { useEffect } from "react";
import { createRoot } from "react-dom/client";

import CookieConsent from "../../components/CookieConsent";
import CookiePreferences from "../../components/CookiePreferences";

export default function LayoutWrapper(props: Props): JSX.Element {
  useEffect(() => {
    // Mount cookie preferences component in footer
    const container = document.getElementById("cookie-preferences-link");
    if (container && !container.hasChildNodes()) {
      const root = createRoot(container);
      root.render(<CookiePreferences />);
    }
  }, []);

  return (
    <>
      <Layout {...props} />
      <CookieConsent />
    </>
  );
}
