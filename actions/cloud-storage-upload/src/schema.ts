/**
 * @fileoverview Input validation schema for the Cloud Storage Upload action.
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

const safeFilePath = z
  .string()
  .min(1, "file-path must not be empty")
  .refine(
    (filePath) => {
      const normalized = path.resolve(filePath).toLowerCase();
      return !SENSITIVE_PATH_PATTERNS.some((p) => normalized.includes(p));
    },
    { message: "file-path points to a potentially sensitive location" },
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
    "file-path": safeFilePath,
    provider: z.literal("azure"),
  }),
  z.object({
    "aws-bucket": z
      .string()
      .min(1, "aws-bucket is required when provider is 'aws'"),
    "aws-region": z
      .string()
      .min(1, "aws-region is required when provider is 'aws'"),
    destination: z.string().min(1, "destination must not be empty"),
    "file-path": safeFilePath,
    provider: z.literal("aws"),
  }),
]);

export type Inputs = z.infer<typeof InputsSchema>;
