/**
 * Terraform state key helper.
 *
 * The container identifies the domain, while the key identifies the layer and
 * root path.
 */
import { z } from "zod";

const stateSegmentSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Terraform state names must use lowercase letters, numbers, and single hyphens",
  );
const rootPathSchema = z
  .string()
  .refine(
    (rootPath) =>
      !rootPath.startsWith("/") &&
      !/^[a-z]:/i.test(rootPath) &&
      !rootPath.includes("\\") &&
      rootPath
        .split("/")
        .every(
          (segment) =>
            segment.length > 0 &&
            segment !== "." &&
            segment !== ".." &&
            !segment.includes("\0"),
        ),
    "Terraform state paths must be relative paths with unambiguous directory separators",
  );

export const terraformStateKey = (layer: string, rootPath?: string): string => {
  const parsed = z
    .object({
      layer: stateSegmentSchema,
      rootPath: rootPathSchema.optional(),
    })
    .safeParse({ layer, rootPath });
  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ?? "Invalid Terraform state path",
      { cause: parsed.error },
    );
  }
  return rootPath ? `${layer}/${rootPath}.tfstate` : `${layer}.tfstate`;
};
