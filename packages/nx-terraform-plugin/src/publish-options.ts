import { z } from "zod/v4";

import type { ModulePublishManifest } from "./manifest.ts";

// Defines the publish option schemas shared by plugin defaults and module manifests.
export const publishSchema = z.object({
  description: z.string().min(1),
  github: z.object({
    owner: z.string().min(1),
  }),
  provider: z.string().min(1),
  version: z.string().min(1),
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
