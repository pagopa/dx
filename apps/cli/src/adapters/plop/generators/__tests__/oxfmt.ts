/**
 * Helpers to verify that generated repositories pass `nx format:check`,
 * which uses oxfmt through the workspace configuration.
 */
import { execa } from "execa";
import { readFileSync } from "node:fs";
import fs from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

/**
 * Resolves the oxfmt binary from the CLI's own devDependency, so contract
 * tests format the scaffold with the same version the generator installs in
 * generated repositories.
 */
export const resolveOxfmtBinary = (): string => {
  const require = createRequire(import.meta.url);
  const packageJsonPath = require.resolve("oxfmt/package.json");
  const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8")) as {
    bin: Record<string, string> | string;
  };
  const binary =
    typeof packageJson.bin === "string"
      ? packageJson.bin
      : packageJson.bin["oxfmt"];
  return path.resolve(path.dirname(packageJsonPath), binary);
};

/**
 * Makes a generated repository self-contained for an oxfmt run: installs the
 * oxfmt package (the bootstrap action is stubbed in tests) and copies the
 * workspace configuration the generator materializes.
 */
export const prepareOxfmtCheck = async (
  repositoryRoot: string,
  oxfmtConfigSource: string,
): Promise<void> => {
  const require = createRequire(import.meta.url);
  const oxfmtPackageRoot = path.dirname(require.resolve("oxfmt/package.json"));
  const nodeModules = path.join(repositoryRoot, "node_modules");
  await fs.mkdir(nodeModules, { recursive: true });
  await fs.symlink(oxfmtPackageRoot, path.join(nodeModules, "oxfmt"), "dir");
  await fs.copyFile(
    oxfmtConfigSource,
    path.join(repositoryRoot, "oxfmt.config.ts"),
  );
};

export type OxfmtCheckResult = {
  exitCode: number;
  stderr: string;
  stdout: string;
};

/**
 * Runs `oxfmt --check` over the whole repository, exactly like
 * `nx format:check` would. The caller asserts on the result.
 */
export const checkOxfmtFormatting = async (
  repositoryRoot: string,
): Promise<OxfmtCheckResult> => {
  const result = await execa("node", [resolveOxfmtBinary(), "--check", "."], {
    cwd: repositoryRoot,
    reject: false,
  });

  return {
    exitCode: result.exitCode ?? 1,
    stderr: result.stderr,
    stdout: result.stdout,
  };
};
