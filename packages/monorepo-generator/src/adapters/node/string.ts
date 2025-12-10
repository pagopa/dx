/**
 * Pads the input string with leading zeros until it reaches a length of 2.
 *
 * This utility function is useful for formatting numbers or strings
 * to ensure they have a consistent width, such as for dates or counters.
 *
 * @param {string} str - The input string to be padded.
 * @returns {string} - The input string padded with leading zeros to a length of 2.
 *
 * @example
 * fillWithZero("5"); // Returns "05"
 * fillWithZero("12"); // Returns "12"
 */
export const fillWithZero = (str: string): string => str.padStart(2, "0");
