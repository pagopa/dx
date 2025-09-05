import { err, ok } from "neverthrow";
import { describe, expect, it } from "vitest";

import { parseYaml } from "../index.js";

describe("parseYaml", () => {
  const yamlContent = `
packages:
  - packages/*
  - apps/*
  - infra/modules/*

catalog:
  prettier: 3.6.2
  eslint: ^9.30.1
  typescript: ~5.8.3
  tsup: ^8.5.0
  vitest: ^3.2.4
  '@vitest/coverage-v8': ^3.2.4
  '@tsconfig/node20': ^20.1.6
  '@types/node': ^20.19.4

onlyBuiltDependencies:
  - esbuild

packageImportMethod: clone-or-copy
`;
  it("should parse valid YAML content", () => {
    const result = parseYaml(yamlContent);
    expect(result).toStrictEqual(
      ok({
        catalog: {
          "@tsconfig/node20": "^20.1.6",
          "@types/node": "^20.19.4",
          "@vitest/coverage-v8": "^3.2.4",
          eslint: "^9.30.1",
          prettier: "3.6.2",
          tsup: "^8.5.0",
          typescript: "~5.8.3",
          vitest: "^3.2.4",
        },
        onlyBuiltDependencies: ["esbuild"],
        packageImportMethod: "clone-or-copy",
        packages: ["packages/*", "apps/*", "infra/modules/*"],
      }),
    );
  });

  it("should parse empty YAML content", () => {
    const yamlContent = "";

    const result = parseYaml(yamlContent);

    expect(result).toStrictEqual(ok(null));
  });

  it("should return an error for invalid YAML content", () => {
    const result = parseYaml("invalid: yaml: content: here");

    expect(result).toStrictEqual(err(new Error("Failed to parse YAML")));
  });
});
