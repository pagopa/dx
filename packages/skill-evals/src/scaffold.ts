/**
 * Layers declared scaffold files into an empty workspace and commits them.
 *
 * The resulting Git baseline makes later diffs contain only the agent change.
 * Destination paths come from the portion after repository/ in each fixture.
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

/**
 * Creates a disposable Git repo. `tracked` commits copied fixtures; `empty`
 * is for prompt-only evals that still need a clean `git diff`.
 */
export const initializeGitRepository = async (
  directory: string,
  mode: "empty" | "tracked",
): Promise<void> => {
  const commands: readonly (readonly string[])[] = [
    ["init", "--quiet"],
    ["config", "user.name", "Skill Evals"],
    ["config", "user.email", "skill-evals@example.invalid"],
    ...(mode === "tracked" ? [["add", "."]] : []),
    mode === "tracked"
      ? ["commit", "--quiet", "-m", "Baseline skill eval fixture"]
      : [
          "commit",
          "--quiet",
          "--allow-empty",
          "-m",
          "Baseline skill eval fixture",
        ],
  ];

  for (const args of commands) {
    const result = await runCommand("git", args, { cwd: directory });
    if (result.exitCode !== 0) {
      throw new Error(`git ${args[0]} failed: ${result.stderr.trim()}`);
    }
  }
};

/** Copies one eval's fixture files into an empty directory and commits them. */
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

  await initializeGitRepository(resolvedDestination, "tracked");
  return resolvedDestination;
};
