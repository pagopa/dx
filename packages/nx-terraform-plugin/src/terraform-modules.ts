import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { z } from "zod/v4";

import { getPackageLogger } from "./logger.ts";

const logger = getPackageLogger(["terraform-modules"]);

const declaredModulesSchema = z.object({
  modules: z
    .array(z.object({ key: z.string(), source: z.string() }))
    .nullable(),
});

const installedModulesSchema = z.object({
  Modules: z.array(
    z.object({ Dir: z.string(), Key: z.string(), Source: z.string() }),
  ),
});

const isLocalSource = (source: string) =>
  source.startsWith("./") || source.startsWith("../");

const hasErrorCode = (error: unknown, code: string) =>
  typeof error === "object" && error !== null && "code" in error
    ? error.code === code
    : false;

const hasManifest = async (directory: string) => {
  try {
    await fs.access(path.join(directory, "module.json"));
    return true;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      return false;
    }
    throw error;
  }
};

const runTerraform = async (
  args: readonly string[],
  cwd: string,
  tfDataDir: string,
): Promise<string> => {
  const command = `terraform ${args.join(" ")}`;
  try {
    const { execa } = await import("execa");
    const { stdout } = await execa("terraform", args, {
      cwd,
      env: { TF_DATA_DIR: tfDataDir, TF_INPUT: "0" },
    });
    return stdout;
  } catch (error) {
    if (hasErrorCode(error, "ENOENT")) {
      throw new Error(
        `Terraform CLI not found: install Terraform 1.10 or later and make sure it is on PATH (required to run "${command}")`,
        { cause: error },
      );
    }
    const stderr =
      error instanceof Error && "stderr" in error ? String(error.stderr) : "";
    const hint =
      args[0] === "modules"
        ? ' ("terraform modules" requires Terraform 1.10 or later)'
        : "";
    throw new Error(
      `"${command}" failed in ${cwd}${hint}: ${stderr || String(error)}`,
      { cause: error },
    );
  }
};

const parseTerraformJson = <T extends z.ZodType>(
  text: string,
  schema: T,
  command: string,
): z.infer<T> => {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (error) {
    throw new Error(`Invalid JSON returned by "${command}"`, { cause: error });
  }
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new Error(`Unexpected output returned by "${command}"`, {
      cause: parsed.error,
    });
  }
  return parsed.data;
};

const isSharedModuleDirectory = async (
  workspaceRoot: string,
  relativeDir: string,
) => {
  const segments = relativeDir.split(path.sep);
  if (segments[0] === ".." || !segments.includes("_modules")) {
    return false;
  }
  return !(await hasManifest(path.join(workspaceRoot, relativeDir)));
};

/**
 * Returns the workspace-relative, unmanifested `_modules` directories consumed
 * by the Terraform project at `projectRoot`, including transitive modules.
 * Runs `terraform get` and `terraform modules -json` in a temporary
 * `TF_DATA_DIR`, so no backend or provider is initialized.
 */
export const getSharedModuleDirectories = async (
  workspaceRoot: string,
  projectRoot: string,
): Promise<string[]> => {
  const absoluteProjectRoot = path.join(workspaceRoot, projectRoot);
  const tfDataDir = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-terraform-modules-"),
  );
  try {
    await runTerraform(["get", "-no-color"], absoluteProjectRoot, tfDataDir);
    const declaredOutput = await runTerraform(
      ["modules", "-json"],
      absoluteProjectRoot,
      tfDataDir,
    );
    const declared = parseTerraformJson(
      declaredOutput,
      declaredModulesSchema,
      "terraform modules -json",
    );
    const localSources = new Set(
      (declared.modules ?? [])
        .map((module) => module.source)
        .filter((source) => isLocalSource(source)),
    );
    if (localSources.size === 0) {
      return [];
    }

    const installedPath = path.join(tfDataDir, "modules", "modules.json");
    let installedText: string;
    try {
      installedText = await fs.readFile(installedPath, "utf-8");
    } catch (error) {
      throw new Error(
        `"terraform get" did not write the installed modules manifest in ${projectRoot}`,
        { cause: error },
      );
    }
    const installed = parseTerraformJson(
      installedText,
      installedModulesSchema,
      "terraform get (modules/modules.json)",
    );
    const directories = new Set<string>();
    for (const module of installed.Modules) {
      if (module.Key === "" || !localSources.has(module.Source)) {
        continue;
      }
      const relativeDir = path.relative(
        workspaceRoot,
        path.resolve(absoluteProjectRoot, module.Dir),
      );
      if (await isSharedModuleDirectory(workspaceRoot, relativeDir)) {
        directories.add(relativeDir.split(path.sep).join("/"));
      }
    }
    const result = Array.from(directories).sort();
    logger.debug("Resolved shared module directories", {
      directories: result,
      projectRoot,
    });
    return result;
  } finally {
    await fs.rm(tfDataDir, { force: true, recursive: true });
  }
};
