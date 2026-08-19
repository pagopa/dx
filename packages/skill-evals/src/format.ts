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

/** Keeps verbose Q&A readable in the Nx TUI without dumping grader packets. */
export const LOG_TEXT_LIMIT = 4_000;

export const formatLogText = (text: string, limit = LOG_TEXT_LIMIT): string => {
  const trimmed = text.trim();
  if (trimmed.length <= limit) {
    return trimmed;
  }
  return `${trimmed.slice(0, limit)}… (${trimmed.length - limit} more chars)`;
};

/** Pretty-prints objects and JSON strings for -vv conversation logs. */
export const formatStructuredValue = (value: unknown): string => {
  if (typeof value === "string") {
    try {
      return formatLogText(JSON.stringify(JSON.parse(value), null, 2));
    } catch {
      return formatLogText(value);
    }
  }
  try {
    return formatLogText(JSON.stringify(value, null, 2));
  } catch {
    return formatLogText(String(value));
  }
};

/** Indents a multiline body under a one-line title for the Nx TUI. */
export const formatConversationBlock = (
  title: string,
  body: string,
): string => {
  const indented = formatLogText(body)
    .split("\n")
    .map((line) => `  ${line}`)
    .join("\n");
  return `${title}\n${indented}`;
};
