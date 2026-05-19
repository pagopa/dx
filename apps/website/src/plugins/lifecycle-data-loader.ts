/** Docusaurus plugin that loads DX tooling lifecycle data at build time
 * and exposes it to client components via global data. */
import type { Plugin } from "@docusaurus/types";

import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

const VersionStatus = z.enum(["active", "maintenance", "deprecated", "eol"]);

const VersionEntrySchema = z.object({
  eolDate: z.string().optional(),
  migrationGuideUrl: z.string().url().optional(),
  notes: z.string().optional(),
  status: VersionStatus,
  supportedSince: z.string().optional(),
  version: z.string(),
});

const ToolLifecycleSchema = z.object({
  category: z.enum(["runtime", "infra", "build-tool", "ci"]),
  communicationChannels: z.array(z.string()).min(1),
  id: z.string(),
  lifecyclePolicy: z.string(),
  name: z.string(),
  vendorLifecycleUrl: z
    .string()
    .refine((val) => val.startsWith("/") || val.startsWith("http"), {
      message: "Must be a URL or an absolute path",
    }),
  versions: z.array(VersionEntrySchema).min(1),
});

const LifecycleDataSchema = z.object({
  tools: z.array(ToolLifecycleSchema).min(1),
});

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
      const raw = fs.readFileSync(dataPath, "utf-8");
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
