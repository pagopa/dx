/** This module wraps child-process execution for dx-tasks Terraform commands. */

import childProcess from "node:child_process";

export type ProcessResult =
  | (ProcessOutput & {
      exitCode: null;
      signal: NodeJS.Signals;
    })
  | (ProcessOutput & {
      exitCode: number;
      signal: null;
    });

interface ProcessOutput {
  stderr: string;
  stdout: string;
}

export const runCommand = async (
  command: string,
  args: string[],
  cwd: string,
  env: Record<string, string>,
): Promise<ProcessResult> => {
  const { promise, reject, resolve } = Promise.withResolvers<ProcessResult>();
  const child = childProcess.spawn(command, args, {
    cwd,
    env: { ...process.env, ...env },
    stdio: ["inherit", "pipe", "pipe"],
  });

  let stderr = "";
  let stdout = "";

  child.stderr?.setEncoding("utf8");
  child.stderr?.on("data", (chunk: string) => {
    stderr += chunk;
    process.stderr.write(chunk);
  });
  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    stdout += chunk;
  });

  child.on("error", reject);
  child.on("close", (exitCode, signal) => {
    if (signal) {
      resolve({ exitCode: null, signal, stderr, stdout });
      return;
    }

    if (exitCode !== null) {
      resolve({ exitCode, signal: null, stderr, stdout });
      return;
    }

    reject(new Error(`${command} closed without an exit code or signal`));
  });

  return promise;
};
