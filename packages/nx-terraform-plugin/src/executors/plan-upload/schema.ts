import { z } from "zod/v4";

export const planUploadExecutorSchema = z.object({
  projectRoot: z.string().min(1),
  refresh: z.boolean().default(true),
  report: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

export type PlanUploadExecutorInput = Partial<PlanUploadExecutorSchema>;

export type PlanUploadExecutorSchema = z.infer<typeof planUploadExecutorSchema>;
