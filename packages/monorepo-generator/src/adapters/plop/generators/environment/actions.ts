import { type DynamicActionsFunction } from "node-plop";
import * as path from "node:path";

import { formatTerraformCode } from "../../../terraform/fmt.js";
import { payloadSchema } from "./prompts.js";

const actions: (templatesPath: string) => DynamicActionsFunction =
  (templatesPath) => (data) => {
    const payload = payloadSchema.parse(data);

    const actions = [
      {
        type: "getGitHubRepoName",
      },
      {
        type: "getTerraformBackend",
      },
      {
        base: path.join(templatesPath, "environment"),
        destination: "infra",
        force: true,
        templateFiles: path.join(templatesPath, "environment", "bootstrapper"),
        transform: formatTerraformCode,
        type: "addMany",
        verbose: true,
      },
    ];

    if (payload.init) {
      actions.unshift(
        {
          type: "initCloudAccounts",
        },
        {
          type: payload.init.terraformBackend
            ? "provisionTerraformBackend"
            : "getTerraformBackend",
        },
      );
      actions.push({
        base: path.join(templatesPath, "environment"),
        destination: "infra",
        force: true,
        templateFiles: path.join(templatesPath, "environment", "core"),
        transform: formatTerraformCode,
        type: "addMany",
        verbose: true,
      });
    }

    return actions;
  };

export default actions;
