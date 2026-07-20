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
  version: publishSchema.shape.version,
  workspaceRoot: z.string(),
});

const nxReleasePublishExecutorGitHubAppOptionsSchema =
  nxReleasePublishExecutorOptionsSchema.extend({
    useGitHubAppAuthentication: z.literal(true),
  });

const nxReleasePublishExecutorGitHubTokenOptionsSchema =
  nxReleasePublishExecutorOptionsSchema.extend({
    useGitHubAppAuthentication: z.literal(false),
  });

const nxReleasePublishExecutorAuthenticationSchema = z
  .looseObject({
    useGitHubAppAuthentication: z.boolean().default(false),
  })
  .pipe(
    z.discriminatedUnion("useGitHubAppAuthentication", [
      nxReleasePublishExecutorGitHubAppOptionsSchema.extend({
        environment: githubAppEnvironmentSchema,
      }),
      nxReleasePublishExecutorGitHubTokenOptionsSchema.extend({
        environment: githubTokenEnvironmentSchema,
      }),
    ]),
  )
  .transform((options) => {
    if (options.useGitHubAppAuthentication) {
      const { environment, ...publishOptions } = options;
      return {
        ...publishOptions,
        githubAppCredentials: {
          clientId: environment.GH_APP_CLIENT_ID,
          privateKey: environment.GH_APP_KEY,
        },
      };
    }

    const { environment: githubToken, ...publishOptions } = options;
    return {
      ...publishOptions,
      githubToken,
    };
  });

export const nxReleasePublishExecutorSchema =
  nxReleasePublishExecutorAuthenticationSchema;

export type NxReleasePublishExecutorInput =
  Partial<NxReleasePublishExecutorSchema>;

export type NxReleasePublishExecutorSchema =
  | z.input<typeof nxReleasePublishExecutorGitHubAppOptionsSchema>
  | (z.input<typeof nxReleasePublishExecutorOptionsSchema> & {
      useGitHubAppAuthentication?: false;
    });
