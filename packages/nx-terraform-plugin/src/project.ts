/**
 * Builds inferred Nx Terraform project definitions and targets from config roots.
 */

import {
  ProjectConfiguration,
  ProjectType,
  TargetConfiguration,
} from "@nx/devkit";
import path from "node:path";

import { getPackageLogger } from "./logger.ts";
import { EnvironmentManifest, ModulePublishManifest } from "./manifest.ts";
import { TerraformPluginOptions } from "./options.ts";
import { mergePublishOptions, PublishOptionsError } from "./publish-options.ts";

const logger = getPackageLogger(["project"]);

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

const defaultEnvironments = ["prod", "uat", "dev"];

const getEnvironmentTag = (
  root: string,
  additionalEnvironments: readonly string[],
): string => {
  const rootSegments = root.split(path.sep);
  const supportedEnvironments = new Set([
    ...defaultEnvironments,
    ...additionalEnvironments,
  ]);
  const environment = rootSegments.find((segment) =>
    supportedEnvironments.has(segment),
  );

  return `env:${environment ?? "prod"}`;
};

const getRootConfigPath = (root: string, configFileName: string) =>
  path.relative(root, configFileName) || configFileName;

const getPublishTarget = (
  opts: TerraformPluginOptions,
  root: string,
  publishManifest: ModulePublishManifest,
): [string, TargetConfiguration] | undefined => {
  try {
    const publishOptions = mergePublishOptions(opts.publish, publishManifest);
    return [
      opts.publishTargetName,
      {
        cache: false,
        executor: "@pagopa/nx-terraform-plugin:publish",
        options: {
          ...publishOptions,
          githubOwner: publishOptions.github.owner,
          projectRoot: "{projectRoot}",
          workspaceRoot: "{workspaceRoot}",
        },
      },
    ];
  } catch (error) {
    if (error instanceof PublishOptionsError) {
      logger.warn("Invalid publish options", {
        issues: error.issues,
        path: path.join(root, "module.json"),
      });
      return undefined;
    }

    throw error;
  }
};

// Deployable environments (identified by an environment.json manifest)
// additionally get a plan-upload target (generates and persists a plan
// bundle to the Terraform state storage backend) and a release-publish
// target (downloads and applies that exact plan bundle). The latter is
// invoked by `nx release publish` when this project is included in an Nx
// release, gating the actual apply behind the same version-plan-driven
// release flow used for the rest of the monorepo.
const getEnvironmentReleaseTargets = (
  opts: TerraformPluginOptions,
): [string, TargetConfiguration][] => [
  [
    opts.planUploadTargetName,
    {
      cache: false,
      configurations: {
        ci: {
          refresh: true,
          report: true,
          verbose: false,
        },
      },
      dependsOn: [opts.initTargetName],
      executor: "@pagopa/nx-terraform-plugin:plan-upload",
      options: {
        projectRoot: "{projectRoot}",
        refresh: true,
        report: false,
        sensitiveKeys: opts.sensitiveOutputKeys,
        verbose: true,
      },
    },
  ],
  [
    opts.publishTargetName,
    {
      cache: false,
      dependsOn: [opts.initTargetName],
      executor: "@pagopa/nx-terraform-plugin:release-apply",
      options: {
        projectRoot: "{projectRoot}",
        report: false,
        sensitiveKeys: opts.sensitiveOutputKeys,
        verbose: true,
      },
    },
  ],
];

const getTargets = (
  opts: TerraformPluginOptions,
  root: string,
  projectType: ProjectType,
  hasRootTflintConfig: boolean,
  publishManifest: ModulePublishManifest | undefined,
  environmentManifest: EnvironmentManifest | undefined,
): Record<string, TargetConfiguration> => {
  const rootTflintConfigPath = getRootConfigPath(root, ".tflint.hcl");
  const formatArgs = ["-list=true", "-recursive=true"];

  const cwd = "{projectRoot}";
  const inputs = ["default", "examples", "tests"];

  // Shared targets for applications and libraries.
  // To speed up the development loop, frequently used tasks like "validate"
  // and "console" run independently of "init", while "test" depends on it.
  const targets: [string, TargetConfiguration][] = [
    [
      opts.initTargetName,
      {
        cache: true,
        command: `terraform init`,
        inputs,
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
            args: [...formatArgs, "-check=true"],
          },
        },
        inputs,
        options: {
          args: [...formatArgs, "-write=true"],
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
        inputs,
        options: {
          cwd,
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
        inputs: [...inputs, "{workspaceRoot}/.tflint.hcl"],
        options: {
          args: [
            "--disable-rule=terraform_required_version",
            "--disable-rule=terraform_required_providers",
            "--config",
            rootTflintConfigPath,
          ],
          cwd,
        },
      },
    ]);
  }

  if (projectType === "library") {
    targets.push([
      opts.docsTargetName,
      {
        cache: true,
        command: `terraform-docs markdown table`,
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
          cwd,
        },
        outputs: ["{projectRoot}/README.md"],
      },
    ]);

    if (publishManifest) {
      const publishTarget = getPublishTarget(opts, root, publishManifest);
      if (publishTarget) {
        targets.push(publishTarget);
      }
    }
  }

  targets.push(
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
  );

  if (projectType === "application") {
    targets.push(
      [
        opts.planTargetName,
        {
          cache: false,
          configurations: {
            ci: {
              refresh: true,
              report: true,
              verbose: false,
            },
          },
          dependsOn: [opts.initTargetName],
          executor: "@pagopa/nx-terraform-plugin:plan",
          options: {
            projectRoot: "{projectRoot}",
            refresh: true,
            report: false,
            sensitiveKeys: opts.sensitiveOutputKeys,
            verbose: true,
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

    if (environmentManifest) {
      targets.push(...getEnvironmentReleaseTargets(opts));
    }
  }

  return Object.fromEntries(targets);
};

export const getProject = (
  opts: TerraformPluginOptions,
  root: string,
  hasRootTflintConfig = false,
  publishManifest: ModulePublishManifest | undefined = undefined,
  environmentManifest: EnvironmentManifest | undefined = undefined,
): ProjectConfiguration => {
  const projectType = getProjectType(root);
  const isPublishableLibrary =
    projectType === "library" && publishManifest !== undefined;
  const isReleasableEnvironment =
    projectType === "application" && environmentManifest !== undefined;
  const targets = getTargets(
    opts,
    root,
    projectType,
    hasRootTflintConfig,
    publishManifest,
    environmentManifest,
  );
  const environmentTag =
    projectType === "application"
      ? getEnvironmentTag(root, opts.additionalEnvironments)
      : undefined;
  const tags = ["terraform", ...(environmentTag ? [environmentTag] : [])];
  if (isPublishableLibrary) {
    tags.push("terraform:public");
  }

  const config: ProjectConfiguration = {
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
    // We assign the 'terraform' tag to all Terraform projects, add the
    // environment tag for applications, and add 'terraform:public'
    // for publishable module libraries discovered from module.json.
    tags,
    targets,
  };

  // Add Nx Release configuration for publishable libraries and releasable
  // (environment.json-backed) deployable environments. Both track their
  // version on disk via the same TerraformVersionActions, which picks the
  // right manifest filename based on projectType.
  if (isPublishableLibrary || isReleasableEnvironment) {
    config.release = {
      version: {
        currentVersionResolver: "disk",
        manifestRootsToUpdate: ["{projectRoot}"],
        versionActions: "@pagopa/nx-terraform-plugin/release/version-actions",
      },
    };
  }

  return config;
};
