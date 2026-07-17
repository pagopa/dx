import { z } from "zod/v4";

import { publishSchema } from "../../publish-options.ts";

export const githubAppEnvironmentSchema = z.object({
  GH_APP_CLIENT_ID: z.string().min(1),
  GH_APP_KEY: z
    .string()
    .min(1)
    .transform((privateKey) => privateKey.replaceAll("\\n", "\n")),
});

export const githubTokenEnvironmentSchema = z
  .object({
    GH_TOKEN: z.string().min(1).optional(),
    GITHUB_TOKEN: z.string().min(1).optional(),
  })
  .transform((environment, context) => {
    const token = environment.GH_TOKEN ?? environment.GITHUB_TOKEN;
    if (token === undefined) {
      context.addIssue({
        code: "custom",
        message: "GH_TOKEN or GITHUB_TOKEN is required",
        path: ["GH_TOKEN"],
      });
      return z.NEVER;
    }
    return token;
  });

const nxReleasePublishExecutorOptionsSchema = z.object({
  description: publishSchema.shape.description,
  githubOwner: publishSchema.shape.github.shape.owner,
  projectRoot: z.string().min(1),
  provider: publishSchema.shape.provider,
  useGitHubAppAuthentication: z.boolean().default(false),
  version: publishSchema.shape.version,
  workspaceRoot: z.string(),
});

const hasOwnProperty = (value: object, property: string): boolean =>
  Object.prototype.hasOwnProperty.call(value, property);

const nxReleasePublishExecutorAuthenticationSchema = z.preprocess(
  (input) => {
    if (
      input !== null &&
      typeof input === "object" &&
      !Array.isArray(input) &&
      !hasOwnProperty(input, "useGitHubAppAuthentication")
    ) {
      return {
        ...input,
        useGitHubAppAuthentication: false,
      };
    }

    return input;
  },
  z.xor([
    nxReleasePublishExecutorOptionsSchema
      .extend({
        environment: githubAppEnvironmentSchema,
        useGitHubAppAuthentication: z.literal(true),
      })
      .transform(({ environment, ...options }) => ({
        ...options,
        githubAppCredentials: {
          clientId: environment.GH_APP_CLIENT_ID,
          privateKey: environment.GH_APP_KEY,
        },
        githubToken: "",
      })),
    nxReleasePublishExecutorOptionsSchema
      .extend({
        environment: githubTokenEnvironmentSchema,
        useGitHubAppAuthentication: z.literal(false).default(false),
      })
      .transform(({ environment, ...options }) => ({
        ...options,
        githubAppCredentials: undefined,
        githubToken: environment,
      })),
  ]),
);

export const nxReleasePublishExecutorSchema =
  nxReleasePublishExecutorAuthenticationSchema;

export type NxReleasePublishExecutorInput =
  Partial<NxReleasePublishExecutorSchema>;

export type NxReleasePublishExecutorSchema = z.input<
  typeof nxReleasePublishExecutorOptionsSchema
>;
