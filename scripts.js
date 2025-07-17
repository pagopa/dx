import { $ } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

const toolchain = {
  terraform: {
    format: "terraform fmt",
    "format:check": "terraform fmt -check",
  },
  javascript: {
    format: "prettier --write .",
    "format:check": "prettier --check .",
  },
  go: {
    format: "go fmt",
    "format:check": "go fmt -l",
  },
};

function getLanguage(workspacePath) {
  if (workspacePath.startsWith("infra")) {
    return "terraform";
  }
  if (workspacePath.startsWith("providers")) {
    return "go";
  }
  return "javascript";
}

async function updatePackageScripts(workspacePath) {
  const packageJsonPath = path.join(workspacePath, "package.json");
  const content = await fs.readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(content);
  packageJson.scripts = packageJson.scripts || {};
  Object.assign(packageJson.scripts, toolchain[getLanguage(workspacePath)]);
  await fs.writeFile(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + "\n",
    "utf8",
  );
}

async function run() {
  const { stdout } = await $({
    env: {
      TURBO_PRINT_VERSION_DISABLED: 1,
    },
  })("turbo", ["ls", "--output", "json"]);
  const workspace = JSON.parse(stdout);
  return Promise.all(
    workspace.packages.items.map((ws) => updatePackageScripts(ws.path)),
  );
}

await run().catch((e) => {
  console.error("Error running script:", e);
  process.exit(1);
});
