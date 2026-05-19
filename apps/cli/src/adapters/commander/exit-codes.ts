/**
 * Process exit codes used by the DX CLI.
 *
 * Coding agents driving the CLI rely on these codes to decide whether a
 * failure is retriable (e.g. transient remote error), recoverable by the
 * agent (e.g. missing input) or terminal (e.g. validation error in a
 * user-provided config file).
 */
export const ExitCode = {
  GENERIC: 1,
  MISSING_INPUT: 3,
  OK: 0,
  PRECONDITION: 4,
  REMOTE: 5,
  USAGE: 2,
  VALIDATION: 6,
} as const;

export type ExitCodeName = keyof typeof ExitCode;
export type ExitCodeValue = (typeof ExitCode)[ExitCodeName];

/**
 * Stable, machine-readable error codes embedded in JSON error envelopes.
 * The `E_` prefix mirrors the convention used by Node's own error system.
 */
export const ErrorCode = {
  GENERIC: "E_GENERIC",
  MISSING_INPUT: "E_MISSING_INPUT",
  PRECONDITION: "E_PRECONDITION",
  REMOTE: "E_REMOTE",
  USAGE: "E_USAGE",
  VALIDATION: "E_VALIDATION",
} as const;

export type ErrorCodeName = keyof typeof ErrorCode;
export type ErrorCodeValue = (typeof ErrorCode)[ErrorCodeName];

const exitCodeByErrorCode: Record<ErrorCodeValue, ExitCodeValue> = {
  [ErrorCode.GENERIC]: ExitCode.GENERIC,
  [ErrorCode.MISSING_INPUT]: ExitCode.MISSING_INPUT,
  [ErrorCode.PRECONDITION]: ExitCode.PRECONDITION,
  [ErrorCode.REMOTE]: ExitCode.REMOTE,
  [ErrorCode.USAGE]: ExitCode.USAGE,
  [ErrorCode.VALIDATION]: ExitCode.VALIDATION,
};

export const exitCodeForErrorCode = (code: ErrorCodeValue): ExitCodeValue =>
  exitCodeByErrorCode[code];

/**
 * Typed CLI error that carries a stable `code` and arbitrary `details` for
 * structured reporting. Throw a `CliError` whenever the failure has a
 * well-known category so the JSON output adapter and exit code mapper can
 * report it precisely.
 */
export class CliError extends Error {
  readonly code: ErrorCodeValue;
  readonly details?: unknown;

  constructor(
    code: ErrorCodeValue,
    message: string,
    options?: { cause?: unknown; details?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "CliError";
    this.code = code;
    this.details = options?.details;
  }
}

export const isCliError = (value: unknown): value is CliError =>
  value instanceof CliError;
