import { beforeEach, describe, expect, test, vi } from "vitest";
import YAML from "yaml";

import {
  extractPackageExtensions,
  NPM,
  preparePackageJsonForPnpm,
  usePnpm,
  writePnpmWorkspaceFile,
  Yarn,
} from "../use-pnpm.js";

const { readFile, stdout, writeFile } = vi.hoisted(() => ({
  readFile: vi.fn(async () => ""),
  stdout: vi.fn(),
  writeFile: vi.fn(),
}));

vi.mock("execa", () => ({
  $: vi.fn((opts) => {
    const hasOptions = typeof opts === "object" && Object.hasOwn(opts, "lines");
    if (hasOptions) {
      return () =>
        stdout().then((output: string) => ({
          stdout: output.split("\n"),
        }));
    }
    return stdout().then((output: string) => ({
      stdout: output,
    }));
  }),
}));

vi.mock("node:fs/promises", () => ({
  default: {
    appendFile: () => Promise.resolve(),
    readFile,
    rm: () => Promise.resolve(),
    stat: () =>
      Promise.resolve({
        isFile: () => true,
      }),
    writeFile,
  },
}));

vi.mock("../git.js", async () => ({
  getLatestCommitShaOrRef: async () => "dummy-sha",
}));

describe("pm", () => {
  test("yarn workspaces are parsed correctly", async () => {
    const yarn = new Yarn();
    stdout.mockResolvedValueOnce(
      `{"location":".","name":"io-messages"}\n{"location":"apps/citizen-func","name":"citizen-func"}`,
    );
    const workspaces = await yarn.listWorkspaces();
    expect(workspaces).toEqual(["io-messages", "citizen-func"]);
  });
  test("npm workspaces are parsed correctly", async () => {
    const npm = new NPM();
    stdout.mockResolvedValueOnce(
      `[{ "name": "io-messages", "location": "." },{ "name": "citizen-func", "location": "apps/citizen-func" }]`,
    );
    const workspaces = await npm.listWorkspaces();
    expect(workspaces).toEqual(["io-messages", "citizen-func"]);
  });
});

describe("extractPackageExtensions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("returns packageExtensions only if present", async () => {
    const yarnrc = {
      packageExtensions: {
        "some-package@*": {
          peerDependencies: {
            react: "*",
          },
        },
      },
    };
    readFile.mockResolvedValueOnce(YAML.stringify(yarnrc));
    await expect(extractPackageExtensions()).resolves.toEqual(
      yarnrc.packageExtensions,
    );
    expect(readFile).toHaveBeenCalledOnce();
  });
  test("returns undefined if packageExtensions is not present", async () => {
    const yarnrc = {
      someOtherField: {},
    };
    readFile.mockResolvedValueOnce(YAML.stringify(yarnrc));
    await expect(extractPackageExtensions()).resolves.toBeUndefined();
    expect(readFile).toHaveBeenCalledOnce();
  });
});

describe("preparePackageJsonForPnpm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("removes packageManager field and keeps workspaces", async () => {
    const packageJson = {
      name: "test-monorepo",
      packageManager: "yarn@1.22.10",
      version: "1.0.0",
      workspaces: ["packages/*"],
    };
    readFile.mockResolvedValueOnce(JSON.stringify(packageJson, null, 2));
    const workspaces = await preparePackageJsonForPnpm();
    expect(workspaces).toEqual(["packages/*"]);
    expect(readFile).toHaveBeenCalledOnce();
    expect(writeFile).toHaveBeenCalledWith(
      "package.json",
      JSON.stringify(
        {
          name: packageJson.name,
          version: packageJson.version,
        },
        null,
        2,
      ),
    );
  });
});

describe("writePnpmWorkspaceFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  test("writes pnpm-workspace.yaml with given workspaces", async () => {
    const workspaces = ["packages/*", "apps/*"];
    const packageExtensions = {
      "express@*": {
        peerDependencies: {
          typescript: "*",
        },
      },
    };
    await writePnpmWorkspaceFile(workspaces, packageExtensions);
    expect(writeFile).toHaveBeenCalledWith(
      "pnpm-workspace.yaml",
      expect.stringContaining(YAML.stringify({ packages: workspaces })),
      "utf-8",
    );
    expect(writeFile).toHaveBeenCalledWith(
      "pnpm-workspace.yaml",
      expect.stringContaining(YAML.stringify({ packageExtensions })),
      "utf-8",
    );
  });
});

describe("usePnpm", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });
  test("rejects if the project is already using pnpm", async () => {
    await expect(usePnpm("pnpm", "10.20")).rejects.toThrow();
  });
  test.each([
    { expected: false, version: "18.0.0" },
    { expected: false, version: "20.10.0" },
    { expected: false, version: "20.19.4" },
    { expected: true, version: "22.0.0" },
    { expected: true, version: "20.19.5" },
  ])(
    "rejects if Node.js version is less than required ($version)",
    async ({ expected, version }) => {
      stdout.mockResolvedValue("[]");
      readFile.mockResolvedValueOnce(
        JSON.stringify({ name: "test-monorepo", workspaces: [] }),
      );
      await expect(
        usePnpm("npm", version).then(
          () => true,
          () => false,
        ),
      ).resolves.toBe(expected);
    },
  );
  test("moves workspaces from package.json to pnpm-workspace.yaml", async () => {
    const packageJson = {
      name: "test-monorepo",
      packageManager: "yarn@1.22.10",
      version: "1.0.0",
      workspaces: ["packages/*"],
    };
    readFile.mockResolvedValueOnce(JSON.stringify(packageJson, null, 2));
    stdout.mockResolvedValue(`[]`); // npm list workspaces
    await usePnpm("npm", "22.0.0");
    expect(writeFile).toHaveBeenNthCalledWith(
      2,
      "pnpm-workspace.yaml",
      expect.stringContaining(
        YAML.stringify({
          packages: packageJson.workspaces,
        }),
      ),
      "utf-8",
    );
  });
});
