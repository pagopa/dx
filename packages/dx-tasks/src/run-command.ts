/** This module wraps child-process execution for dx-tasks Terraform commands. */

import childProcess from "node:child_process";

export interface ProcessResult {
  exitCode: null | number;
  signal: NodeJS.Signals | null;
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
    stdio: ["inherit", "pipe", "inherit"],
  });

  let stdout = "";

  child.stdout?.setEncoding("utf8");
  child.stdout?.on("data", (chunk: string) => {
    stdout += chunk;
  });

  child.on("error", reject);
  child.on("close", (exitCode, signal) => {
    resolve({ exitCode, signal, stdout });
  });

  return promise;
};
