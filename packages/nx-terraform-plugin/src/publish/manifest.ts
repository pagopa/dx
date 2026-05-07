import { z } from "zod/v4";

import { ModulePublishManifest } from "./types.ts";

// Parses and validates module.json files for publishable Terraform modules.
export const modulePublishManifestSchema = z.object({
  description: z.string().min(1),
  github: z
    .object({
      owner: z.string().min(1).optional(),
    })
    .optional(),
  provider: z.string().min(1).optional(),
  version: z.string().min(1),
});

export const parseModulePublishManifest = (
  input: unknown,
): ModulePublishManifest => {
  const parseResult = modulePublishManifestSchema.safeParse(input);
  if (!parseResult.success) {
    const validationErrors = parseResult.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "module.json";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    throw new Error(`Invalid module.json: ${validationErrors}`);
  }
  return parseResult.data;
};
