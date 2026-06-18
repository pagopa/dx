import { cpSync, mkdirSync, rmSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

const packageRoot = path.dirname(fileURLToPath(new URL("../package.json", import.meta.url)));
const distRoot = path.join(packageRoot, "dist");
const schemaSourcePath = path.join(
  packageRoot,
  "src",
  "executors",
  "release-publish",
  "schema.json",
);
const schemaDestinationDirectory = path.join(
  distRoot,
  "executors",
  "release-publish",
);

rmSync(distRoot, { force: true, recursive: true });

const tscResult = spawnSync("tsc", ["-p", "tsconfig.lib.json"], {
  cwd: packageRoot,
  shell: process.platform === "win32",
  stdio: "inherit",
});

if (tscResult.status !== 0) {
  process.exit(tscResult.status ?? 1);
}

mkdirSync(schemaDestinationDirectory, { recursive: true });
cpSync(schemaSourcePath, path.join(schemaDestinationDirectory, "schema.json"));