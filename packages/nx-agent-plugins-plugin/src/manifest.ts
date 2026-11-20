/**
 * Validates the Agent Plugin manifest format defined at
 * https://agent-plugins.org/plugin-authors/manifest for discovery and release versioning.
 */
import { z } from "zod/v4";

export const jsonCodec = <T extends z.core.$ZodType>(schema: T) =>
  z.codec(z.string(), schema, {
    decode: (jsonString, ctx) => {
      try {
        return JSON.parse(jsonString);
      } catch (error) {
        ctx.issues.push({
          code: "invalid_format",
          format: "json",
          input: jsonString,
          message: error instanceof Error ? error.message : String(error),
        });
        return z.NEVER;
      }
    },
    encode: (value) => JSON.stringify(value),
  });

export const agentPluginManifestSchema = jsonCodec(
  z.looseObject({
    name: z.string().trim().min(1),
    version: z.string().trim().min(1),
  }),
);

export type AgentPluginManifest = z.infer<typeof agentPluginManifestSchema>;

export const parseAgentPluginManifest = (
  content: string,
): AgentPluginManifest => agentPluginManifestSchema.decode(content);
