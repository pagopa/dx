/** Defines the saved-plan input for the Terraform apply executor. */

import { z } from "zod/v4";

export const applyExecutorSchema = z.object({
  __unparsed__: z
    .array(z.string())
    .max(0, "Use --planFile=<file> instead of positional Terraform arguments")
    .optional(),
  planFile: z.string().min(1).optional(),
  projectRoot: z.string().min(1),
});

export type ApplyExecutorInput = Partial<z.infer<typeof applyExecutorSchema>>;
