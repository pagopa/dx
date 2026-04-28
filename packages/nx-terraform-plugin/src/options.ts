import { z } from "zod/v4";

const targetNameSchema = z.string().regex(/^[a-zA-Z][a-zA-Z0-9-]{2,}$/, {
  message:
    "Target names must be at least 3 characters, not start with a number, and contain only letters, numbers, or dashes",
});

const terraformPluginOptionsSchema = z.object({
  applyTargetName: targetNameSchema,
  consoleTargetName: targetNameSchema,
  docsTargetName: targetNameSchema,
  formatTargetName: targetNameSchema,
  initTargetName: targetNameSchema,
  lintTargetName: targetNameSchema,
  outputTargetName: targetNameSchema,
  planTargetName: targetNameSchema,
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
  const opts = Object.assign({}, defaultOptions, parseResult.data);
  // Check uniqueness of target names
  const seen = new Map<string, string>();
  for (const [key, value] of Object.entries(opts)) {
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
