import { z } from "zod/v4";

export const planExecutorSchema = z.object({
  out: z.string().min(1).optional(),
  projectRoot: z.string().min(1),
  refresh: z.boolean().default(true),
  report: z.boolean().default(false),
  verbose: z.boolean().default(false),
});

export type PlanExecutorInput = Partial<PlanExecutorSchema>;

export type PlanExecutorSchema = z.infer<typeof planExecutorSchema>;
