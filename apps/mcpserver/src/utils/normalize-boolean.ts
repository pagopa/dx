/**
 * Normalizes a string or undefined value into a boolean.
 *
 * @param value - The string value to normalize (e.g., from an environment variable)
 * @param defaultValue - The default boolean value to return if the input is undefined or empty
 * @returns The boolean representation of the string, or the default value
 */
export function normalizeBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (!value) {
    return defaultValue;
  }
  return value.trim().toLowerCase() === "true";
}
