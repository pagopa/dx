// Load and type check environment variables on runtime
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

export const loadEnv = () =>
  createEnv({
    emptyStringAsUndefined: true,
    onValidationError: (errors) => {
      throw new Error(
        errors
          .map(
            (error) => `Environment variable ${error.path} - ${error.message}`,
          )
          .join(", "),
      );
    },
    runtimeEnv: process.env,
    server: {
      APPINSIGHTS_SAMPLING_PERCENTAGE: z
        .optional(
          z.coerce
            .number()
            .min(0)
            .max(100)
            .default(5)
            .describe(
              "Application Insights sampling percentage between 0 and 100. If not set, defaults to 5.",
            ),
        )
        .transform((value) => {
          const percentage = Number(value);
          return isNaN(percentage) ? 5 : percentage;
        })
        .transform((value) => value / 100),
      APPLICATIONINSIGHTS_CONNECTION_STRING: z
        .string()
        .describe("The connection string for Application Insights."),
      APPLICATIONINSIGHTS_USE_MANAGED_IDENTITY: z
        .enum(["true", "false"])
        .optional()
        .default("false")
        .transform((v) => v === "true")
        .describe(
          "When set to 'true', uses Azure Managed Identity (DefaultAzureCredential) for authentication instead of the connection string key. The connection string is still required to identify the Application Insights resource endpoint.",
        ),
    },
  });
