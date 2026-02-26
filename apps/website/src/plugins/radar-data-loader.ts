import type { Plugin } from "@docusaurus/types";

import matter from "gray-matter";
import fs from "node:fs";
import path from "node:path";

interface RadarEntry {
  readonly ring: string;
  readonly slug: string;
  readonly tags: readonly string[];
  readonly title: string;
}

/**
 * Docusaurus plugin that loads radar markdown frontmatter at build time
 * and makes metadata available to client components via global data.
 */
export default function radarDataLoaderPlugin(
  context: { siteDir: string },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: unknown,
): Plugin<readonly RadarEntry[]> {
  const radarDir = path.join(context.siteDir, "radar");

  return {
    async contentLoaded({ actions, content }) {
      const { setGlobalData } = actions;
      setGlobalData({ entries: content });
    },

    async loadContent(): Promise<readonly RadarEntry[]> {
      const files = fs
        .readdirSync(radarDir)
        .filter((f) => f.endsWith(".md") && f !== "index.md");

      const entries: RadarEntry[] = files.map((file) => {
        const raw = fs.readFileSync(path.join(radarDir, file), "utf-8");
        const { data } = matter(raw);
        const slug = file.replace(/\.md$/, "");
        return {
          ring: (data.ring as string) ?? "assess",
          slug,
          tags: (data.tags as string[]) ?? [],
          title: (data.title as string) ?? slug,
        };
      });

      // Sort alphabetically by title
      return entries.sort((a, b) => a.title.localeCompare(b.title));
    },

    name: "radar-data-loader",
  };
}
