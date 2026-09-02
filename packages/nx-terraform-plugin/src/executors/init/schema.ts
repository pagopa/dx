/**
 * Validates options accepted by the Terraform initialization executor.
 */

import { z } from "zod/v4";

export const initExecutorSchema = z.object({
  args: z.array(z.string()).default([]),
  frozenLockfile: z.boolean().default(false),
  projectRoot: z.string().min(1),
});

export type InitExecutorInput = z.input<typeof initExecutorSchema>;

export type InitExecutorSchema = z.infer<typeof initExecutorSchema>;
