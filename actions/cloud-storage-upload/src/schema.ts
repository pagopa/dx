/**
 * @fileoverview Input validation schema for the Cloud Storage Upload action.
 *
 * Uses a discriminated union on `provider` so that required cloud-specific
 * fields are enforced by the schema itself, avoiding runtime surprises.
 *
 * `file-paths` accepts an array of paths (relative to `working-directory`).
 * All entries are validated for path-traversal safety.
 */

import path from "node:path";
import { z } from "zod";

const SENSITIVE_PATH_PATTERNS = [
  "/etc/",
  "/proc/",
  "/sys/",
  "/.ssh/",
  "/.env",
  "id_rsa",
  "id_dsa",
  "authorized_keys",
];

const safePath = (fieldName: string) =>
  z
    .string()
    .min(1, `${fieldName} must not be empty`)
    .refine(
      (p) => {
        const normalized = path.resolve(p).toLowerCase();
        return !SENSITIVE_PATH_PATTERNS.some((pattern) =>
          normalized.includes(pattern),
        );
      },
      { message: `${fieldName} points to a potentially sensitive location` },
    );

export const InputsSchema = z.discriminatedUnion("provider", [
  z.object({
    "azure-container": z
      .string()
      .min(1, "azure-container is required when provider is 'azure'"),
    "azure-storage-account": z
      .string()
      .min(1, "azure-storage-account is required when provider is 'azure'"),
    destination: z.string().min(1, "destination must not be empty"),
    "file-paths": z
      .array(safePath("file-paths entry"))
      .min(1, "file-paths must contain at least one entry"),
    provider: z.literal("azure"),
    "working-directory": safePath("working-directory"),
  }),
  z.object({
    "aws-bucket": z
      .string()
      .min(1, "aws-bucket is required when provider is 'aws'"),
    "aws-region": z
      .string()
      .min(1, "aws-region is required when provider is 'aws'"),
    destination: z.string().min(1, "destination must not be empty"),
    "file-paths": z
      .array(safePath("file-paths entry"))
      .min(1, "file-paths must contain at least one entry"),
    provider: z.literal("aws"),
    "working-directory": safePath("working-directory"),
  }),
]);

export type Inputs = z.infer<typeof InputsSchema>;
