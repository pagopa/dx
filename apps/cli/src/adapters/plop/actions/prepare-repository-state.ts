/**
 * Gate GitHub environment synchronization on verified remote repository state.
 */
import type { NodePlopAPI } from "node-plop";

import path from "node:path";
import { isDeepStrictEqual } from "node:util";

import type { RepositoryStateStorage } from "../../../domain/repository-state.js";
import type { Payload } from "../generators/environment/prompts.js";

import { readRepositoryBackend } from "../../terraform/repository-backend.js";
import { prepareRepositoryState } from "../../terraform/repository-state.js";
import { payloadSchema } from "../generators/environment/prompts.js";

const shellQuote = (value: string): string =>
  `'${value.replaceAll("'", "'\\''")}'`;

export const repositoryStateRetryCommand = (payload: Payload): string => {
  const values = [
    ["--name", payload.env.name],
    ["--prefix", payload.env.prefix],
    ["--domain", payload.workspace.domain],
    ["--owner", payload.tags.Owner],
    ["--cost-center", payload.tags.CostCenter],
    ...payload.env.cloudAccounts.flatMap((account) => [
      ["--account", account.id],
      ["--location", `${account.id}=${account.defaultLocation}`],
    ]),
    ...Object.entries({
      "--business-unit": payload.tags.BusinessUnit,
      "--management-team": payload.tags.ManagementTeam,
    }).filter((entry): entry is [string, string] => entry[1] !== undefined),
  ];
  return `dx add environment ${values
    .map(([flag, value]) => `${flag} ${shellQuote(value)}`)
    .join(" ")} --yes`;
};

export const setPrepareRepositoryStateAction = (
  plop: NodePlopAPI,
  storage: RepositoryStateStorage,
): void => {
  plop.setActionType("prepareRepositoryState", async (data) => {
    const payload = payloadSchema.parse(data);
    if (!payload.repositoryState) {
      throw new Error("Repository state destination has not been confirmed.");
    }
    try {
      const existing = await readRepositoryBackend(
        path.join(process.cwd(), "infra", "repository"),
      );
      if (
        !existing &&
        !isDeepStrictEqual(
          payload.terraform?.backend,
          payload.repositoryState.destination.backend,
        )
      ) {
        throw new Error(
          "Resolved Terraform backend differs from the confirmed repository state destination.",
        );
      }
      data.repositoryState = await prepareRepositoryState({
        destination: payload.repositoryState.destination,
        github: payload.github,
        repositoryPath: path.join(process.cwd(), "infra", "repository"),
        storage,
      });
    } catch (cause) {
      throw new Error(
        [
          cause instanceof Error
            ? cause.message
            : "Repository state preparation failed.",
          `Retry:\n  ${repositoryStateRetryCommand(payload)}`,
          "In CI, also supply the original Runner App flags and --private-key-path; private key values are never included in retry commands.",
        ].join("\n"),
        { cause },
      );
    }
    return "Repository state: remote and verified";
  });
};
