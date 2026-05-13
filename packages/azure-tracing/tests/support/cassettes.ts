/**
 * Persist multilayer characterization cassettes with deterministic JSON ordering.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface ScenarioCassette {
  normalization: unknown;
  request: unknown;
  response: unknown;
  sideEffects: unknown;
  topology: unknown;
}

const cassetteRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
  "characterization",
  "cassettes",
);

const scenarioFile = (scenario: string, fileName: string) =>
  path.join(cassetteRoot, scenario, fileName);

const sortJson = (value: unknown): unknown => {
  if (Array.isArray(value)) {
    return value.map(sortJson);
  }

  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, nestedValue]) => [key, sortJson(nestedValue)]),
    );
  }

  return value;
};

export const writeScenarioCassette = async (
  scenario: string,
  cassette: ScenarioCassette,
) => {
  const layers = {
    "normalization.json": cassette.normalization,
    "request.json": cassette.request,
    "response.json": cassette.response,
    "side-effects.json": cassette.sideEffects,
    "topology.json": cassette.topology,
  } as const;

  await Promise.all(
    Object.entries(layers).map(async ([fileName, layer]) => {
      const outputFile = scenarioFile(scenario, fileName);
      await mkdir(path.dirname(outputFile), { recursive: true });
      await writeFile(
        outputFile,
        `${JSON.stringify(sortJson(layer), null, 2)}\n`,
        "utf8",
      );
    }),
  );
};

export const readScenarioCassette = async (
  scenario: string,
): Promise<ScenarioCassette> => {
  const [normalization, request, response, sideEffects, topology] =
    await Promise.all([
      readFile(scenarioFile(scenario, "normalization.json"), "utf8"),
      readFile(scenarioFile(scenario, "request.json"), "utf8"),
      readFile(scenarioFile(scenario, "response.json"), "utf8"),
      readFile(scenarioFile(scenario, "side-effects.json"), "utf8"),
      readFile(scenarioFile(scenario, "topology.json"), "utf8"),
    ]);

  return {
    normalization: JSON.parse(normalization),
    request: JSON.parse(request),
    response: JSON.parse(response),
    sideEffects: JSON.parse(sideEffects),
    topology: JSON.parse(topology),
  };
};
