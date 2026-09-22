"use client";

/**
 * Browser-derived date locale.
 *
 * Numbers stay on `en-GB` on purpose: the CSV export and the chart axes are
 * meant to be read the same way everywhere, while dates are the field readers
 * most expect in their own format.
 *
 * The locale is resolved only after mount (see `LocaleProvider`): rendering the
 * browser value during SSR would make the server and the client disagree and
 * trigger a hydration mismatch.
 */

import { createContext, useContext, useMemo } from "react";

import { DEFAULT_LOCALE, formatFullDate, formatShortDate } from "@/lib/format";

/**
 * Normalises a locale tag, falling back to `DEFAULT_LOCALE` for empty or
 * malformed input so `Intl` never throws on an unexpected browser value.
 */
export const resolveLocale = (candidate: null | string | undefined): string => {
  if (!candidate) {
    return DEFAULT_LOCALE;
  }

  try {
    return Intl.getCanonicalLocales(candidate)[0] ?? DEFAULT_LOCALE;
  } catch {
    return DEFAULT_LOCALE;
  }
};

export const LocaleContext = createContext<string>(DEFAULT_LOCALE);

/** The locale currently in use, defaulting to `DEFAULT_LOCALE` before mount. */
export const useLocale = (): string => useContext(LocaleContext);

export interface DateFormatters {
  readonly full: (value: string | number | Date) => string;
  /**
   * Short label for a `windowDays`-long window ending at `referenceDate`,
   * e.g. `17 Jul – 15 Sep`. Returns just the end date when the window length
   * or the reference date is invalid.
   */
  readonly range: (
    referenceDate: string | number | Date,
    windowDays: number,
  ) => string;
  readonly short: (value: string | number | Date) => string;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Date formatters bound to the active locale, memoised per locale. */
export const useDateFormatters = (): DateFormatters => {
  const locale = useLocale();

  return useMemo(
    () => ({
      full: (value) => formatFullDate(value, locale),
      range: (referenceDate, windowDays) => {
        const end = formatShortDate(referenceDate, locale);
        const endMs = new Date(referenceDate).getTime();

        if (Number.isNaN(endMs) || !Number.isFinite(windowDays) || windowDays <= 0) {
          return end;
        }

        const start = formatShortDate(
          new Date(endMs - windowDays * MS_PER_DAY),
          locale,
        );
        return `${start} – ${end}`;
      },
      short: (value) => formatShortDate(value, locale),
    }),
    [locale],
  );
};
