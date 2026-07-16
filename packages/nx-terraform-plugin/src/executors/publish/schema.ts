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

export const nxReleasePublishExecutorSchema = z.object({
  description: publishSchema.shape.description,
  githubOwner: publishSchema.shape.github.shape.owner,
  projectRoot: z.string().min(1),
  provider: publishSchema.shape.provider,
  useGitHubAppAuthentication: z.boolean().default(false),
  version: publishSchema.shape.version,
  workspaceRoot: z.string(),
});

export type NxReleasePublishExecutorInput =
  Partial<NxReleasePublishExecutorSchema>;

export type NxReleasePublishExecutorSchema = z.input<
  typeof nxReleasePublishExecutorSchema
>;
