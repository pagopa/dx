/**
 * Validates the build options supported by the DX Docker executor.
 */
import { z } from "zod/v4";

const metadataSchema = z.object({
  labels: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const buildExecutorSchema = z.object({
  args: z.array(z.string()).optional(),
  cwd: z.string().optional(),
  env: z.record(z.string(), z.string()).optional(),
  envFile: z.string().optional(),
  metadata: metadataSchema.optional(),
  quiet: z.boolean().optional(),
});

export type BuildExecutorOptions = z.infer<typeof buildExecutorSchema>;