import { z } from "zod/v4";

import { publishSchema } from "./publish-options.ts";

// Parses and validates Terraform publishing metadata from project.json.
export const terraformProjectMetadataSchema = publishSchema.extend({
  github: z
    .object({
      owner: z.string().min(1).optional(),
    })
    .optional(),
});

export type TerraformProjectMetadata = z.infer<
  typeof terraformProjectMetadataSchema
>;

export class TerraformProjectMetadataError extends Error {
  readonly issues: z.core.$ZodIssue[];
  readonly reasons: string[];

  constructor(issues: z.core.$ZodIssue[], reasons: string[]) {
    super(reasons.join("; "));
    this.issues = issues;
    this.reasons = reasons;
    this.name = "TerraformProjectMetadataError";
  }
}

export const parseTerraformProjectMetadata = (
  input: unknown,
): TerraformProjectMetadata => {
  const parseResult = terraformProjectMetadataSchema.safeParse(input);
  if (!parseResult.success) {
    const reasons = parseResult.error.issues.map((issue) => {
      const issuePath = issue.path.join(".");
      return `${issuePath}: ${issue.message}`;
    });
    throw new TerraformProjectMetadataError(parseResult.error.issues, reasons);
  }
  return parseResult.data;
};
