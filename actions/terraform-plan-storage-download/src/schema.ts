/**
 * @fileoverview Input/state validation schema for the Terraform Plan Storage Download action.
 *
 * - `ContextSchema`   — used by main.ts to validate action inputs.
 * - `PostStateSchema` — used by post.ts to validate values read from GITHUB_STATE.
 *
 * Uses a discriminated union on `provider` so that required cloud-specific
 * fields are enforced by the schema itself, avoiding runtime surprises.
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

/** Schema for main.ts — full action inputs including extraction target. */
export const ContextSchema = z.discriminatedUnion("provider", [
  z.object({
    "azure-container": z
      .string()
      .min(1, "azure-container is required when provider is 'azure'"),
    "azure-storage-account": z
      .string()
      .min(1, "azure-storage-account is required when provider is 'azure'"),
    "plan-path": z.string().min(1, "plan-path must not be empty"),
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
    "plan-path": z.string().min(1, "plan-path must not be empty"),
    provider: z.literal("aws"),
    "working-directory": safePath("working-directory"),
  }),
]);

/**
 * Schema for post.ts — only the fields saved to GITHUB_STATE by main.ts.
 * `working-directory` is intentionally omitted: the post step only needs to
 * delete the remote object; local cleanup is handled by main.ts after extraction.
 */
export const PostStateSchema = z.discriminatedUnion("provider", [
  z.object({
    "azure-container": z
      .string()
      .min(1, "azure-container is required when provider is 'azure'"),
    "azure-storage-account": z
      .string()
      .min(1, "azure-storage-account is required when provider is 'azure'"),
    "plan-path": z.string().min(1, "plan-path must not be empty"),
    provider: z.literal("azure"),
  }),
  z.object({
    "aws-bucket": z
      .string()
      .min(1, "aws-bucket is required when provider is 'aws'"),
    "aws-region": z
      .string()
      .min(1, "aws-region is required when provider is 'aws'"),
    "plan-path": z.string().min(1, "plan-path must not be empty"),
    provider: z.literal("aws"),
  }),
]);

export type Context = z.infer<typeof ContextSchema>;
export type PostState = z.infer<typeof PostStateSchema>;
