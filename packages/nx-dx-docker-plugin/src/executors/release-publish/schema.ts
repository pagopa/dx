import { z } from "zod/v4";

import { dockerRunOptionsSchema } from "../../docker-run.ts";

export const releasePublishSchema = dockerRunOptionsSchema.extend({
  dryRun: z.boolean().optional(),
});

export type ReleasePublishExecutorInput = Partial<ReleasePublishExecutorSchema>;

export type ReleasePublishExecutorSchema = z.infer<typeof releasePublishSchema>;
