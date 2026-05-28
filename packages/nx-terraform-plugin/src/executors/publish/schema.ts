import { z } from "zod/v4";

import { publishSchema } from "../../publish-options.ts";

export const nxReleasePublishExecutorSchema = z.object({
  description: publishSchema.shape.description,
  githubOwner: publishSchema.shape.github.shape.owner,
  projectRoot: z.string().min(1),
  provider: publishSchema.shape.provider,
  version: publishSchema.shape.version,
  workspaceRoot: z.string(),
});

export type NxReleasePublishExecutorInput =
  Partial<NxReleasePublishExecutorSchema>;

export type NxReleasePublishExecutorSchema = z.infer<
  typeof nxReleasePublishExecutorSchema
>;
