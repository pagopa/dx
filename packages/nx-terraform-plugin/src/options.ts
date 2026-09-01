import { z } from "zod/v4";

import { pluginPublishOptionsSchema } from "./publish-options.ts";

const environmentNameSchema = z.string().regex(/^[a-z0-9][a-z0-9_-]*$/, {
  message:
    "Environment names must start with a lowercase letter or number and contain only lowercase letters, numbers, underscores, or dashes",
});

export const publishOptionsSchema = z.object({
  github: pluginPublishOptionsSchema.shape.github,
  mode: z.literal("github"),
});

export type PublishOptions = z.infer<typeof publishOptionsSchema>;

const terraformPluginOptionsSchema = z.object({
  additionalEnvironments: z.array(environmentNameSchema),
  publish: publishOptionsSchema,
  targetNamePrefix: z.string(),
});

export type TerraformPluginOptions = z.infer<
  typeof terraformPluginOptionsSchema
>;

const defaultOptions: TerraformPluginOptions = {
  additionalEnvironments: [],
  publish: {
    mode: "github",
  },
  targetNamePrefix: "",
};

export const parseOptions = (
  options: Partial<TerraformPluginOptions> | undefined,
): TerraformPluginOptions => {
  const parseResult = terraformPluginOptionsSchema
    .partial()
    .safeParse(options ?? {});
  if (!parseResult.success) {
    const validationErrors = parseResult.error.issues
      .map((issue) => {
        const path = issue.path.length > 0 ? issue.path.join(".") : "options";
        return `${path}: ${issue.message}`;
      })
      .join("; ");
    throw new Error(`Invalid Terraform plugin options: ${validationErrors}`);
  }
  const opts = {
    ...defaultOptions,
    ...parseResult.data,
    publish: {
      ...defaultOptions.publish,
      ...parseResult.data.publish,
      ...(parseResult.data.publish?.github
        ? {
            github: {
              ...defaultOptions.publish.github,
              ...parseResult.data.publish.github,
            },
          }
        : {}),
    },
  };
  return opts;
};
