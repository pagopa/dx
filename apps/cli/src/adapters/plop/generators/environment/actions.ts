import type { ActionType, DynamicActionsFunction } from "node-plop";

import { getLogger } from "@logtape/logtape";
import * as path from "node:path";

import { Environment } from "../../../../domain/environment.js";
import { formatTerraformCode } from "../../../terraform/fmt.js";
import { payloadSchema } from "./prompts.js";

const addModule = (env: Environment, templatesPath: string) => {
  const cloudAccountsByCsp = Object.groupBy(
    env.cloudAccounts,
    (account) => account.csp,
  );
  const cwd = process.cwd();
  return (name: string, terraformBackendKey: string) => [
    {
      base: templatesPath,
      data: { cloudAccountsByCsp },
      destination: path.join(cwd, "infra"),
      force: true,
      templateFiles: path.join(templatesPath, name),
      transform: formatTerraformCode,
      type: "addMany",
      verbose: true,
    },
    {
      base: path.join(templatesPath, "shared"),
      data: { cloudAccountsByCsp, terraformBackendKey },
      destination: path.join(cwd, "infra", name, "{{env.name}}"),
      force: true,
      templateFiles: path.join(templatesPath, "shared"),
      transform: formatTerraformCode,
      type: "addMany",
      verbose: true,
    },
  ];
};

export default function getActions(
  templatesPath: string,
): DynamicActionsFunction {
  return (payload: unknown) => {
    const logger = getLogger(["gen", "env"]);

    logger.debug("payload {payload}", { payload });

    const { env, github, init } = payloadSchema.parse(payload);

    const addEnvironmentModule = addModule(env, templatesPath);

    const actions: ActionType[] = [
      {
        type: "getTerraformBackend",
      },
      ...addEnvironmentModule(
        "bootstrapper",
        `${github.repo}.bootstrapper.${env.name}.tfstate`,
      ),
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
      actions.push(
        ...addEnvironmentModule(
          "core",
          `${env.prefix}.core.${env.name}.tfstate`,
        ),
      );
    }

    return actions;
  };
}
