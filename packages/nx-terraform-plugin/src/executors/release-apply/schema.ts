import { z } from "zod/v4";

export const releaseApplyExecutorSchema = z.object({
  projectRoot: z.string().min(1),
  report: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

export type ReleaseApplyExecutorInput = Partial<ReleaseApplyExecutorSchema>;

export type ReleaseApplyExecutorSchema = z.infer<
  typeof releaseApplyExecutorSchema
>;
