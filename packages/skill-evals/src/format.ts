/**
 * Human-readable duration, credit, and token formatting for progress logs.
 */
export const formatDuration = (milliseconds: number): string => {
  const totalSeconds = Math.max(0, Math.round(milliseconds / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m ${seconds}s`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
};

export const formatCredits = (credits: number): string =>
  Number.isInteger(credits) ? String(credits) : credits.toFixed(2);

export const formatTokens = (input: number, output: number): string =>
  `${input} in / ${output} out`;
