import type { TestProject } from "vitest/node";

/**
 * Builds and packs the package once per integration run. Suites that exercise
 * the published artifact reuse the tarball through `getPackedPackageTarballPath`
 * instead of paying for a build and a pack each.
 */
import { globSync } from "node:fs";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

import { runProcess } from "./dependency-tracking-test-helpers";
import { packedPackageTarballPathKey } from "./packed-package-provided-context";

const packageRoot = fileURLToPath(new URL("../../", import.meta.url));

const packPackage = async (workDirectory: string) => {
  const tarballDirectory = join(workDirectory, "tarball");
  await mkdir(tarballDirectory);

  await runProcess("pnpm", ["run", "build"], "The package build failed.", {
    cwd: packageRoot,
  });
  await runProcess(
    "pnpm",
    ["pack", "--pack-destination", tarballDirectory],
    "Packing the package failed.",
    { cwd: packageRoot },
  );

  const [tarball] = globSync("*.tgz", { cwd: tarballDirectory });

  if (tarball === undefined) {
    throw new Error("pnpm pack did not produce a tarball.");
  }

  return join(tarballDirectory, tarball);
};

export default async function setup(project: TestProject) {
  const workDirectory = await mkdtemp(join(tmpdir(), "azure-tracing-package-"));

  try {
    project.provide(
      packedPackageTarballPathKey,
      await packPackage(workDirectory),
    );
  } catch (error) {
    await rm(workDirectory, { force: true, recursive: true });
    throw error;
  }

  return async () => {
    await rm(workDirectory, { force: true, recursive: true });
  };
}
