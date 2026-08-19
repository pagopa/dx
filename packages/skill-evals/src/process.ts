/**
 * Typed spawn adapter for Copilot, Git, and skill hooks.
 *
 * stdin is ignored so a stray TTY cannot stall a non-interactive run.
 * A null exit code (signal kill) is treated as failure (1).
 */
import { spawn } from "node:child_process";
import { open } from "node:fs/promises";

export type CommandResult = Readonly<{
  exitCode: number;
  stderr: string;
  stdout: string;
}>;

type RunCommandOptions = Readonly<{
  cwd?: string;
  env?: NodeJS.ProcessEnv;
}>;

/** Captures stdout/stderr in memory. Used for short Git and hook commands. */
export const runCommand = async (
  command: string,
  args: readonly string[],
  options: RunCommandOptions = {},
): Promise<CommandResult> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ["ignore", "pipe", "pipe"],
    });
    const stdout: Buffer[] = [];
    const stderr: Buffer[] = [];

    child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
    child.on("error", reject);
    child.on("close", (exitCode) =>
      resolve({
        exitCode: exitCode ?? 1,
        stderr: Buffer.concat(stderr).toString("utf8"),
        stdout: Buffer.concat(stdout).toString("utf8"),
      }),
    );
  });

type RunCommandToFilesOptions = Readonly<{
  stderrPath: string;
  stdoutPath: string;
}> &
  RunCommandOptions;

/** Streams Copilot output to files so large JSONL event streams stay off-heap. */
export const runCommandToFiles = async (
  command: string,
  args: readonly string[],
  options: RunCommandToFilesOptions,
): Promise<number> => {
  const stdout = await open(options.stdoutPath, "w");
  const stderr = await open(options.stderrPath, "w");

  try {
    return await new Promise((resolve, reject) => {
      const child = spawn(command, args, {
        cwd: options.cwd,
        env: options.env,
        stdio: ["ignore", stdout.fd, stderr.fd],
      });

      child.on("error", reject);
      child.on("close", (exitCode) => resolve(exitCode ?? 1));
    });
  } finally {
    await Promise.all([stdout.close(), stderr.close()]);
  }
};
