import { z } from "zod/v4";

import { publishSchema } from "./publish-options.ts";

// Parses and validates module.json files for publishable Terraform modules.
export const modulePublishManifestSchema = publishSchema.extend({
  github: z
    .object({
      owner: z.string().min(1).optional(),
    })
    .optional(),
});

export type ModulePublishManifest = z.infer<typeof modulePublishManifestSchema>;

export class ModulePublishManifestError extends Error {
  readonly issues: z.core.$ZodIssue[];
  readonly reasons: string[];

  constructor(issues: z.core.$ZodIssue[], reasons: string[]) {
    super(reasons.join("; "));
    this.issues = issues;
    this.reasons = reasons;
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

// Parses and validates environment.json files for deployable Terraform
// environments (e.g. infra/resources/dev). Unlike module.json, this manifest
// only tracks a release version — there is no registry/publish metadata.
export const environmentManifestSchema = z.object({
  version: z.string().min(1),
});

export type EnvironmentManifest = z.infer<typeof environmentManifestSchema>;

export class EnvironmentManifestError extends Error {
  readonly issues: z.core.$ZodIssue[];
  readonly reasons: string[];

  constructor(issues: z.core.$ZodIssue[], reasons: string[]) {
    super(reasons.join("; "));
    this.issues = issues;
    this.reasons = reasons;
    this.name = "EnvironmentManifestError";
  }
}

export const parseEnvironmentManifest = (
  input: unknown,
): EnvironmentManifest => {
  const parseResult = environmentManifestSchema.safeParse(input);
  if (!parseResult.success) {
    const reasons = parseResult.error.issues.map((issue) => {
      const issuePath = issue.path.join(".");
      return `${issuePath}: ${issue.message}`;
    });
    throw new EnvironmentManifestError(parseResult.error.issues, reasons);
  }
  return parseResult.data;
};
