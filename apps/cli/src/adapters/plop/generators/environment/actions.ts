import type { ActionType, DynamicActionsFunction } from "node-plop";

import path from "node:path";

import {
  type Environment,
  getBaseEnvironmentName,
} from "../../../../domain/environment.js";
import { type Payload, payloadSchema } from "./prompts.js";

const addModule = (
  context: Pick<Payload, "env"> & {
    backendConfigFile: (layer: "bootstrapper" | "core") => string | undefined;
  },
  templatesPath: string,
  init = false,
  githubEnvironmentPrefixEnabled = false,
) => {
  const { env } = context;
  const cloudAccountsByCsp = Object.groupBy(
    env.cloudAccounts,
    (account) => account.csp,
  );
  const includesProdIO = env.cloudAccounts.some(
    (account) => account.displayName === "PROD-IO",
  );
  const cwd = process.cwd();
  return (name: "bootstrapper" | "core") => [
    {
      base: templatesPath,
      data: {
        cloudAccountsByCsp,
        githubEnvironmentPrefixEnabled,
        includesProdIO,
        init: init || undefined,
      },
      destination: path.join(cwd, "infra"),
      force: true,
      globOptions: {
        cwd: templatesPath,
        dot: true,
        get ignore() {
          const backendFile = context.backendConfigFile(name);
          return backendFile ? [`**/${path.basename(backendFile)}.hbs`] : [];
        },
      },
      templateFiles: path.join(templatesPath, name),
      type: "addMany",
      verbose: true,
    },
    {
      base: path.join(templatesPath, "shared"),
      data: {
        cloudAccountsByCsp,
        init: init || undefined,
        terraformBackendName: name === "core" ? "coreBackend" : "backend",
      },
      destination: path.join(cwd, "infra", name, "{{env.name}}"),
      force: true,
      globOptions: {
        cwd: path.join(templatesPath, "shared"),
        dot: true,
        get ignore() {
          return context.backendConfigFile(name) ? ["**/backend.tf.hbs"] : [];
        },
      },
      templateFiles: path.join(templatesPath, "shared"),
      type: "addMany",
      verbose: true,
    },
  ];
};

const addWorkflowModule = (templatesPath: string): ActionType => {
  const cwd = process.cwd();
  return {
    base: path.join(templatesPath, "workflow"),
    destination: path.join(cwd, ".github", "workflows"),
    force: true,
    globOptions: { cwd: path.join(templatesPath, "workflow"), dot: true },
    templateFiles: path.join(templatesPath, "workflow"),
    type: "addMany",
    verbose: true,
  };
};

const isGitHubEnvironmentPrefixEnabled = (
  environment: Pick<Environment, "name" | "prefix">,
): boolean => {
  const lifecycleName = getBaseEnvironmentName(environment.name);
  if (environment.name === lifecycleName) {
    return false;
  }

  const expectedName = `${environment.prefix}-${lifecycleName}`;
  if (environment.name !== expectedName) {
    throw new Error(
      `Environment "${environment.name}" must be "${expectedName}" to match prefix "${environment.prefix}".`,
    );
  }
  return true;
};

export default function getActions(
  templatesPath: string,
): DynamicActionsFunction {
  return (input: unknown) => {
    const { env, init } = payloadSchema.parse(input);
    const data = input as Payload & {
      terraform?: {
        backendConfigFiles?: Partial<
          Record<"bootstrapper" | "core", string | undefined>
        >;
        generateCore?: boolean;
      };
    };
    const githubEnvironmentPrefixEnabled =
      isGitHubEnvironmentPrefixEnabled(env);

    const addEnvironmentModule = addModule(
      {
        backendConfigFile: (layer) =>
          data.terraform?.backendConfigFiles?.[layer],
        env,
      },
      templatesPath,
      !!init,
      githubEnvironmentPrefixEnabled,
    );

    const actions: ActionType[] = [
      {
        type: "validateTerraformBackendRoots",
      },
      {
        type: "setupCloudTools",
      },
    ];

    if (init) {
      actions.push(
        { type: "initCloudAccounts" },
        {
          type: init.terraformBackend
            ? "provisionTerraformBackend"
            : "getTerraformBackend",
        },
      );
    } else {
      actions.push({ type: "getTerraformBackend" });
    }

    actions.push(
      { type: "configureExistingTerraformRootBackends" },
      { type: "syncNxAdditionalEnvironments" },
      { type: "syncRepositoryEnvironments" },
      {
        type: "configureGitHubEnvironments",
      },
      addWorkflowModule(templatesPath),
      ...addEnvironmentModule("bootstrapper"),
    );

    actions.push(
      ...addEnvironmentModule("core").map((action) => ({
        ...action,
        skip: () =>
          data.terraform?.generateCore
            ? undefined
            : "Existing core root preserved",
      })),
    );

    // The generated files are formatted in a single pass, once every file is
    // on disk.
    actions.push({
      type: "formatGeneratedCode",
    });

    // The Terraform projects of the generated environment are initialized once
    // every file is on disk, so the provider and module locks are part of the
    // same commit. The action reads the environment name from the payload, so
    // no other environment of the repository is initialized.
    actions.push({
      type: "initTerraformProjects",
    });

    return actions;
  };
}
