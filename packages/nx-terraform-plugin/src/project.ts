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
  projectType: ProjectType,
): Record<string, TargetConfiguration> => {
  const defaultArgs = {
    fmt: ["-list=true", "-recursive=true"],
  };

  const cwd = "{projectRoot}";

  // Shared targets for applications and libraries.
  // To speed up the development loop, frequently used tasks like "validate"
  // and "console" run independently of "init", while "test" depends on it.
  const targets: [string, TargetConfiguration][] = [
    [
      opts.initTargetName,
      {
        cache: true,
        command: `terraform init`,
        inputs: ["default", "examples", "tests"],
        options: {
          cwd,
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
        inputs: ["default", "examples", "tests"],
        options: {
          args: [...defaultArgs.fmt, "-write=true"],
          cwd,
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
          cwd,
        },
      },
    ],
    [
      opts.validateTargetName,
      {
        cache: true,
        command: `terraform validate`,
        inputs: ["default", "examples", "tests"],
        options: {
          cwd,
        },
      },
    ],
    [
      opts.consoleTargetName,
      {
        cache: false,
        command: `terraform console`,
        options: {
          cwd,
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
          cwd,
        },
      },
    ],
  ];

  if (projectType === "application") {
    targets.push(
      [
        opts.planTargetName,
        {
          cache: false,
          command: `terraform plan`,
          dependsOn: [opts.initTargetName],
          options: {
            cwd,
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
            cwd,
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
): ProjectConfiguration => {
  const projectType = getProjectType(root);
  const targets = getTargets(opts, projectType);
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
