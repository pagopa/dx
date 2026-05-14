/** This module contains small helpers shared by the import script modules. */

export const sleep = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export const formatSecondsElapsed = (startTime: number): string =>
  ((Date.now() - startTime) / 1000).toFixed(1);

export const escapeForRegularExpression = (value: string): string =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
