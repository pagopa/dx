/** Docusaurus plugin that loads DX tooling lifecycle data at build time
 * and exposes it to client components via global data. */
import type { Plugin } from "@docusaurus/types";

import fs from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

const VersionStatus = z.enum(["active", "maintenance", "deprecated", "eol"]);

const VersionEntrySchema = z
  .object({
    eolDate: z.string().date().optional(),
    migrationGuideUrl: z.string().url().optional(),
    notes: z.string().optional(),
    status: VersionStatus,
    supportedSince: z.string().date().optional(),
    version: z.string(),
  })
  .strict();

const ToolLifecycleSchema = z
  .object({
    category: z.enum(["runtime", "infra", "build-tool", "ci"]),
    communicationChannels: z.array(z.string()).min(1),
    id: z.string(),
    lifecyclePolicy: z.string(),
    name: z.string(),
    vendorLifecycleUrl: z
      .string()
      .refine((val) => val.startsWith("/") || /^https?:\/\//.test(val), {
        message: "Must be a URL (http(s)://) or an absolute path (/)",
      }),
    versions: z.array(VersionEntrySchema).min(1),
  })
  .strict();

const LifecycleDataSchema = z
  .object({
    $schema: z.string().optional(),
    tools: z.array(ToolLifecycleSchema).min(1),
  })
  .strict();

export type ToolLifecycle = z.infer<typeof ToolLifecycleSchema>;

export default function lifecycleDataLoaderPlugin(context: {
  siteDir: string;
}): Plugin<readonly ToolLifecycle[]> {
  const dataPath = path.join(
    context.siteDir,
    "src",
    "data",
    "lifecycle-data.json",
  );

  return {
    async contentLoaded({ actions, content }) {
      const { setGlobalData } = actions;
      setGlobalData({ tools: content });
    },

    async loadContent(): Promise<readonly ToolLifecycle[]> {
      const raw = await fs.readFile(dataPath, "utf-8");
      const parsed: unknown = JSON.parse(raw);
      const result = LifecycleDataSchema.safeParse(parsed);

      if (!result.success) {
        throw new Error(
          `[lifecycle-data-loader] Invalid lifecycle data: ${result.error.message}`,
        );
      }

      return result.data.tools;
    },

    name: "lifecycle-data-loader",
  };
}
