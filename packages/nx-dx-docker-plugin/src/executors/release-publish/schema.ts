import { z } from "zod/v4";

export const releasePublishSchema = z.object({
  dryRun: z.boolean().optional(),
});

export type ReleasePublishExecutorInput = Partial<ReleasePublishExecutorSchema>;

export type ReleasePublishExecutorSchema = z.infer<typeof releasePublishSchema>;
