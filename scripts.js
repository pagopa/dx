import { $ } from "execa";
import fs from "node:fs/promises";
import path from "node:path";

const toolchain = {
  "terraform-module": {
    format: "terraform fmt",
    "format:check": "terraform fmt -check",
    validate: "terraform validate",
    init: "terraform init",
  },
  terraform: {
    format: "terraform fmt",
    "format:check": "terraform fmt -check",
    plan: "terraform plan",
    init: "terraform init",
    validate: "terraform validate",
  },
  javascript: {
    format: "prettier --write .",
    "format:check": "prettier --check .",
  },
  go: {
    format: "go fmt",
    "format:check": "gofmt -l main.go",
  },
};

function getToolchain(ws) {
  if (ws.path.startsWith("infra/modules")) {
    return toolchain["terraform-module"];
  }
  if (ws.path.startsWith("infra/scripts")) {
    return toolchain.javascript;
  }
  if (ws.path.startsWith("infra")) {
    return toolchain.terraform;
  }
  if (ws.path.startsWith("providers")) {
    return toolchain.go;
  }
  return toolchain.javascript;
}

async function updatePackageScripts(ws) {
  const packageJsonPath = path.join(ws.path, "package.json");
  const content = await fs.readFile(packageJsonPath, "utf8");
  const packageJson = JSON.parse(content);
  packageJson.scripts = packageJson.scripts || {};
  Object.assign(packageJson.scripts, getToolchain(ws));
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
    workspace.packages.items.map((ws) => updatePackageScripts(ws)),
  );
}

await run().catch((e) => {
  console.error("Error running script:", e);
  process.exit(1);
});
