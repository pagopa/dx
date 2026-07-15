import { z } from "zod/v4";

export const releaseApplyExecutorSchema = z.object({
  dryRun: z.boolean().default(false),
  projectRoot: z.string().min(1),
  report: z.boolean().default(false),
  sensitiveKeys: z.array(z.string().min(1)).default([]),
  verbose: z.boolean().default(false),
});

export type ReleaseApplyExecutorInput = Partial<ReleaseApplyExecutorSchema>;

export type ReleaseApplyExecutorSchema = z.infer<
  typeof releaseApplyExecutorSchema
>;
