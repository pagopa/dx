import { ExecaError } from "execa";

/**
 * Safely converts an unknown value to a human-readable error message.
 * Preserves ExecaError.shortMessage when available and flattens AggregateError.
 */
export const toErrorMessage = (value: unknown): string => {
  if (value === null || value === undefined) {
    return "Unknown error";
  }
  if (typeof value === "string") {
    return value;
  }
  if (value instanceof ExecaError) {
    return value.shortMessage || value.message || String(value);
  }
  if (value instanceof AggregateError) {
    const parts = value.errors.map((inner) => toErrorMessage(inner));
    return [value.message, ...parts].filter(Boolean).join("\n  - ");
  }
  if (value instanceof Error) {
    return value.message || value.name || "Error";
  }
  if (typeof value === "object") {
    const maybeMessage = (value as { message?: unknown }).message;
    if (typeof maybeMessage === "string" && maybeMessage.length > 0) {
      return maybeMessage;
    }
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
};

/**
 * Builds a detailed, multi-line representation of an error suitable for
 * `--verbose` output: includes the full `cause` chain and stack traces.
 */
export const formatErrorDetailed = (value: unknown): string => {
  const lines: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = value;
  let depth = 0;

  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    const prefix = depth === 0 ? "" : "Caused by: ";
    if (current instanceof Error) {
      lines.push(`${prefix}${current.name}: ${toErrorMessage(current)}`);
      if (current.stack) {
        // `stack` usually starts with "Name: message"; drop the first line to
        // avoid duplication with the header we just printed.
        const stackBody = current.stack.split("\n").slice(1).join("\n");
        if (stackBody.trim().length > 0) {
          lines.push(stackBody);
        }
      }
      current = (current as { cause?: unknown }).cause;
    } else {
      lines.push(`${prefix}${toErrorMessage(current)}`);
      current = undefined;
    }
    depth += 1;
  }

  return lines.join("\n");
};
