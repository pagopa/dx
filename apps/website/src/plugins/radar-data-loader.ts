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

interface RadarJsonEntry extends RadarEntry {
  readonly description: string;
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

    async postBuild({ content, outDir, siteConfig }) {
      const baseUrl = siteConfig.url.replace(/\/$/, "");
      const jsonEntries: RadarJsonEntry[] = (
        content as readonly RadarEntry[]
      ).map((entry) => {
        const raw = fs.readFileSync(
          path.join(radarDir, `${entry.slug}.md`),
          "utf-8",
        );
        const { content: body } = matter(raw);
        return {
          ...entry,
          description: extractDescription(body),
          ref: `${baseUrl}/radar/${entry.slug}`,
        };
      });
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
