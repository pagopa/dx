import path from "node:path";
import { describe, expect, it } from "vitest";

import { parseOptions } from "../options.ts";
import { getProject, getProjectNameFromRoot } from "../project.ts";

const defaultOptions = parseOptions(undefined);
const customOptions = parseOptions({
  applyTargetName: "terraform-apply",
  consoleTargetName: "terraform-console",
  docsTargetName: "terraform-docs",
  formatTargetName: "terraform-format",
  initTargetName: "terraform-init",
  lintTargetName: "terraform-lint",
  outputTargetName: "terraform-output",
  planTargetName: "terraform-plan",
  testTargetName: "terraform-test",
  validateTargetName: "terraform-validate",
});

const expectedNamedInputs = {
  default: ["{projectRoot}/*.{tf,tfvars}"],
  examples: ["{projectRoot}/examples/**/*.{tf,tfvars}"],
  tests: [
    "{projectRoot}/tests/**/*.{tf,tfvars}",
    "{projectRoot}/tests/**/*.tftest.hcl",
  ],
};

const getExpectedLintTarget = (root: string) => ({
  cache: true,
  command: "tflint",
  inputs: ["default", "examples", "tests", "{workspaceRoot}/.tflint.hcl"],
  options: {
    args: [
      "--disable-rule=terraform_required_version",
      "--disable-rule=terraform_required_providers",
      "--config",
      path.relative(root, ".tflint.hcl") || ".tflint.hcl",
    ],
    cwd: "{projectRoot}",
  },
});

const getExpectedDocsTarget = () => ({
  cache: true,
  command: "terraform-docs markdown table",
  inputs: ["default", "{projectRoot}/README.md"],
  options: {
    args: [
      "--output-file",
      "README.md",
      "--output-mode",
      "inject",
      "--hide",
      "providers",
      "--lockfile=false",
      ".",
    ],
    cwd: "{projectRoot}",
  },
  outputs: ["{projectRoot}/README.md"],
});

const getTargetsOrThrow = (project: ReturnType<typeof getProject>) => {
  if (!project.targets) {
    throw new Error("Expected project targets to be defined");
  }
  return project.targets;
};

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

describe("getProject", () => {
  describe("when the root is an application", () => {
    it("returns an application project with all targets", () => {
      const root = path.join("infra", "resources", "prod", "my_stack");
      const project = getProject(defaultOptions, root);
      const targets = getTargetsOrThrow(project);

      expect(project.name).toBe("resources-prod-my-stack");
      expect(project.projectType).toBe("application");
      expect(project.root).toBe(root);
      expect(project.namedInputs).toEqual(expectedNamedInputs);
      expect(Object.keys(targets)).toEqual([
        "tf-init",
        "tf-fmt",
        "tf-test",
        "tf-validate",
        "tf-console",
        "tf-output",
        "tf-plan",
        "tf-apply",
      ]);
    });

    it("marks mutable targets as non-cacheable", () => {
      const root = path.join("infra", "resources", "prod", "my_stack");
      const targets = getTargetsOrThrow(getProject(defaultOptions, root));

      expect(targets["tf-console"]?.cache).toBe(false);
      expect(targets["tf-output"]?.cache).toBe(false);
      expect(targets["tf-plan"]?.cache).toBe(false);
      expect(targets["tf-apply"]?.cache).toBe(false);
    });

    it("marks deterministic targets as cacheable", () => {
      const root = path.join("infra", "resources", "prod", "my_stack");
      const targets = getTargetsOrThrow(getProject(defaultOptions, root));

      expect(targets["tf-init"]?.cache).toBe(true);
      expect(targets["tf-fmt"]?.cache).toBe(true);
      expect(targets["tf-test"]?.cache).toBe(true);
      expect(targets["tf-validate"]?.cache).toBe(true);
    });

    it("adds tflint when the root tflint config exists", () => {
      const root = path.join("infra", "resources", "prod", "my_stack");
      const targets = getTargetsOrThrow(getProject(defaultOptions, root, true));

      expect(Object.keys(targets)).toEqual([
        "tf-init",
        "tf-fmt",
        "tf-test",
        "tf-validate",
        "tflint",
        "tf-console",
        "tf-output",
        "tf-plan",
        "tf-apply",
      ]);
      expect(targets.tflint).toEqual(getExpectedLintTarget(root));
    });

    it("does not add terraform-docs to applications", () => {
      const root = path.join("infra", "resources", "prod", "my_stack");
      const targets = getTargetsOrThrow(getProject(defaultOptions, root));

      expect(Object.keys(targets)).toEqual([
        "tf-init",
        "tf-fmt",
        "tf-test",
        "tf-validate",
        "tf-console",
        "tf-output",
        "tf-plan",
        "tf-apply",
      ]);
      expect(targets["terraform-docs"]).toBeUndefined();
    });

    it("sets correct dependency chains", () => {
      const root = path.join("infra", "resources", "prod", "my_stack");
      const targets = getTargetsOrThrow(getProject(defaultOptions, root));

      expect(targets["tf-test"]?.dependsOn).toEqual(["tf-init"]);
      expect(targets["tf-plan"]?.dependsOn).toEqual(["tf-init"]);
      expect(targets["tf-apply"]?.dependsOn).toEqual(["tf-init"]);
    });
  });

  describe("when the root is a library", () => {
    it("classifies a modules root as a library without plan and apply", () => {
      const root = path.join("infra", "modules", "network_stack");
      const project = getProject(defaultOptions, root);
      const targets = getTargetsOrThrow(project);

      expect(project.name).toBe("modules-network-stack");
      expect(project.projectType).toBe("library");
      expect(project.root).toBe(root);
      expect(project.namedInputs).toEqual(expectedNamedInputs);
      expect(Object.keys(targets)).toEqual([
        "tf-init",
        "tf-fmt",
        "tf-test",
        "tf-validate",
        "terraform-docs",
        "tf-console",
        "tf-output",
      ]);
    });

    it("classifies an _modules root as a library", () => {
      const root = path.join("infra", "_modules", "network_stack");
      const project = getProject(defaultOptions, root);

      expect(project.projectType).toBe("library");
      expect(getTargetsOrThrow(project)["tf-plan"]).toBeUndefined();
      expect(getTargetsOrThrow(project)["tf-apply"]).toBeUndefined();
    });

    it("adds tflint to libraries when the root tflint config exists", () => {
      const root = path.join("infra", "modules", "network_stack");
      const targets = getTargetsOrThrow(getProject(defaultOptions, root, true));

      expect(Object.keys(targets)).toEqual([
        "tf-init",
        "tf-fmt",
        "tf-test",
        "tf-validate",
        "tflint",
        "terraform-docs",
        "tf-console",
        "tf-output",
      ]);
      expect(targets.tflint).toEqual(getExpectedLintTarget(root));
    });

    it("adds terraform-docs to libraries", () => {
      const root = path.join("infra", "modules", "network_stack");
      const targets = getTargetsOrThrow(getProject(defaultOptions, root));

      expect(Object.keys(targets)).toEqual([
        "tf-init",
        "tf-fmt",
        "tf-test",
        "tf-validate",
        "terraform-docs",
        "tf-console",
        "tf-output",
      ]);
      expect(targets["terraform-docs"]).toEqual(getExpectedDocsTarget());
    });
  });

  describe("when custom target names are configured", () => {
    it("produces the same target implementations under different names", () => {
      const root = path.join("infra", "modules", "shared_stack");
      const defaultTargets = getTargetsOrThrow(
        getProject(defaultOptions, root, true),
      );
      const customTargets = getTargetsOrThrow(
        getProject(customOptions, root, true),
      );

      expect(Object.keys(defaultTargets)).not.toEqual(
        Object.keys(customTargets),
      );

      const stripDependsOn = (targets: typeof defaultTargets) =>
        Object.values(targets).map((target) => {
          const targetWithoutDependsOn = { ...target };
          delete targetWithoutDependsOn.dependsOn;
          return targetWithoutDependsOn;
        });

      expect(stripDependsOn(defaultTargets)).toEqual(
        stripDependsOn(customTargets),
      );
    });
  });
});
