/**
 * Deep merge utility that recursively merges two objects.
 * When values are objects, recursively merges them. Otherwise, override values take precedence.
 */

/**
 * Represents a deeply mergeable object structure.
 */
export type DeepMergeable = Record<string, unknown>;

/**
 * Deep merge source object with overrides.
 * Arrays and primitive values are replaced, not merged.
 *
 * @template T - The type of the source object
 * @param source - The base object
 * @param overrides - The overrides to apply (can have different nested structure)
 * @returns Merged object with type based on source
 */
export function overrideWith<T extends DeepMergeable>(
  source: T,
  overrides: DeepMergeable,
): T {
  const result = { ...source } as T;

  for (const [key, value] of Object.entries(overrides)) {
    if (isPlainObject(value)) {
      const sourceValue = result[key as keyof T];
      result[key as keyof T] = overrideWith(
        isPlainObject(sourceValue) ? (sourceValue as DeepMergeable) : {},
        value as DeepMergeable,
      ) as T[keyof T];
    } else {
      result[key as keyof T] = value as T[keyof T];
    }
  }

  return result;
}

// Type guard to check if a value is a plain object
function isPlainObject(value: unknown): value is DeepMergeable {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value) &&
    Object.prototype.toString.call(value) === "[object Object]"
  );
}
