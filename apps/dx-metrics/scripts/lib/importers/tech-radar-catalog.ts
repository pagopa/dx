/** This module defines Techradar tool detectors and loads radar metadata. */

import { z } from "zod";

const DX_TECH_RADAR_URL = "https://dx.pagopa.it/radar.json";

const RadarEntrySchema = z.object({
  description: z.string(),
  ref: z.url(),
  ring: z.enum(["adopt", "trial", "assess", "hold"]),
  slug: z.string().min(1),
  tags: z.array(z.string()),
  title: z.string().min(1),
});

const RadarEntriesSchema = z.array(RadarEntrySchema);

const techRadarToolCatalog = [
  {
    buildSearchQuery: (repositoryFullName: string) =>
      `repo:${repositoryFullName} filename:pnpm-lock.yaml`,
    key: "pnpm",
    radarSlug: "pnpm",
    toolName: "pnpm",
  },
  {
    buildSearchQuery: (repositoryFullName: string) =>
      `repo:${repositoryFullName} filename:package-lock.json`,
    key: "npm",
    radarSlug: "npm",
    toolName: "npm",
  },
  {
    buildSearchQuery: (repositoryFullName: string) =>
      `repo:${repositoryFullName} filename:turbo.json`,
    key: "turborepo",
    radarSlug: "turborepo",
    toolName: "Turborepo",
  },
  {
    buildSearchQuery: (repositoryFullName: string) =>
      `repo:${repositoryFullName} filename:config.json path:.changeset`,
    key: "changeset",
    radarSlug: "changeset",
    toolName: "Changeset",
  },
  {
    buildSearchQuery: (repositoryFullName: string) =>
      `repo:${repositoryFullName} filename:nx.json`,
    key: "nx",
    radarSlug: null,
    toolName: "Nx",
  },
] as const;

export interface LoadedTechRadarTool {
  buildSearchQuery: (repositoryFullName: string) => string;
  key: TechRadarToolKey;
  radarRef: null | string;
  radarRing: "adopt" | "assess" | "hold" | "trial" | null;
  radarSlug: null | string;
  radarStatus: "aligned" | "not-in-radar";
  radarTitle: null | string;
  toolName: string;
}

export type TechRadarToolKey = (typeof techRadarToolCatalog)[number]["key"];

type RadarEntry = z.infer<typeof RadarEntrySchema>;

let radarEntriesPromise: Promise<Map<string, RadarEntry>> | undefined;

const buildRadarEntryIndex = async (): Promise<Map<string, RadarEntry>> => {
  const response = await fetch(DX_TECH_RADAR_URL);
  if (!response.ok) {
    throw new Error(
      `Unable to fetch DX radar catalog: ${response.status} ${response.statusText}`,
    );
  }

  const payload: unknown = await response.json();
  const parsedEntries = RadarEntriesSchema.safeParse(payload);
  if (!parsedEntries.success) {
    throw new Error(
      `Invalid DX radar payload: ${parsedEntries.error.issues.map((issue) => issue.message).join(", ")}`,
    );
  }

  return new Map(
    parsedEntries.data.map((entry) => [entry.slug, entry] as const),
  );
};

const loadRadarEntryIndex = async (): Promise<Map<string, RadarEntry>> => {
  radarEntriesPromise ??= buildRadarEntryIndex();

  return radarEntriesPromise;
};

export async function loadTechRadarTools(): Promise<
  readonly LoadedTechRadarTool[]
> {
  const radarEntryIndex = await loadRadarEntryIndex();

  return techRadarToolCatalog.map((tool) => {
    if (tool.radarSlug === null) {
      return {
        ...tool,
        radarRef: null,
        radarRing: null,
        radarStatus: "not-in-radar" as const,
        radarTitle: null,
      };
    }

    const radarEntry = radarEntryIndex.get(tool.radarSlug);
    if (!radarEntry) {
      throw new Error(`Radar entry not found for slug "${tool.radarSlug}"`);
    }

    return {
      ...tool,
      radarRef: radarEntry.ref,
      radarRing: radarEntry.ring,
      radarStatus: "aligned" as const,
      radarTitle: radarEntry.title,
    };
  });
}
