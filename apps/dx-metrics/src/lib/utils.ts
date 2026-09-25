import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared keyboard focus indicator. Two solid pixels of the accent green, which
 * keeps a high contrast against both the page and card surfaces in either
 * theme. Pair it with `focus-visible:outline-none` only through this constant,
 * never by hand.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";
