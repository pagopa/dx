/**
 * @fileoverview Input schemas for the Terraform permission-check action.
 *
 * The action validates every GitHub input before reading files or calling the
 * Foundry gateway so workflow failures are explicit and safe by default.
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
      (value) => {
        const normalized = path.resolve(value).toLowerCase();
        return !SENSITIVE_PATH_PATTERNS.some((pattern) =>
          normalized.includes(pattern),
        );
      },
      { message: `${fieldName} points to a potentially sensitive location` },
    );

const optionalSafePath = (fieldName: string) =>
  z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined))
    .pipe(safePath(fieldName).optional());

const optionalNonEmpty = z
  .string()
  .optional()
  .transform((value) => (value && value.length > 0 ? value : undefined));

export const InputsSchema = z.object({
  "azure-mcp-args": z.string().min(1),
  "azure-mcp-command": z.string().min(1),
  "azure-mcp-enabled": z
    .enum(["true", "false"])
    .transform((value) => value === "true"),
  "azure-mcp-timeout-ms": z.coerce.number().int().min(1000).max(60000),
  "azure-subscription-id": optionalNonEmpty,
  "cd-identity-name": z
    .string()
    .optional()
    .transform((value) => (value && value.length > 0 ? value : undefined)),
  "filtered-plan-path": safePath("filtered-plan-path"),
  "gateway-token-scope": z.string().min(1),
  "gateway-url": z.string().url(),
  "model-deployment-name": z.string().min(1),
  "output-file": safePath("output-file"),
  "skill-path": optionalSafePath("skill-path"),
  "working-directory": safePath("working-directory"),
});

export type Inputs = z.infer<typeof InputsSchema>;

export const FoundryResponseSchema = z
  .object({
    output: z
      .array(
        z.object({
          content: z
            .array(
              z.object({
                text: z.string().optional(),
                type: z.string().optional(),
              }),
            )
            .optional(),
        }),
      )
      .optional(),
    output_text: z.string().optional(),
  })
  .passthrough();

export type FoundryResponse = z.infer<typeof FoundryResponseSchema>;
