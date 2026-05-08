import { z } from "zod/v4";

// Parses and validates module.json files for publishable Terraform modules.
export const modulePublishManifestSchema = z.object({
  description: z.string().min(1),
  github: z
    .object({
      owner: z.string().min(1).optional(),
    })
    .optional(),
  provider: z.string().min(1),
  version: z.string().min(1),
});

export type ModulePublishManifest = z.infer<typeof modulePublishManifestSchema>;

export class ModulePublishManifestError extends Error {
  constructor(
    readonly issues: z.core.$ZodIssue[],
    readonly reasons: string[],
  ) {
    super(reasons.join("; "));
    this.name = "ModulePublishManifestError";
  }
}

export const parseModulePublishManifest = (
  input: unknown,
): ModulePublishManifest => {
  const parseResult = modulePublishManifestSchema.safeParse(input);
  if (!parseResult.success) {
    const reasons = parseResult.error.issues.map((issue) => {
      const issuePath = issue.path.join(".");
      return `${issuePath}: ${issue.message}`;
    });
    throw new ModulePublishManifestError(parseResult.error.issues, reasons);
  }
  return parseResult.data;
};
