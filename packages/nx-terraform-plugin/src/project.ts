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
import { ModulePublishManifest } from "./manifest.ts";
import { TerraformPluginOptions } from "./options.ts";
import { mergePublishOptions, PublishOptionsError } from "./publish-options.ts";

const logger = getPackageLogger(["project"]);

export interface TerraformTestCapabilities {
  contract: boolean;
  e2e: boolean;
  integration: boolean;
  unit: boolean;
}

const noTerraformTestCapabilities: TerraformTestCapabilities = {
  contract: false,
  e2e: false,
  integration: false,
  unit: false,
};

const getTargetName = (opts: TerraformPluginOptions, targetSuffix: string) =>
  opts.targetNamePrefix === ""
    ? targetSuffix
    : `${opts.targetNamePrefix}-${targetSuffix}`;

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

// Identifies roots that conventionally contain reusable Terraform modules.
// Discovery additionally requires module.json before inferring these as projects.
export const isTerraformLibraryRoot = (root: string): boolean => {
  const rootSegments = new Set(root.split(path.sep));
  return rootSegments.has("modules") || rootSegments.has("_modules");
};

const getProjectType = (root: string): ProjectType =>
  isTerraformLibraryRoot(root) ? "library" : "application";

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

const getPublishTarget = (
  opts: TerraformPluginOptions,
  root: string,
  publishManifest: ModulePublishManifest,
): [string, TargetConfiguration] | undefined => {
  try {
    const publishOptions = mergePublishOptions(opts.publish, publishManifest);
    return [
      "nx-release-publish",
      {
        cache: false,
        executor: "@pagopa/nx-terraform-plugin:publish",
        options: {
          ...publishOptions,
          githubOwner: publishOptions.github.owner,
          projectRoot: "{projectRoot}",
          // Only an owner explicitly configured in nx.json enables App auth;
          // an owner inherited from module.json keeps the legacy token flow.
          useGitHubAppAuthentication: opts.publish.github?.owner !== undefined,
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

const getTestTargets = (
  opts: TerraformPluginOptions,
  cwd: string,
  testCapabilities: TerraformTestCapabilities,
): [string, TargetConfiguration][] => {
  const targets: [string, TargetConfiguration][] = [];
  const initTargetName = getTargetName(opts, "init");

  if (testCapabilities.unit || testCapabilities.contract) {
    targets.push([
      getTargetName(opts, "test"),
      {
        cache: true,
        command: `terraform test`,
        dependsOn: [initTargetName],
        inputs: [
          "default",
          "{projectRoot}/tests/unit.tftest.hcl",
          "{projectRoot}/tests/contract.tftest.hcl",
        ],
        options: {
          args: [
            "-filter='tests/unit.tftest.hcl'",
            "-filter='tests/contract.tftest.hcl'",
          ],
          cwd,
        },
      },
    ]);
  }
  if (testCapabilities.integration) {
    targets.push([
      getTargetName(opts, "test-integration"),
      {
        cache: true,
        command: `terraform test`,
        dependsOn: [initTargetName],
        inputs: [
          "default",
          "{projectRoot}/tests/integration.tftest.hcl",
          "{projectRoot}/tests/setup/**/*.{tf,tfvars}",
        ],
        options: {
          args: ["-filter='tests/integration.tftest.hcl'"],
          cwd,
        },
      },
    ]);
  }
  if (testCapabilities.e2e) {
    targets.push([
      getTargetName(opts, "e2e"),
      {
        cache: true,
        command: `go test -v -timeout 1h ./tests`,
        dependsOn: [initTargetName],
        inputs: [
          "default",
          "{projectRoot}/tests/**/*",
          "{projectRoot}/examples/**/*",
        ],
        options: { cwd },
      },
    ]);
  }

  return targets;
};

const getInitTarget = (
  projectType: ProjectType,
  initTargetName: string,
  cwd: string,
): [string, TargetConfiguration] => [
  initTargetName,
  projectType === "application"
    ? {
        cache: false,
        configurations: {
          ci: {
            frozenLockfile: true,
          },
        },
        executor: "@pagopa/nx-terraform-plugin:init",
        inputs: ["default"],
        options: {
          projectRoot: "{projectRoot}",
        },
        outputs: [
          "{projectRoot}/.terraform",
          "{projectRoot}/.terraform.lock.hcl",
          "{projectRoot}/tfmodules.lock.json",
        ],
      }
    : {
        cache: true,
        command: `terraform init`,
        inputs: ["default"],
        options: {
          cwd,
        },
        outputs: [
          "{projectRoot}/.terraform",
          "{projectRoot}/.terraform.lock.hcl",
        ],
      },
];

const getTrivyTarget = (
  workspaceRoot: string,
  root: string,
): TargetConfiguration => ({
  cache: true,
  command: "trivy config",
  inputs: [
    "{projectRoot}/**/*.{tf,tfvars}",
    "{workspaceRoot}/trivy.yml",
    "{workspaceRoot}/.trivyignore",
    "{workspaceRoot}/.trivy/checks/terraform/**/*",
  ],
  options: {
    args: [
      // Trivy updates the checks bundle cache while scanning, so concurrent
      // projects must not share the same cache directory.
      "--cache-dir",
      path.join(
        workspaceRoot,
        ".nx",
        "trivy-cache",
        getProjectNameFromRoot(root),
      ),
      "--config",
      path.resolve(workspaceRoot, "trivy.yml"),
      root,
    ],
    cwd: "{workspaceRoot}",
  },
});

const getTargets = (
  opts: TerraformPluginOptions,
  workspaceRoot: string,
  root: string,
  projectType: ProjectType,
  hasRootTflintConfig: boolean,
  publishManifest: ModulePublishManifest | undefined,
  testCapabilities: TerraformTestCapabilities,
): Record<string, TargetConfiguration> => {
  const formatArgs = ["-list=true", "-recursive=true"];

  const cwd = "{projectRoot}";
  const initTargetName = getTargetName(opts, "init");

  const targets: [string, TargetConfiguration][] = [
    getInitTarget(projectType, initTargetName, cwd),
    [
      getTargetName(opts, "fmt"),
      {
        cache: true,
        command: `terraform fmt`,
        configurations: {
          ci: {
            args: [...formatArgs, "-check=true"],
          },
        },
        inputs: ["default"],
        options: {
          args: [...formatArgs, "-write=true"],
          cwd,
        },
      },
    ],
  ];

  targets.push(...getTestTargets(opts, cwd, testCapabilities));

  targets.push([
    getTargetName(opts, "validate"),
    {
      cache: true,
      command: `terraform validate`,
      dependsOn: [initTargetName],
      inputs: ["default", "examples"],
      options: {
        cwd,
      },
    },
  ]);

  targets.push([
    getTargetName(opts, "trivy"),
    getTrivyTarget(workspaceRoot, root),
  ]);

  if (hasRootTflintConfig) {
    targets.push([
      getTargetName(opts, "lint"),
      {
        cache: true,
        command: `tflint`,
        inputs: [
          "default",
          "examples",
          "{workspaceRoot}/.tflint.hcl",
          { env: "TFLINT_PLUGIN_DIR" },
        ],
        options: {
          cwd,
          env: {
            TFLINT_CONFIG_FILE: path.resolve(workspaceRoot, ".tflint.hcl"),
          },
        },
      },
    ]);
  }

  if (projectType === "library") {
    targets.push([
      getTargetName(opts, "docs"),
      {
        cache: true,
        command: `terraform-docs markdown table .`,
        configurations: {
          ci: {
            "output-check": true,
          },
        },
        inputs: ["default", "{projectRoot}/README.md"],
        options: {
          cwd,
          hide: "providers",
          lockfile: false,
          "output-file": "README.md",
          "output-mode": "inject",
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
      getTargetName(opts, "console"),
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
      getTargetName(opts, "output"),
      {
        cache: false,
        command: `terraform output`,
        dependsOn: [initTargetName],
        options: {
          cwd,
        },
      },
    ],
  );

  if (projectType === "application") {
    targets.push(
      [
        getTargetName(opts, "plan"),
        {
          cache: false,
          configurations: {
            ci: {
              refresh: true,
              report: true,
              verbose: false,
            },
          },
          dependsOn: [initTargetName],
          executor: "@pagopa/nx-terraform-plugin:plan",
          options: {
            projectRoot: "{projectRoot}",
            refresh: true,
            report: false,
            verbose: true,
          },
        },
      ],
      [
        getTargetName(opts, "apply"),
        {
          cache: false,
          command: `terraform apply`,
          dependsOn: [initTargetName],
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
  workspaceRoot: string,
  root: string,
  hasRootTflintConfig = false,
  publishManifest: ModulePublishManifest | undefined = undefined,
  testCapabilities: TerraformTestCapabilities = noTerraformTestCapabilities,
): ProjectConfiguration => {
  const projectType = getProjectType(root);
  const isPublishableLibrary =
    projectType === "library" && publishManifest !== undefined;
  const targets = getTargets(
    opts,
    workspaceRoot,
    root,
    projectType,
    hasRootTflintConfig,
    publishManifest,
    testCapabilities,
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
    },
    projectType,
    root,
    // We assign the 'terraform' tag to all Terraform projects, add the
    // environment tag for applications, and add 'terraform:public'
    // for publishable module libraries discovered from module.json.
    tags,
    targets,
  };

  // Add Nx Release configuration for publishable libraries
  if (isPublishableLibrary) {
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
