import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, onTestFinished, vi } from "vitest";

const runCommand = vi.hoisted(() =>
  vi.fn<
    (
      file: string,
      args: readonly string[],
      options: { cwd: string; env: { TF_DATA_DIR: string } },
    ) => Promise<{ stdout: string }>
  >(),
);

vi.mock("../logger.ts", () => ({
  getPackageLogger: () => ({ debug: vi.fn() }),
}));

vi.mock("execa", () => ({
  execa: (
    file: string,
    args: readonly string[],
    options: { cwd: string; env: { TF_DATA_DIR: string } },
  ) => runCommand(file, args, options),
}));

import { getSharedModuleDirectories } from "../terraform-modules.ts";

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-tf-modules-test-"),
  );
  onTestFinished(async () => {
    await fs.rm(workspaceRoot, { force: true, recursive: true });
  });
  return workspaceRoot;
};

const writeFile = async (filePath: string, content = "") => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
};

interface TerraformCall {
  args: readonly string[];
  cwd: string;
  tfDataDir: string;
}

/**
 * Fakes the Terraform CLI: `get` writes the installed modules manifest into
 * TF_DATA_DIR, and `modules -json` returns the declared modules.
 */
const mockTerraform = ({
  declared,
  installed,
}: {
  declared: unknown;
  installed?: unknown;
}) => {
  const calls: TerraformCall[] = [];
  runCommand.mockImplementation(async (_file, args, options) => {
    const tfDataDir = options.env.TF_DATA_DIR;
    calls.push({ args, cwd: options.cwd, tfDataDir });
    if (args[0] === "get") {
      if (installed !== undefined) {
        await writeFile(
          path.join(tfDataDir, "modules", "modules.json"),
          JSON.stringify(installed),
        );
      }
      return { stdout: "" };
    }
    return { stdout: JSON.stringify(declared) };
  });
  return calls;
};

const declaredAlphaAndBeta = {
  format_version: "1.0",
  modules: [
    { key: "alpha", source: "../_modules/alpha", version: "" },
    { key: "beta", source: "../beta", version: "" },
  ],
};

const installedAlphaAndBeta = {
  Modules: [
    { Dir: ".", Key: "", Source: "" },
    { Dir: "../_modules/alpha", Key: "alpha", Source: "../_modules/alpha" },
    { Dir: "../_modules/beta", Key: "alpha.beta", Source: "../beta" },
  ],
};

afterEach(() => {
  runCommand.mockReset();
});

describe("getSharedModuleDirectories", () => {
  it("returns unmanifested _modules directories, including transitive ones", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("infra", "dev");
    mockTerraform({
      declared: declaredAlphaAndBeta,
      installed: installedAlphaAndBeta,
    });

    const result = await getSharedModuleDirectories(workspaceRoot, projectRoot);

    expect(result).toEqual(["infra/_modules/alpha", "infra/_modules/beta"]);
  });

  it("runs only get and modules -json in an isolated temporary TF_DATA_DIR", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("infra", "dev");
    const calls = mockTerraform({
      declared: declaredAlphaAndBeta,
      installed: installedAlphaAndBeta,
    });

    await getSharedModuleDirectories(workspaceRoot, projectRoot);

    expect(calls.map((call) => call.args)).toEqual([
      ["get", "-no-color"],
      ["modules", "-json"],
    ]);
    expect(calls.map((call) => call.cwd)).toEqual([
      path.join(workspaceRoot, projectRoot),
      path.join(workspaceRoot, projectRoot),
    ]);
    expect(path.isAbsolute(calls[0].tfDataDir)).toBe(true);
    expect(calls[0].tfDataDir).toBe(calls[1].tfDataDir);
    expect(calls[0].tfDataDir).not.toBe(process.env.TF_DATA_DIR);
    await expect(fs.access(calls[0].tfDataDir)).rejects.toThrow();
  });

  it("excludes modules that declare a module.json manifest", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("infra", "dev");
    await writeFile(
      path.join(workspaceRoot, "infra/_modules/beta/module.json"),
    );
    mockTerraform({
      declared: declaredAlphaAndBeta,
      installed: installedAlphaAndBeta,
    });

    const result = await getSharedModuleDirectories(workspaceRoot, projectRoot);

    expect(result).toEqual(["infra/_modules/alpha"]);
  });

  it("excludes remote, outside-workspace, and non-_modules local modules", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("infra", "dev");
    mockTerraform({
      declared: {
        modules: [
          { key: "remote", source: "terraform-aws-modules/vpc/aws" },
          { key: "outside", source: "../../../../outside" },
          { key: "local", source: "../local" },
        ],
      },
      installed: {
        Modules: [
          { Dir: "", Key: "", Source: "" },
          {
            Dir: ".terraform/modules/remote",
            Key: "remote",
            Source: "terraform-aws-modules/vpc/aws",
          },
          {
            Dir: "../../../../outside",
            Key: "outside",
            Source: "../../../../outside",
          },
          { Dir: "../local", Key: "local", Source: "../local" },
        ],
      },
    });

    const result = await getSharedModuleDirectories(workspaceRoot, projectRoot);

    expect(result).toEqual([]);
  });

  it("does not read the installed manifest when no local sources are declared", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    mockTerraform({
      declared: {
        modules: [{ key: "vpc", source: "terraform-aws-modules/vpc/aws" }],
      },
    });

    const result = await getSharedModuleDirectories(
      workspaceRoot,
      path.join("infra", "dev"),
    );

    expect(result).toEqual([]);
  });

  it("returns an empty list when the project declares no modules", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    mockTerraform({ declared: { format_version: "1.0", modules: [] } });

    const result = await getSharedModuleDirectories(
      workspaceRoot,
      path.join("infra", "dev"),
    );

    expect(result).toEqual([]);
  });

  it("treats a null modules list from terraform modules as no declared modules", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    mockTerraform({ declared: { format_version: "1.0", modules: null } });

    const result = await getSharedModuleDirectories(
      workspaceRoot,
      path.join("infra", "dev"),
    );

    expect(result).toEqual([]);
  });

  it("ignores stale installed entries whose source is no longer declared", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const projectRoot = path.join("infra", "dev");
    mockTerraform({
      declared: {
        modules: [{ key: "alpha", source: "../_modules/gamma" }],
      },
      installed: {
        Modules: [
          { Dir: "", Key: "", Source: "" },
          {
            Dir: "../_modules/alpha",
            Key: "alpha",
            Source: "../_modules/alpha",
          },
          { Dir: "../_modules/beta", Key: "alpha.beta", Source: "../beta" },
          {
            Dir: "../_modules/gamma",
            Key: "alpha",
            Source: "../_modules/gamma",
          },
        ],
      },
    });

    const result = await getSharedModuleDirectories(workspaceRoot, projectRoot);

    expect(result).toEqual(["infra/_modules/gamma"]);
  });
});

describe("getSharedModuleDirectories failures", () => {
  it("reports a clear error when the Terraform CLI is missing", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    runCommand.mockRejectedValue(
      Object.assign(new Error("spawn terraform ENOENT"), { code: "ENOENT" }),
    );

    await expect(
      getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
    ).rejects.toThrow("Terraform CLI not found");
  });

  it("explains the minimum version when the modules command fails", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    runCommand.mockImplementation(async (_file, args) => {
      if (args[0] === "modules") {
        throw Object.assign(new Error("exit 1"), {
          stderr: "Unknown command: modules",
        });
      }
      return { stdout: "" };
    });

    await expect(
      getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
    ).rejects.toThrow("requires Terraform 1.10 or later");
  });

  it("surfaces get failures with their stderr", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    runCommand.mockRejectedValue(
      Object.assign(new Error("exit 1"), {
        stderr: "Error: Failed to download module",
      }),
    );

    await expect(
      getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
    ).rejects.toThrow("Failed to download module");
  });

  it("rejects invalid JSON from modules -json", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    runCommand.mockImplementation(async (_file, args) => ({
      stdout: args[0] === "modules" ? "not json" : "",
    }));

    await expect(
      getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
    ).rejects.toThrow('Invalid JSON returned by "terraform modules -json"');
  });

  it("rejects modules -json output that does not match the expected shape", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    mockTerraform({ declared: { format_version: "1.0" } });

    await expect(
      getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
    ).rejects.toThrow(
      'Unexpected output returned by "terraform modules -json"',
    );
  });

  it("reports a missing installed manifest instead of returning empty inputs", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    mockTerraform({ declared: declaredAlphaAndBeta });

    await expect(
      getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
    ).rejects.toThrow("did not write the installed modules manifest");
  });

  it("propagates manifest-check errors other than a missing module.json", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    await writeFile(path.join(workspaceRoot, "infra/_modules/alpha/main.tf"));
    mockTerraform({
      declared: declaredAlphaAndBeta,
      installed: installedAlphaAndBeta,
    });
    const modulesRoot = path.join(workspaceRoot, "infra/_modules");
    await fs.chmod(modulesRoot, 0o000);

    try {
      await expect(
        getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
      ).rejects.toThrow("EACCES");
    } finally {
      await fs.chmod(modulesRoot, 0o755);
    }
  });

  it("removes its temporary TF_DATA_DIR when Terraform fails", async () => {
    const workspaceRoot = await createWorkspaceRoot();
    const calls: TerraformCall[] = [];
    runCommand.mockImplementation(async (_file, args, options) => {
      calls.push({ args, cwd: options.cwd, tfDataDir: options.env.TF_DATA_DIR });
      throw Object.assign(new Error("exit 1"), { stderr: "boom" });
    });

    await expect(
      getSharedModuleDirectories(workspaceRoot, path.join("infra", "dev")),
    ).rejects.toThrow("boom");

    await expect(fs.access(calls[0].tfDataDir)).rejects.toThrow();
  });
});
