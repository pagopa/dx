import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseOptions } from "../options.ts";
import { getProject } from "../project.ts";

describe("Terraform project tags", () => {
  it("preserves tags declared in the project package.json", async () => {
    const temporaryWorkspaceRoot = await fs.mkdtemp(
      path.join(os.tmpdir(), "nx-terraform-plugin-"),
    );
    const root = path.join("infra", "modules", "tagged-module");
    const packageRoot = path.join(temporaryWorkspaceRoot, root);

    try {
      await fs.mkdir(packageRoot, { recursive: true });
      await fs.writeFile(
        path.join(packageRoot, "package.json"),
        JSON.stringify({
          nx: {
            tags: ["release:npm"],
          },
        }),
        "utf-8",
      );

      const project = getProject(
        parseOptions(undefined),
        temporaryWorkspaceRoot,
        root,
      );

      expect(project.tags).toContain("release:npm");
      expect(project.tags).toContain("terraform");
    } finally {
      await fs.rm(temporaryWorkspaceRoot, { force: true, recursive: true });
    }
  });
});
