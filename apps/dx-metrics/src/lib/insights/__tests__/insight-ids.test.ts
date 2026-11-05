/**
 * Guards the cross-dashboard insight merge in the overview page: `InsightsPanel`
 * keys cards by `insight.id`, so ids must not collide across dashboard builders.
 *
 * A single builder may reuse one id across mutually exclusive branches (e.g.
 * `workflow-success-rate` for the "on target" and "below threshold" variants);
 * those are deduplicated per file. Collisions between different files would
 * merge into duplicate cards, so they fail.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it } from "vitest";

const INSIGHTS_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);

const collectIdsByFile = (): Map<string, string[]> => {
  const byFile = new Map<string, string[]>();

  const files = fs
    .readdirSync(INSIGHTS_DIR)
    .filter((file) => file.endsWith(".ts") && !file.endsWith(".test.ts"));

  for (const file of files) {
    const source = fs.readFileSync(path.join(INSIGHTS_DIR, file), "utf8");
    const ids = [...source.matchAll(/^\s*id: "([^"]+)",/gm)].map(
      (match) => match[1],
    );

    if (ids.length > 0) {
      byFile.set(file, ids);
    }
  }

  return byFile;
};

describe("insight ids", () => {
  it("are unique across every dashboard builder", () => {
    const byFile = collectIdsByFile();
    const ownerByID = new Map<string, string>();
    const collisions: string[] = [];

    for (const [file, ids] of byFile) {
      for (const id of new Set(ids)) {
        const owner = ownerByID.get(id);

        if (owner === undefined) {
          ownerByID.set(id, file);
        } else {
          collisions.push(`${id} (${owner} & ${file})`);
        }
      }
    }

    expect(byFile.size).toBeGreaterThan(0);
    expect(collisions).toEqual([]);
  });
});
