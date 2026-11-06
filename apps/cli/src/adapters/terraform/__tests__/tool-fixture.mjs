#!/usr/bin/env node
/**
 * Executable external-tool protocol fixture. It never imports application code.
 */
import { spawnSync } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { clearInterval, setInterval } from "node:timers";
import { isDeepStrictEqual } from "node:util";
import { z } from "zod/v4";

const control = z
  .object({
    remote: z.string(),
    root: z.string(),
    terraform: z.string(),
  })
  .parse(JSON.parse(await fs.readFile(process.env.DX_TEST_CONTROL, "utf8")));
const scenario = z
  .object({
    activeKey: z.string().optional(),
    failure: z
      .enum([
        "migration",
        "apply",
        "recovery-replan",
        "release-source",
        "state-push",
        "state-race",
        "workflow-permissions",
      ])
      .optional(),
    migratedState: z.string().optional(),
    pulledState: z.string().optional(),
    workspace: z.string().default("default"),
  })
  .parse(
    JSON.parse(
      await fs.readFile(path.join(control.root, "scenario.json"), "utf8"),
    ),
  );
const tool = path.basename(process.argv[1]);
const args = process.argv.slice(2);
const output = (value) => process.stdout.write(value);
const optionalFile = async (filename) => {
  try {
    return await fs.readFile(filename, "utf8");
  } catch (cause) {
    if (cause instanceof Error && cause.code === "ENOENT") {
      return undefined;
    }
    throw cause;
  }
};

if (tool === "terraform") {
  if (args[0] === "-version") {
    output("Terraform v1.16.0\n");
  } else if (args.join(" ") === "workspace show") {
    output(`${scenario.workspace}\n`);
  } else if (args[0] === "fmt") {
    const result = spawnSync(control.terraform, args, { stdio: "inherit" });
    process.exitCode = result.status ?? 1;
  } else if (args[0] === "init") {
    const providers = await fs.readFile("providers.tf", "utf8");
    const override = await optionalFile("repository-state_override.tf");
    const local =
      override !== undefined || !providers.includes('backend "azurerm"');
    const syntax = spawnSync(control.terraform, ["fmt", "-"], {
      encoding: "utf8",
      input: providers,
    });
    if (syntax.status !== 0) {
      throw new Error(`Terraform rejected backend HCL: ${syntax.stderr}`);
    }
    const configuration = {};
    if (!local) {
      for (const name of [
        "container_name",
        "key",
        "resource_group_name",
        "storage_account_name",
        "subscription_id",
      ]) {
        const literal = new RegExp(
          `^\\s*${name}\\s*=\\s*("(?:[^"\\\\]|\\\\.)*")`,
          "m",
        ).exec(syntax.stdout)?.[1];
        if (!literal) {
          throw new Error(`Backend is missing a literal ${name}.`);
        }
        configuration[name] = JSON.parse(literal);
      }
    }
    await fs.mkdir(".terraform", { recursive: true });
    await fs.writeFile(
      ".terraform/terraform.tfstate",
      JSON.stringify({
        backend: {
          config: scenario.activeKey
            ? { ...configuration, key: scenario.activeKey }
            : configuration,
          type: local ? "local" : "azurerm",
        },
      }),
    );
    if (args.includes("-migrate-state")) {
      if (scenario.failure === "migration") {
        throw new Error("Simulated external Terraform migration failure");
      }
      const state =
        scenario.migratedState ??
        (await fs.readFile("terraform.tfstate", "utf8"));
      const target = path.join(
        control.root,
        "blobs",
        `${configuration.storage_account_name}.blob.core.windows.net`,
        configuration.container_name,
        configuration.key,
      );
      await fs.mkdir(path.dirname(target), { recursive: true });
      await fs.writeFile(target, state);
      if (scenario.failure === "release-source") {
        await fs.rm("terraform.tfstate");
        throw new Error("Simulated interruption after transfer");
      }
    }
  } else if (args[0] === "state" && args[1] === "pull") {
    output(scenario.pulledState ?? (await fs.readFile(control.remote, "utf8")));
  } else if (args[0] === "import" && args[1] === "-input=false") {
    const known = JSON.parse(
      await fs.readFile(
        path.join(control.root, "provider-import-state.json"),
        "utf8",
      ),
    );
    const current = await optionalFile(control.remote);
    const state = current
      ? JSON.parse(current)
      : { ...known, resources: [], serial: 0 };
    const resource = known.resources.find(
      (resource) =>
        `${resource.module}.${resource.type}.${resource.name}` === args[2],
    );
    const expected = JSON.parse(
      await fs.readFile(
        path.join(control.root, "provider-import-ids.json"),
        "utf8",
      ),
    );
    if (!resource || expected[args[2]] !== args[3]) {
      throw new Error("Unexpected standalone provider import.");
    }
    if (
      state.resources.some(
        (entry) => `${entry.module}.${entry.type}.${entry.name}` === args[2],
      )
    ) {
      throw new Error("Resource already managed by Terraform.");
    }
    state.resources.push(resource);
    state.serial += 1;
    await fs.mkdir(path.dirname(control.remote), { recursive: true });
    await fs.writeFile(control.remote, JSON.stringify(state));
  } else if (args[0] === "state" && args[1] === "push") {
    if (args.length !== 3 || args[2].startsWith("-")) {
      throw new Error(
        "Recovery must retain state-push lineage, serial and locking guards.",
      );
    }
    if ((await fs.stat(args[2])).mode % 0o1000 !== 0o600) {
      throw new Error("Recovery state must be private.");
    }
    if (scenario.failure === "state-push") {
      throw new Error("State persistence interrupted.");
    }
    if (scenario.failure === "state-race") {
      const current = JSON.parse(await fs.readFile(control.remote, "utf8"));
      await fs.writeFile(
        control.remote,
        JSON.stringify({
          ...current,
          outputs: {
            ...current.outputs,
            operator: { sensitive: false, type: "string", value: "concurrent" },
          },
          serial: current.serial + 2,
        }),
      );
    }
    const directory = await fs.mkdtemp(path.join(control.root, "state-push-"));
    await fs.copyFile(
      control.remote,
      path.join(directory, "terraform.tfstate"),
    );
    const pushed = spawnSync(control.terraform, ["state", "push", args[2]], {
      cwd: directory,
      encoding: "utf8",
      env: { ...process.env, TF_DATA_DIR: path.join(directory, ".terraform") },
    });
    if (pushed.status !== 0) {
      throw new Error(
        `Terraform rejected state reconciliation: ${pushed.stderr}`,
      );
    }
    await fs.copyFile(
      path.join(directory, "terraform.tfstate"),
      control.remote,
    );
  } else if (args[0] === "plan") {
    const filename = args.find((arg) => arg.startsWith("-out="))?.slice(5);
    if (!filename) {
      throw new Error("Recovery fixture requires a saved Terraform plan.");
    }
    const configuration = (
      await Promise.all(
        (await fs.readdir("."))
          .filter((name) => name.endsWith(".tf"))
          .map((name) => fs.readFile(name, "utf8")),
      )
    ).join("\n");
    const hasImports = /\bimport\s*\{/.test(configuration);
    const plan = JSON.parse(
      await fs.readFile(
        path.join(
          control.root,
          hasImports ? "imported-recovery-plan.json" : "recovery-plan.json",
        ),
        "utf8",
      ),
    );
    const current = await optionalFile(control.remote);
    if (hasImports && current) {
      const state = JSON.parse(current);
      for (const resource of plan.resource_changes) {
        const managed = state.resources.find(
          (entry) =>
            `${entry.module}.${entry.type}.${entry.name}` === resource.address,
        );
        if (managed) {
          delete resource.change.importing;
          if (
            resource.type === "github_branch_protection" &&
            managed.instances[0].attributes.repository_id === "test-repo" &&
            resource.change.after.repository_id === "test-repo" &&
            isDeepStrictEqual(resource.change.replace_paths, [
              ["repository_id"],
            ])
          ) {
            if (scenario.failure === "recovery-replan") {
              throw new Error(
                "Provider unavailable after state reconciliation.",
              );
            }
            resource.change = {
              actions: ["no-op"],
              after: managed.instances[0].attributes,
              before: managed.instances[0].attributes,
            };
          }
        }
      }
    }
    await fs.writeFile(
      filename,
      JSON.stringify({
        imports: hasImports ? configuration : null,
        plan,
      }),
    );
  } else if (args[0] === "show" && args[1] === "-json") {
    const saved = z
      .object({ plan: z.json() })
      .parse(JSON.parse(await fs.readFile(args[2], "utf8")));
    output(JSON.stringify(saved.plan));
  } else if (args[0] === "apply" && args[1] === "-input=false") {
    const saved = z
      .object({
        imports: z.string(),
        plan: z.object({
          resource_changes: z.array(
            z.object({
              address: z.string(),
              change: z.object({ actions: z.array(z.string()) }),
              type: z.string(),
            }),
          ),
        }),
      })
      .parse(JSON.parse(await fs.readFile(args[2], "utf8")));
    const formatted = spawnSync(control.terraform, ["fmt", "-"], {
      encoding: "utf8",
      input: saved.imports,
    });
    if (formatted.status !== 0) {
      throw new Error(`Terraform rejected recovery HCL: ${formatted.stderr}`);
    }
    const actual = new Map();
    for (const match of formatted.stdout.matchAll(/\bimport\s*\{([^{}]*)\}/g)) {
      const address = /^\s*to\s*=\s*(.+)$/m.exec(match[1])?.[1].trim();
      const literal = /^\s*id\s*=\s*("(?:[^"\\]|\\.)*")$/m.exec(match[1])?.[1];
      if (!address || !literal || /\bprovider\s*=/.test(match[1])) {
        throw new Error(
          "Provider import contract rejects the generated child-module import.",
        );
      }
      actual.set(address, JSON.parse(literal));
    }
    const expected = z
      .record(z.string(), z.string())
      .parse(
        JSON.parse(
          await fs.readFile(
            path.join(control.root, "provider-import-ids.json"),
            "utf8",
          ),
        ),
      );
    for (const [address, id] of Object.entries(expected)) {
      if (actual.get(address) !== id) {
        throw new Error(`Provider import ID mismatch for ${address}`);
      }
    }
    if (actual.size !== Object.keys(expected).length) {
      throw new Error("Unexpected resource import in saved recovery plan.");
    }
    await fs.mkdir(path.dirname(control.remote), { recursive: true });
    const state = JSON.parse(
      await fs.readFile(
        path.join(
          control.root,
          scenario.failure === "apply"
            ? "partial-recovery.tfstate"
            : scenario.failure === "workflow-permissions"
              ? "tainted-recovery.tfstate"
              : "recovered.tfstate",
        ),
        "utf8",
      ),
    );
    for (const resource of state.resources) {
      const address = `${resource.module}.${resource.type}.${resource.name}`;
      if (
        saved.plan.resource_changes.some(
          (change) =>
            change.address === address &&
            change.type.startsWith("github_") &&
            change.change.actions.includes("delete"),
        )
      ) {
        for (const instance of resource.instances) {
          instance.attributes.id = "replaced-github-resource";
        }
      }
    }
    await fs.writeFile(control.remote, JSON.stringify(state));
    if (
      scenario.failure === "apply" ||
      scenario.failure === "workflow-permissions"
    ) {
      throw new Error(
        "Provider interrupted after importing only the repository.",
      );
    }
  } else if (args[0] === "apply" && args.includes("-auto-approve")) {
    const providers = await fs.readFile("providers.tf", "utf8");
    if (providers.includes('backend "azurerm"')) {
      await fs.writeFile(
        path.join(control.root, "environment-applied"),
        "applied",
      );
    } else {
      await fs.copyFile(
        path.join(control.root, "known-repository.tfstate"),
        "terraform.tfstate",
      );
    }
  } else if (args[0] === "hold") {
    const interval = setInterval(() => output(""), 1000);
    const stopped = new Promise((resolve) => {
      process.once("SIGTERM", async () => {
        await fs.writeFile(path.join(control.root, "child-stopped"), "stopped");
        clearInterval(interval);
        resolve();
        process.exit(0);
      });
    });
    await fs.writeFile(
      path.join(control.root, "child-pid"),
      JSON.stringify(process.pid),
    );
    await fs.writeFile(path.join(control.root, "child-ready"), "ready");
    await stopped;
  } else {
    throw new Error(
      `Unimplemented Terraform fixture operation: ${args.join(" ")}`,
    );
  }
} else if (
  tool === "mise" &&
  ["--version", "exec", "install", "lock", "trust", "use"].includes(args[0])
) {
  output("mise fixture\n");
} else if (tool === "az" && args.join(" ") === "account show") {
  output('{"user":{"name":"fixture@example.test"}}');
} else if (tool === "az" && args.join(" ") === "group list") {
  output("[]");
} else if (
  tool === "git" &&
  args.join(" ") === "config --get remote.origin.url"
) {
  output("git@github.com:pagopa/test-repo.git\n");
} else if (tool === "git" && args.join(" ") === "config --get user.name") {
  output("Fixture User\n");
} else if (tool === "git" && args.join(" ") === "config --get user.email") {
  output("fixture@example.test\n");
} else if (
  tool === "git" &&
  [
    "add",
    "checkout",
    "commit",
    "fetch",
    "init",
    "push",
    "remote",
    "reset",
  ].includes(args[0])
) {
  output("");
} else if (
  tool === "gh" &&
  args.slice(0, 3).join(" ") === "api --paginate --slurp"
) {
  const pages = z
    .record(z.string(), z.json())
    .parse(
      JSON.parse(
        await fs.readFile(path.join(control.root, "github-pages.json"), "utf8"),
      ),
    );
  const response = pages[args[3]];
  if (response === undefined) {
    throw new Error(`Unexpected GitHub API endpoint: ${args[3]}`);
  }
  output(JSON.stringify(response));
} else {
  throw new Error(
    `Unimplemented tool fixture operation: ${tool} ${args.join(" ")}`,
  );
}
