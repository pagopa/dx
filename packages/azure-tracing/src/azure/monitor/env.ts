// Load and type check environment variables on runtime
import { createEnv } from "@t3-oss/env-core";
import { z } from "zod";

/** The environment as parsed and validated by {@link loadEnv}. */
export type AzureTracingEnv = ReturnType<typeof loadEnv>;

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
        .optional()
        .describe(
          "The connection string for Application Insights. Optional here because it may be provided through the Azure Monitor options override; the resolved configuration still requires it.",
        ),
      APPLICATIONINSIGHTS_ENTRA_ID_AUTH_ENABLED: z
        .string()
        .optional()
        .transform((value) => value?.trim().toLowerCase() === "true")
        .describe(
          "When set to 'true' (case-insensitive), enables Microsoft Entra ID (Managed Identity) authentication for Application Insights. " +
            "Any other value keeps connection-string-only auth, which is the default. " +
            "This will become the default in the next major release.",
        ),
    },
  });
