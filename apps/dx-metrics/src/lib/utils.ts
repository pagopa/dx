import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Shared keyboard focus indicator. Two solid pixels of the accent green, which
 * measures 8.5:1 against both the page and card surfaces. Pair it with
 * `focus-visible:outline-none` only through this constant, never by hand.
 */
export const focusRing =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500";
