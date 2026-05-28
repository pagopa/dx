import type { ActionType, DynamicActionsFunction } from "node-plop";

import { getLogger } from "@logtape/logtape";
import path from "node:path";

import { formatTerraformCode } from "../../../terraform/fmt.js";
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
      templateFiles: path.join(templatesPath, name),
      transform: formatTerraformCode,
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
      templateFiles: path.join(templatesPath, "shared"),
      transform: formatTerraformCode,
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
    templateFiles: path.join(templatesPath, "workflow"),
    type: "addMany",
    verbose: true,
  };
};

export default function getActions(
  templatesPath: string,
): DynamicActionsFunction {
  return (input: unknown) => {
    const logger = getLogger(["gen", "env"]);

    logger.debug("environment generator input {input}", { input });

    const { env, init, workspace } = payloadSchema.parse(input);

    const addEnvironmentModule = addModule(
      { env, workspace },
      templatesPath,
      !!init,
    );

    const actions: ActionType[] = [
      {
        type: "getTerraformBackend",
      },
      addWorkflowModule(templatesPath),
      ...addEnvironmentModule("bootstrapper"),
    ];

    if (init) {
      actions.unshift(
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

    return actions;
  };
}
