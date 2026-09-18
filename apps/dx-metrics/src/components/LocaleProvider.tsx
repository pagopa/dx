"use client";

import { useEffect, useState, type ReactNode } from "react";

import { DEFAULT_LOCALE } from "@/lib/format";
import { LocaleContext, resolveLocale } from "@/lib/locale";

/**
 * Provides the browser's preferred locale to date-formatting consumers.
 *
 * The first render always uses `DEFAULT_LOCALE`; the browser value is applied in
 * an effect so the server output and the hydrated client output match.
 */
export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocale] = useState(DEFAULT_LOCALE);

  useEffect(() => {
    // Intentionally applied after mount: reading `navigator` during render would
    // diverge from the server-rendered markup and break hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocale(resolveLocale(navigator.language));
  }, []);

  return (
    <LocaleContext.Provider value={locale}>{children}</LocaleContext.Provider>
  );
}
