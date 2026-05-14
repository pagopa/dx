import { z } from "zod/v4";

import { pluginPublishOptionsSchema } from "./publish-options.ts";

const targetNameSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{2,}$/, {
  message:
    "Target names must be at least 3 characters, not start with a number, and contain only letters, numbers, or dashes",
});

export const publishOptionsSchema = z.object({
  github: pluginPublishOptionsSchema.shape.github,
  mode: z.literal("github"),
});

export type PublishOptions = z.infer<typeof publishOptionsSchema>;

const terraformPluginOptionsSchema = z.object({
  applyTargetName: targetNameSchema,
  consoleTargetName: targetNameSchema,
  docsTargetName: targetNameSchema,
  formatTargetName: targetNameSchema,
  initTargetName: targetNameSchema,
  lintTargetName: targetNameSchema,
  outputTargetName: targetNameSchema,
  planTargetName: targetNameSchema,
  publish: publishOptionsSchema,
  publishTargetName: targetNameSchema,
  testTargetName: targetNameSchema,
  validateTargetName: targetNameSchema,
});

export type TerraformPluginOptions = z.infer<
  typeof terraformPluginOptionsSchema
>;

const defaultOptions: TerraformPluginOptions = {
  applyTargetName: "tf-apply",
  consoleTargetName: "tf-console",
  docsTargetName: "terraform-docs",
  formatTargetName: "tf-fmt",
  initTargetName: "tf-init",
  lintTargetName: "tflint",
  outputTargetName: "tf-output",
  planTargetName: "tf-plan",
  publish: {
    mode: "github",
  },
  publishTargetName: "nx-release-publish",
  testTargetName: "tf-test",
  validateTargetName: "tf-validate",
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
  // Check uniqueness of target names
  const seen = new Map<string, string>();
  const targetNames = Object.entries(opts).filter(
    (entry): entry is [string, string] => entry[0].endsWith("TargetName"),
  );
  for (const [key, value] of targetNames) {
    const existing = seen.get(value);
    if (existing) {
      throw new Error(
        `Invalid Terraform plugin options: Target name "${value}" is duplicated for keys "${existing}" and "${key}"`,
      );
    }
    seen.set(value, key);
  }
  return opts;
};
