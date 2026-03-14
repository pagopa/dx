/**
 * @fileoverview Input validation schema for the Terraform Plan Storage Upload action.
 *
 * Only `plan-file` and `working-directory` are required as inputs.
 * All other storage coordinates (provider, account, bucket, …) are derived
 * at runtime by reading `.terraform/terraform.tfstate`.
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

export const InputsSchema = z.object({
  "plan-file": safePath("plan-file"),
  "working-directory": safePath("working-directory"),
});

export type Inputs = z.infer<typeof InputsSchema>;
