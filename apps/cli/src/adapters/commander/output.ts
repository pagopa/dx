/**
 * Output adapter for agent-friendly CLI invocations.
 *
 * The DX CLI supports two output modes:
 *
 * - `text` (default): human-friendly output via chalk/ora, unchanged from
 *   today's behaviour.
 * - `json`: a single JSON envelope is written to stdout at the end of the
 *   command; optional NDJSON progress events are written to stderr while
 *   the command runs.
 *
 * Coding agents use `json` mode to consume command outputs deterministically
 * without parsing prose.
 */
import { Command } from "commander";

import {
  ErrorCode,
  ErrorCodeValue,
  ExitCode,
  exitCodeForErrorCode,
  ExitCodeValue,
  isCliError,
} from "./exit-codes.js";
import { GlobalOptions } from "./index.js";

export type ErrorEnvelope = {
  command: string;
  error: {
    cause?: string;
    code: ErrorCodeValue;
    details?: unknown;
    message: string;
  };
  ok: false;
};

export type OutputMode = "json" | "text";

export type ProgressEvent = {
  durationMs?: number;
  error?: string;
  event: "step";
  name: string;
  status: "failed" | "started" | "succeeded";
};

export type ResultEnvelope<T> = ErrorEnvelope | SuccessEnvelope<T>;

export type SuccessEnvelope<T> = {
  command: string;
  data: T;
  ok: true;
};

type StreamWriter = (chunk: string) => void;

const defaultStdoutWriter: StreamWriter = (chunk) =>
  process.stdout.write(chunk);
const defaultStderrWriter: StreamWriter = (chunk) =>
  process.stderr.write(chunk);

/**
 * Returns the active output mode. Defaults to `text` for backward
 * compatibility with every existing human invocation.
 */
export const getOutputMode = (command: Command): OutputMode =>
  command.optsWithGlobals<GlobalOptions>().output === "json" ? "json" : "text";

/**
 * Returns `true` when the CLI must not prompt the user.
 *
 * The explicit `--non-interactive` / `-y` flag is the canonical signal.
 * As a convenience, JSON output mode also implies non-interactive when
 * stdout is not a TTY (typical when a coding agent pipes the output), so
 * the CLI fails fast instead of blocking on a stalled stdin.
 */
export const isNonInteractive = (command: Command): boolean => {
  const opts = command.optsWithGlobals<GlobalOptions>();
  if (opts.nonInteractive === true) {
    return true;
  }
  if (opts.output === "json" && !process.stdout.isTTY) {
    return true;
  }
  return false;
};

const flattenCauseChain = (value: unknown): string | undefined => {
  const messages: string[] = [];
  const seen = new Set<unknown>();
  let current: unknown = value;
  while (current !== undefined && current !== null && !seen.has(current)) {
    seen.add(current);
    if (current instanceof Error) {
      if (current.message.length > 0) {
        messages.push(current.message);
      }
      current = (current as { cause?: unknown }).cause;
    } else {
      const str = String(current);
      if (str.length > 0) {
        messages.push(str);
      }
      current = undefined;
    }
  }
  return messages.length > 0 ? messages.join(" <- ") : undefined;
};

/**
 * Convert an arbitrary thrown value into a structured `ErrorEnvelope.error`.
 */
export const toErrorPayload = (value: unknown): ErrorEnvelope["error"] => {
  if (isCliError(value)) {
    return {
      cause: flattenCauseChain((value as { cause?: unknown }).cause),
      code: value.code,
      details: value.details,
      message: value.message,
    };
  }
  if (value instanceof Error) {
    return {
      cause: flattenCauseChain((value as { cause?: unknown }).cause),
      code: ErrorCode.GENERIC,
      message: value.message || value.name || "Error",
    };
  }
  return {
    code: ErrorCode.GENERIC,
    message: typeof value === "string" ? value : JSON.stringify(value),
  };
};

/**
 * Returns the leaf command name, used as the `command` field of every
 * envelope. Commander commands carry their own name; the root program is
 * `dx`, subcommands carry e.g. `init`, `add`, etc.
 */
const commandName = (command: Command): string => command.name();

/**
 * Build a success envelope. Pure function for easy testing.
 */
export const buildSuccessEnvelope = <T>(
  command: Command,
  data: T,
): SuccessEnvelope<T> => ({
  command: commandName(command),
  data,
  ok: true,
});

/**
 * Build an error envelope from any thrown value. Pure function for easy
 * testing.
 */
export const buildErrorEnvelope = (
  command: Command,
  value: unknown,
): ErrorEnvelope => ({
  command: commandName(command),
  error: toErrorPayload(value),
  ok: false,
});

export type OutputWriters = {
  stderr?: StreamWriter;
  stdout?: StreamWriter;
};

/**
 * Emit the final JSON envelope on stdout when `--output json` is active.
 *
 * In text mode this is a no-op: each command keeps printing its own
 * human-readable summary via chalk/ora.
 */
export const printResult = <T>(
  command: Command,
  envelope: ResultEnvelope<T>,
  writers: OutputWriters = {},
): void => {
  if (getOutputMode(command) !== "json") {
    return;
  }
  const write = writers.stdout ?? defaultStdoutWriter;
  write(`${JSON.stringify(envelope)}\n`);
};

/**
 * Emit a progress event on stderr as NDJSON when `--output json` is active.
 *
 * Commands typically call this when starting/finishing a long-running step
 * (terraform apply, GitHub API call, …) so the driving agent can react
 * without waiting for command completion.
 */
export const emitEvent = (
  command: Command,
  event: ProgressEvent,
  writers: OutputWriters = {},
): void => {
  if (getOutputMode(command) !== "json") {
    return;
  }
  const write = writers.stderr ?? defaultStderrWriter;
  write(`${JSON.stringify(event)}\n`);
};

/**
 * Map any thrown value to a process exit code, preferring the explicit code
 * carried by a `CliError`.
 */
export const exitCodeForError = (value: unknown): ExitCodeValue => {
  if (isCliError(value)) {
    return exitCodeForErrorCode(value.code);
  }
  return ExitCode.GENERIC;
};
