/** Verifies Nx-compatible plugin options preserve DX Docker conventions. */
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";

import { parseDockerReleasePluginOptions } from "../options.ts";

const workspaceRoots: string[] = [];

const createWorkspaceRoot = async () => {
  const workspaceRoot = await fs.mkdtemp(
    path.join(os.tmpdir(), "nx-dx-docker-plugin-options-"),
  );
  workspaceRoots.push(workspaceRoot);
  await fs.writeFile(
    path.join(workspaceRoot, "package.json"),
    '{"name":"@pagopa/dx"}',
  );
  await fs.writeFile(path.join(workspaceRoot, "nx.json"), "{}");
  return workspaceRoot;
};

afterEach(async () => {
  await Promise.all(
    workspaceRoots
      .splice(0)
      .map((workspaceRoot) =>
        fs.rm(workspaceRoot, { force: true, recursive: true }),
      ),
  );
});

describe("parseDockerReleasePluginOptions", () => {
  it("accepts Nx build target settings and extracts the configured platform", async () => {
    const workspaceRoot = await createWorkspaceRoot();

    const options = parseDockerReleasePluginOptions(
      {
        buildTarget: {
          args: ["--platform linux/amd64"],
          metadata: { tags: ["type=sha"] },
          name: "docker:build",
        },
        runTarget: "docker:run",
      },
      workspaceRoot,
    );

    expect(options.platform).toBe("linux/amd64");
    expect(options.buildTargetName).toBe("docker:build");
  });
});
