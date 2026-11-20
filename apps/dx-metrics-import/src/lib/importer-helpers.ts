/** This module contains small helpers shared by the import script modules. */

export const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const formatSecondsElapsed = (startTime: number): string =>
  ((Date.now() - startTime) / 1000).toFixed(1);

export const escapeForRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * HTTP status of an Octokit error, when the error carries one.
 *
 * Used to tell a permanently missing resource (404, safe to skip) from a
 * recoverable failure that must abort the import so the incremental cursor does
 * not move past a window that was never fully imported.
 */
export const errorStatus = (error: unknown): number | undefined => {
  if (typeof error !== "object" || error === null || !("status" in error)) {
    return undefined;
  }

  const { status } = error as { status?: unknown };

  return typeof status === "number" ? status : undefined;
};
