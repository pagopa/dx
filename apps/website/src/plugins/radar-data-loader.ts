import type { Plugin } from "@docusaurus/types";

import matter from "gray-matter";
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";

import type { RadarEntry } from "../components/TechRadar/types";

/** Zod schema to validate and coerce radar markdown frontmatter. */
const FrontmatterSchema = z.object({
  ring: z.enum(["adopt", "trial", "assess", "hold"]).default("assess"),
  tags: z.array(z.string()).default([]),
  title: z.string().optional(),
});

interface RadarJsonEntry extends RadarEntry {
  readonly ref: string;
}

const DESCRIPTION_MAX_LENGTH = 140;

/**
 * Docusaurus plugin that loads radar markdown frontmatter at build time
 * and makes metadata available to client components via global data.
 */
export default function radarDataLoaderPlugin(
  context: { siteDir: string },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _options: unknown,
): Plugin<readonly RadarEntry[]> {
  const radarDir = path.join(context.siteDir, "radar-docs");

  return {
    async contentLoaded({ actions, content }) {
      const { setGlobalData } = actions;
      setGlobalData({ entries: content });
    },

    async loadContent(): Promise<readonly RadarEntry[]> {
      const files = fs
        .readdirSync(radarDir)
        .filter((f) => f.endsWith(".md") && f !== "index.md");

      const entries: RadarEntry[] = files.flatMap((file) => {
        const raw = fs.readFileSync(path.join(radarDir, file), "utf-8");
        const { content: body, data } = matter(raw);
        const slug = file.replace(/\.md$/, "");
        const result = FrontmatterSchema.safeParse(data);
        if (!result.success) {
          console.warn(
            `[radar-data-loader] Invalid frontmatter in ${file}: ${result.error.message}`,
          );
          return [];
        }
        const { ring, tags, title } = result.data;
        return [
          {
            description: extractDescription(body),
            ring,
            slug,
            tags,
            title: title ?? slug,
          },
        ];
      });

      // Sort alphabetically by title
      return entries.sort((a, b) => a.title.localeCompare(b.title));
    },

    name: "radar-data-loader",

    async postBuild({ content, outDir, siteConfig }) {
      const siteBase = `${siteConfig.url.replace(/\/$/, "")}${siteConfig.baseUrl.replace(/\/$/, "")}`;
      const jsonEntries: RadarJsonEntry[] = (
        content as readonly RadarEntry[]
      ).map((entry) => ({
        ...entry,
        ref: `${siteBase}/radar/${entry.slug}`,
      }));
      fs.writeFileSync(
        path.join(outDir, "radar.json"),
        JSON.stringify(jsonEntries, null, 2),
      );
    },
  };
}

/** Extract a short plain-text snippet from markdown content. */
function extractDescription(markdown: string): string {
  // Strip markdown links, keeping link text
  const plain = markdown
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_`#>]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  // Take first sentence
  const firstSentence = plain.match(/^[^.!?]+[.!?]/);
  const snippet = firstSentence ? firstSentence[0].trim() : plain;
  if (snippet.length <= DESCRIPTION_MAX_LENGTH) {
    return snippet;
  }
  return `${snippet.slice(0, DESCRIPTION_MAX_LENGTH - 1)}…`;
}
