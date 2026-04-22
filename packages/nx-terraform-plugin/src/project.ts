import {
  ProjectConfiguration,
  ProjectType,
  TargetConfiguration,
} from "@nx/devkit";
import path from "node:path";

import { TerraformPluginOptions } from "./options.ts";

// Derives a project name from the root path of a Terraform configuration directory
// So that names are predictable (no Nx project discovery required) and consistent
export const getProjectNameFromRoot = (root: string) =>
  root
    .split(path.sep)
    .reduce(
      (acc: string[], part: string, currentIndex: number, array: string[]) => {
        if (array.length > 1 && currentIndex === 0) {
          return acc;
        }
        if (part === "_modules") {
          return [...acc, "modules"];
        }
        return [...acc, part.replaceAll("_", "-")];
      },
      [],
    )
    .join("-");

// Modules contained in "modules" or "_modules" folder are reusable and should be
// treated as libraries, while other Terraform configurations should be treated
// as applications (assuming they are meant to be provisioned directly, rather than being
// consumed by other configurations)
const getProjectType = (root: string): ProjectType => {
  const rootSegments = new Set(root.split(path.sep));
  return rootSegments.has("modules") || rootSegments.has("_modules")
    ? "library"
    : "application";
};

const getTargets = (
  opts: TerraformPluginOptions,
  root: string,
  projectType: ProjectType,
  hasRootTflintConfig: boolean,
): Record<string, TargetConfiguration> => {
  const rootTflintConfigPath =
    path.relative(root, ".tflint.hcl") || ".tflint.hcl";
  const defaultArgs = {
    fmt: ["-list=true", "-recursive=true"],
    lint: [
      "--disable-rule=terraform_required_version",
      "--disable-rule=terraform_required_providers",
      "--config",
      rootTflintConfigPath,
    ],
  };

  const projectCwd = "{projectRoot}";
  const terraformInputs = ["default", "examples", "tests"];

  // Shared targets for applications and libraries.
  // To speed up the development loop, frequently used tasks like "validate"
  // and "console" run independently of "init", while "test" depends on it.
  const targets: [string, TargetConfiguration][] = [
    [
      opts.initTargetName,
      {
        cache: true,
        command: `terraform init`,
        inputs: terraformInputs,
        options: {
          cwd: projectCwd,
        },
        outputs: [
          "{projectRoot}/.terraform",
          "{projectRoot}/.terraform.lock.hcl",
        ],
      },
    ],
    [
      opts.formatTargetName,
      {
        cache: true,
        command: `terraform fmt`,
        configurations: {
          ci: {
            args: [...defaultArgs.fmt, "-check=true"],
          },
        },
        inputs: terraformInputs,
        options: {
          args: [...defaultArgs.fmt, "-write=true"],
          cwd: projectCwd,
        },
      },
    ],
    [
      opts.testTargetName,
      {
        cache: true,
        command: `terraform test`,
        dependsOn: [opts.initTargetName],
        inputs: ["default", "tests"],
        options: {
          cwd: projectCwd,
        },
      },
    ],
    [
      opts.validateTargetName,
      {
        cache: true,
        command: `terraform validate`,
        inputs: terraformInputs,
        options: {
          cwd: projectCwd,
        },
      },
    ],
  ];

  if (hasRootTflintConfig) {
    targets.push([
      opts.lintTargetName,
      {
        cache: true,
        command: `tflint`,
        inputs: [...terraformInputs, "{workspaceRoot}/.tflint.hcl"],
        options: {
          args: defaultArgs.lint,
          cwd: projectCwd,
        },
      },
    ]);
  }

  targets.push(
    [
      opts.consoleTargetName,
      {
        cache: false,
        command: `terraform console`,
        options: {
          cwd: projectCwd,
          tty: true,
        },
      },
    ],
    [
      opts.outputTargetName,
      {
        cache: false,
        command: `terraform output`,
        dependsOn: [opts.initTargetName],
        options: {
          cwd: projectCwd,
        },
      },
    ],
  );

  if (projectType === "application") {
    targets.push(
      [
        opts.planTargetName,
        {
          cache: false,
          command: `terraform plan`,
          dependsOn: [opts.initTargetName],
          options: {
            cwd: projectCwd,
          },
        },
      ],
      [
        opts.applyTargetName,
        {
          cache: false,
          command: `terraform apply`,
          dependsOn: [opts.initTargetName],
          options: {
            cwd: projectCwd,
            tty: true,
          },
        },
      ],
    );
  }

  return Object.fromEntries(targets);
};

export const getProject = (
  opts: TerraformPluginOptions,
  root: string,
  hasRootTflintConfig = false,
): ProjectConfiguration => {
  const projectType = getProjectType(root);
  const targets = getTargets(opts, root, projectType, hasRootTflintConfig);
  return {
    name: getProjectNameFromRoot(root),
    namedInputs: {
      default: ["{projectRoot}/*.{tf,tfvars}"],
      examples: ["{projectRoot}/examples/**/*.{tf,tfvars}"],
      tests: [
        "{projectRoot}/tests/**/*.{tf,tfvars}",
        "{projectRoot}/tests/**/*.tftest.hcl",
      ],
    },
    projectType,
    root,
    // We assign the 'terraform' tag to all projects created from Terraform configuration files
    // So that they can be easily targeted in Nx commands with --projects=tag:terraform
    tags: ["terraform"],
    targets,
  };
};
