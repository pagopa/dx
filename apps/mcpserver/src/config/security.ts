import { z } from "zod";

const securityConfigSchema = z.object({
  ALLOWED_ORIGINS: z.string().optional(),
  MAX_REQUEST_SIZE_BYTES: z.coerce
    .number()
    .int()
    .positive()
    .default(1024 * 1024), // 1MB
  RATE_LIMIT_MAX_REQUESTS: z.coerce.number().int().positive().default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce
    .number()
    .int()
    .positive()
    .default(15 * 60 * 1000), // 15 minutes
});

export type SecurityConfig = z.infer<typeof securityConfigSchema>;

export const securityConfig: SecurityConfig = securityConfigSchema.parse({
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  MAX_REQUEST_SIZE_BYTES: process.env.MAX_REQUEST_SIZE_BYTES,
  RATE_LIMIT_MAX_REQUESTS: process.env.RATE_LIMIT_MAX_REQUESTS,
  RATE_LIMIT_WINDOW_MS: process.env.RATE_LIMIT_WINDOW_MS,
});
