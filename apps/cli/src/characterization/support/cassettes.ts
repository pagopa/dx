/**
 * Cassette persistence for dx-cli characterization suites.
 * It keeps record/verify artifacts local to the package-level harness.
 */

import assert from "node:assert/strict";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export type ScenarioCassette = {
  normalization: Record<string, unknown>;
  request: Record<string, unknown>;
  response: Record<string, unknown>;
  sideEffects: Record<string, unknown>;
  topology: Record<string, unknown>;
};

export type ScenarioName = "dx-add-environment-init" | "dx-init-publish";

const supportRoot = path.dirname(fileURLToPath(import.meta.url));
const cassettesRoot = path.join(supportRoot, "..", "cassettes");

const sortObjectKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortObjectKeys);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortObjectKeys(nestedValue)]),
    );
  }

  return value;
};

const cassetteFile = (scenario: ScenarioName, name: keyof ScenarioCassette) =>
  path.join(cassettesRoot, scenario, `${name}.json`);

const stableStringify = (value: unknown): string =>
  `${JSON.stringify(sortObjectKeys(value), null, 2)}\n`;

const readJson = async (filePath: string): Promise<unknown> =>
  JSON.parse(await readFile(filePath, "utf8"));

const writeJson = async (filePath: string, value: unknown): Promise<void> => {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, stableStringify(value));
};

export const writeCassette = async (
  scenario: ScenarioName,
  cassette: ScenarioCassette,
): Promise<void> => {
  await Promise.all([
    writeJson(cassetteFile(scenario, "request"), cassette.request),
    writeJson(cassetteFile(scenario, "response"), cassette.response),
    writeJson(cassetteFile(scenario, "sideEffects"), cassette.sideEffects),
    writeJson(cassetteFile(scenario, "topology"), cassette.topology),
    writeJson(cassetteFile(scenario, "normalization"), cassette.normalization),
  ]);
};

export const assertCassetteMatches = async (
  scenario: ScenarioName,
  cassette: ScenarioCassette,
): Promise<void> => {
  const expected = {
    normalization: await readJson(cassetteFile(scenario, "normalization")),
    request: await readJson(cassetteFile(scenario, "request")),
    response: await readJson(cassetteFile(scenario, "response")),
    sideEffects: await readJson(cassetteFile(scenario, "sideEffects")),
    topology: await readJson(cassetteFile(scenario, "topology")),
  };

  assert.deepStrictEqual(sortObjectKeys(cassette), sortObjectKeys(expected));
};
