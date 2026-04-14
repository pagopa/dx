import { ProjectFileMap } from "@nx/devkit";
import path from "node:path";
import { describe, expect, it } from "vitest";

import {
  getProjectNameFromRoot,
  getTerraformProjectFiles,
} from "../project.ts";

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

describe("getProjectNameFromRoot", () => {
  describe("infra segment removal", () => {
    it("removes 'infra' segment from path", () => {
      const result = getProjectNameFromRoot(
        path.join("infra", "resources", "dev"),
      );
      expect(result).toBe("resources-dev");
    });
  });

  describe("_modules segment replacement", () => {
    it("replaces '_modules' with 'modules'", () => {
      const result = getProjectNameFromRoot(
        path.join("infra", "_modules", "azure"),
      );
      expect(result).toBe("modules-azure");
    });
  });

  describe("underscore to hyphen replacement", () => {
    it("replaces underscores with hyphens in segments", () => {
      const result = getProjectNameFromRoot(
        path.join("infra", "my_module", "some_resource"),
      );
      expect(result).toBe("my-module-some-resource");
    });

    it("replaces multiple underscores in a single segment", () => {
      const result = getProjectNameFromRoot("my_long_segment_name");
      expect(result).toBe("my-long-segment-name");
    });
  });

  describe("combined transformations", () => {
    it("applies all transformations together", () => {
      const result = getProjectNameFromRoot(
        path.join("infra", "_modules", "azure_networking", "subnet_config"),
      );
      expect(result).toBe("modules-azure-networking-subnet-config");
    });

    it("handles a typical resources path", () => {
      const result = getProjectNameFromRoot(
        path.join("infra", "resources", "prod", "azure_storage"),
      );
      expect(result).toBe("resources-prod-azure-storage");
    });

    it("handles a typical modules path", () => {
      const result = getProjectNameFromRoot(
        path.join("infra", "_modules", "azure", "app_service"),
      );
      expect(result).toBe("modules-azure-app-service");
    });
  });

  describe("edge cases", () => {
    it("returns an empty string for an empty path", () => {
      const result = getProjectNameFromRoot("");
      expect(result).toBe("");
    });

    it("handles a single non-special segment", () => {
      const result = getProjectNameFromRoot("my_project");
      expect(result).toBe("my-project");
    });

    it("handles segments with no special characters", () => {
      const result = getProjectNameFromRoot(path.join("packages", "my-lib"));
      expect(result).toBe("my-lib");
    });
  });
});
