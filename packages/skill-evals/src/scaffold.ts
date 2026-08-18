/**
 * Materializes deterministic repository fixtures declared by any skill manifest.
 */
import { cp, mkdir, readdir, realpath, stat } from "node:fs/promises";
import { dirname, join } from "node:path";

import { fixtureTarget, loadManifest } from "./manifest.js";
import { runCommand } from "./process.js";

const directoryExists = async (path: string): Promise<boolean> => {
  try {
    return (await stat(path)).isDirectory();
  } catch (error) {
    if (error instanceof Error && "code" in error && error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
};

export const scaffoldEval = async (
  skillDirectory: string,
  evalName: string,
  destination: string,
): Promise<string> => {
  const manifest = await loadManifest(skillDirectory);
  const evalCase = manifest.evals.find(({ name }) => name === evalName);

  if (!evalCase || !evalCase.fixture_required || evalCase.files.length === 0) {
    throw new Error(`Unknown eval or eval without a fixture: ${evalName}`);
  }

  if (await directoryExists(destination)) {
    if ((await readdir(destination)).length > 0) {
      throw new Error(`Destination must be empty: ${destination}`);
    }
  } else {
    await mkdir(destination, { recursive: true });
  }

  const resolvedDestination = await realpath(destination);
  for (const file of evalCase.files) {
    const target = join(resolvedDestination, fixtureTarget(file));
    await mkdir(dirname(target), { recursive: true });
    await cp(join(skillDirectory, file), target, {
      errorOnExist: true,
      force: false,
    });
  }

  const commands: readonly (readonly string[])[] = [
    ["init", "--quiet"],
    ["config", "user.name", "Skill Evals"],
    ["config", "user.email", "skill-evals@example.invalid"],
    ["add", "."],
    ["commit", "--quiet", "-m", "Baseline skill eval fixture"],
  ];

  for (const args of commands) {
    const result = await runCommand("git", args, {
      cwd: resolvedDestination,
    });
    if (result.exitCode !== 0) {
      throw new Error(`git ${args[0]} failed: ${result.stderr.trim()}`);
    }
  }

  return resolvedDestination;
};
