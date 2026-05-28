import * as semver from "semver";
import { stringFormat, z } from "zod/v4";

import type { ModulePublishManifest } from "./manifest.ts";

// Validates semver version strings using the semver package.
// Accepts standard semver format (e.g., 1.2.3, 1.0.0-alpha, 1.2.3+build).
// Rejects prefixed versions (e.g., v1.2.3), partial versions (e.g., 1.2), and arbitrary strings.
export const semverSchema = stringFormat(
  "semver",
  (value) => {
    // Let Zod's type system handle non-string values (undefined, null, etc.)
    if (typeof value !== "string") {
      return true;
    }
    // Reject empty strings or strings starting with 'v'
    if (!value || value.startsWith("v")) {
      return false;
    }
    // Use semver.valid to validate proper semver format
    return semver.valid(value) !== null;
  },
  "Invalid semver version",
);

// Defines the publish option schemas shared by plugin defaults and module manifests.
export const publishSchema = z.object({
  description: z.string().min(1),
  github: z.object({
    owner: z.string().min(1),
  }),
  provider: z.string().min(1),
  version: semverSchema,
});

export type PublishOptions = z.infer<typeof publishSchema>;

export class PublishOptionsError extends Error {
  readonly issues: z.core.$ZodIssue[];

  constructor(issues: z.core.$ZodIssue[]) {
    super("Invalid publish options");
    this.issues = issues;
    this.name = "PublishOptionsError";
  }
}

export const pluginPublishOptionsSchema = publishSchema
  .pick({ github: true })
  .extend({
    github: z
      .object({
        owner: z.string().min(1).optional(),
      })
      .optional(),
  });

export type PluginPublishOptions = z.infer<typeof pluginPublishOptionsSchema>;

export const mergePublishOptions = (
  pluginPublishOptions: PluginPublishOptions,
  manifest: ModulePublishManifest,
): PublishOptions => {
  const parseResult = publishSchema.safeParse({
    ...pluginPublishOptions,
    ...manifest,
    github: {
      ...pluginPublishOptions.github,
      ...manifest.github,
    },
  });

  if (!parseResult.success) {
    throw new PublishOptionsError(parseResult.error.issues);
  }

  return parseResult.data;
};
