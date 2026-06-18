/**
 * Validates the minimal executor options supported by the Docker publish wrapper.
 */
import { z } from "zod/v4";

export const releasePublishSchema = z.object({
  dryRun: z.boolean().optional(),
  quiet: z.boolean().optional(),
});

export type ReleasePublishExecutorOptions = z.infer<typeof releasePublishSchema>;