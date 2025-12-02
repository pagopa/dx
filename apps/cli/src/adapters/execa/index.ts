import { execa, type Options } from "execa";

/**
 * Result of a command execution
 */
export type CommandResult = "failure" | "success";

/**
 * Executes a shell command and returns whether it succeeded or failed.
 *
 * @param command - The command to execute
 * @param args - Array of arguments for the command (optional)
 * @param options - Execa options (optional)
 * @returns Promise that always resolves to 'success' (exit code 0) or 'failure' (non-zero exit code or execution error)
 *
 * @example
 * ```ts
 * const result = await executeCommand("ls", ["-la"], { cwd: "/my/dir" });
 * if (result === "success") {
 *   console.log("Command executed successfully");
 * } else {
 *   console.log("Command failed");
 * }
 * ```
 */
export const executeCommand = (
  command: string,
  args: string[] = [],
  options: Options = {},
): Promise<CommandResult> =>
  execa(command, args, options)
    .then(() => "success" as const)
    .catch(() => "failure" as const);
