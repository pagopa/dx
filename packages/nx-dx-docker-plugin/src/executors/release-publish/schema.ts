import { z } from "zod/v4";

export const releasePublishExecutorSchema = z.object({
  projectName: z.string().min(1),
  projectRoot: z.string().min(1),
});

export type ReleasePublishExecutorInput = Partial<ReleasePublishExecutorSchema>;

export type ReleasePublishExecutorSchema = z.infer<
  typeof releasePublishExecutorSchema
>;
