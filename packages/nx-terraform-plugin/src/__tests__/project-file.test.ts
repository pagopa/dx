import { ProjectFileMap } from "@nx/devkit";
import path from "node:path";
import { describe, expect, it } from "vitest";

import { getTerraformProjectFiles } from "../project-file.ts";

describe("getTerraformProjectFiles", () => {
  it("returns only .tf files with the originating project", () => {
    const projectFileMap: ProjectFileMap = {
      terraformA: [
        { file: path.join("infra", "resources", "dev", "main.tf"), hash: "" },
        {
          file: path.join("infra", "resources", "dev", "variables.tfvars"),
          hash: "",
        },
      ],
      terraformB: [
        {
          file: path.join("infra", "resources", "prod", "network.tf"),
          hash: "",
        },
        {
          file: path.join("infra", "resources", "prod", "README.md"),
          hash: "",
        },
      ],
    };

    const result = getTerraformProjectFiles(projectFileMap);

    expect(result).toEqual([
      {
        fileName: path.join("infra", "resources", "dev", "main.tf"),
        project: "terraformA",
      },
      {
        fileName: path.join("infra", "resources", "prod", "network.tf"),
        project: "terraformB",
      },
    ]);
  });

  it("returns an empty array when no terraform files are present", () => {
    const projectFileMap: ProjectFileMap = {
      docs: [{ file: "README.md", hash: "" }],
      scripts: [{ file: "scripts/check.sh", hash: "" }],
    };

    const result = getTerraformProjectFiles(projectFileMap);

    expect(result).toEqual([]);
  });
});
