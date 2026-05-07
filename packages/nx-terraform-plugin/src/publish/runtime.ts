import path from "node:path";

import { PublishOptions } from "../options.ts";

export interface PublishRuntimeInput {
  projectRoot: string;
  publish: PublishOptions;
  workspaceRoot: string;
}

export interface PublishRuntimeResult {
  repo: string;
}

const parseArgs = (args: string[]): Record<string, string> =>
  Object.fromEntries(
    args
      .filter((arg) => arg.startsWith("--") && arg.includes("="))
      .map((arg) => {
        const [rawKey, ...rawValue] = arg.slice(2).split("=");
        return [rawKey, rawValue.join("=")];
      }),
  );

const buildRepoName = (projectRoot: string, provider: string) => {
  const moduleName = path.basename(projectRoot).replaceAll("_", "-");
  return `terraform-${provider}-${moduleName}`;
};

export const runPublish = async (
  input: PublishRuntimeInput,
): Promise<PublishRuntimeResult> => {
  if (input.publish.mode !== "github") {
    throw new Error(`Unsupported publish mode: ${input.publish.mode}`);
  }
  return {
    repo: buildRepoName(input.projectRoot, "azurerm"),
  };
};

export const runPublishFromProcessArgs = async (
  args: string[],
  fallbackWorkspaceRoot: string,
): Promise<PublishRuntimeResult> => {
  const parsedArgs = parseArgs(args);
  const projectRoot = parsedArgs.projectRoot;
  if (!projectRoot) {
    throw new Error("Missing required argument: --projectRoot");
  }
  const workspaceRoot = parsedArgs.workspaceRoot || fallbackWorkspaceRoot;
  return runPublish({
    projectRoot,
    publish: {
      mode: "github",
      ...(parsedArgs.owner
        ? {
            github: {
              owner: parsedArgs.owner,
            },
          }
        : {}),
    },
    workspaceRoot,
  });
};
