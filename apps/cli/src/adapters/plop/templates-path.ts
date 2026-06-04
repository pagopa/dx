import path from "node:path";

/**
 * Resolves CLI plop templates from a single place so runtime wiring and tests
 * stay aligned with the package layout.
 */
export const resolveTemplatesPath = (
  generatorName: "environment" | "monorepo",
) => path.join(import.meta.dirname, "../../../templates", generatorName);
