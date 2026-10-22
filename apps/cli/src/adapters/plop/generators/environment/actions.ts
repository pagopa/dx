import type { ActionType, DynamicActionsFunction } from "node-plop";

import path from "node:path";

import { terraformStateKey } from "../../helpers/terraform-state-key.js";
import { Payload } from "./prompts.js";
import { payloadSchema } from "./prompts.js";

const addModule = (
  context: Pick<Payload, "env" | "workspace">,
  templatesPath: string,
  init = false,
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
  return (name: string) => [
    {
      base: templatesPath,
      data: { cloudAccountsByCsp, includesProdIO, init: init || undefined },
      destination: path.join(cwd, "infra"),
      force: true,
      globOptions: { cwd: templatesPath, dot: true },
      templateFiles: path.join(templatesPath, name),
      type: "addMany",
      verbose: true,
    },
    {
      base: path.join(templatesPath, "shared"),
      data: {
        cloudAccountsByCsp,
        init: init || undefined,
        terraformBackendKey: terraformStateKey(context, name),
      },
      destination: path.join(cwd, "infra", name, "{{env.name}}"),
      force: true,
      globOptions: { cwd: path.join(templatesPath, "shared"), dot: true },
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

export default function getActions(
  templatesPath: string,
): DynamicActionsFunction {
  return (input: unknown) => {
    const { env, init, workspace } = payloadSchema.parse(input);

    const addEnvironmentModule = addModule(
      { env, workspace },
      templatesPath,
      !!init,
    );

    const actions: ActionType[] = [
      {
        type: "setupCloudTools",
      },
      {
        type: "getTerraformBackend",
      },
      {
        type: "syncNxAdditionalEnvironments",
      },
      {
        type: "syncRepositoryEnvironments",
      },
      // Bootstrap Azure resources can pre-exist, but OIDC credentials and
      // GitHub environment secrets are repository-specific and must be ensured
      // on every add-environment run.
      {
        type: "configureGitHubEnvironments",
      },
      addWorkflowModule(templatesPath),
      ...addEnvironmentModule("bootstrapper"),
    ];

    if (init) {
      actions.splice(
        1,
        0,
        {
          type: "initCloudAccounts",
        },
        {
          type: init.terraformBackend
            ? "provisionTerraformBackend"
            : "getTerraformBackend",
        },
      );
      actions.push(...addEnvironmentModule("core"));
    }

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
