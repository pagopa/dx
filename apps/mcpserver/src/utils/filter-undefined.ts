/**
 * Filter out undefined values from an object to match emitCustomEvent expectations
 */
export function filterUndefined(
  obj: Record<string, string | undefined>,
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(obj).filter(([, value]) => value !== undefined),
  ) as Record<string, string>;
}
