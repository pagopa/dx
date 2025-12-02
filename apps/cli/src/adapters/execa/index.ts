import { execa, type Options } from "execa";
import { ResultAsync } from "neverthrow";

/**
 * Result of a command execution
 */
export type CommandResult = "failure" | "success";

/**
 * Executes a bash command and returns whether it succeeded or failed.
 *
 * @param command - The command to execute
 * @param args - Array of arguments for the command (optional)
 * @param options - Execa options (optional)
 * @returns ResultAsync with 'success' or 'failure'
 *
 * @example
 * ```ts
 * const result = await executeCommand("ls", ["-la"], { cwd: "/my/dir" });
 * if (result.isOk()) {
 *   if (result.value === "success") {
 *   console.log("Command executed successfully");
 *   } else {
 *     console.log("Command executed but failed");
 * } else {
 *   console.error(`Command execution failed: ${result.error.message}`);
 * }
 * ```
 */
export const executeCommand = (
  command: string,
  args: string[] = [],
  options: Options = {},
): ResultAsync<CommandResult, Error> =>
  ResultAsync.fromPromise(
    execa(command, args, options).then((result) =>
      result.exitCode === 0 ? ("success" as const) : ("failure" as const),
    ),
    () => new Error(`Command execution failed: "${command}"`),
  );
