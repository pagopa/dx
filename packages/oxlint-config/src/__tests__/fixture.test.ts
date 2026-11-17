import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  JAVASCRIPT_FIXTURE,
  TSX_FIXTURE,
  TYPESCRIPT_FIXTURE,
  VITEST_FIXTURE,
} from "./fixtures.ts";
import {
  BASE_CONFIG_PATH,
  type Finding,
  getEslintRules,
  getTestRules,
  loadBaseConfig,
  runEslint,
  runOxlint,
  toCanonicalRuleId,
} from "./support.ts";

const PERFECTIONIST = "perfectionist/";

/**
 * `sort-export-attributes` and `sort-import-attributes` need `with` clauses
 * carrying more than one attribute, which TypeScript does not model as a
 * sortable list. They are the only two perfectionist rules this fixture cannot
 * exercise.
 */
const UNCOVERED_PERFECTIONIST_RULES = [
  "perfectionist/sort-export-attributes",
  "perfectionist/sort-import-attributes",
];

/**
 * Rules the two engines implement with different precision rather than
 * configure differently: oxlint misses assignments that are read before being
 * overwritten, so it reports fewer findings on the same code.
 */
const IMPLEMENTATION_GAPS = ["no-useless-assignment"];

const FIXTURES: [file: string, source: string][] = [
  ["javascript.js", JAVASCRIPT_FIXTURE],
  ["typescript.ts", TYPESCRIPT_FIXTURE],
  ["tsx.tsx", TSX_FIXTURE],
  ["unit.test.ts", VITEST_FIXTURE],
];

const project = mkdtempSync(join(tmpdir(), "oxlint-config-"));

mkdirSync(join(project, "src"), { recursive: true });
writeFileSync(
  join(project, ".oxlintrc.json"),
  JSON.stringify({ extends: [BASE_CONFIG_PATH] }, null, 2),
);
for (const [file, source] of FIXTURES) {
  writeFileSync(join(project, "src", file), source);
}

afterAll(() => {
  rmSync(project, { force: true, recursive: true });
});

interface Result {
  eslint: Finding[];
  oxlint: Finding[];
}

const results = new Map<string, Result>();

beforeAll(async () => {
  for (const [file] of FIXTURES) {
    const relativePath = `src/${file}`;
    const eslintRules = await getEslintRules(relativePath);
    results.set(relativePath, {
      eslint: await runEslint(project, join(project, relativePath)),
      oxlint: runOxlint(project, relativePath).map((finding) => ({
        ...finding,
        rule: toCanonicalRuleId(finding.rule, eslintRules) ?? finding.rule,
      })),
    });
  }
});

const perfectionistFindings = (findings: Finding[]) =>
  findings.filter(({ rule }) => rule.startsWith(PERFECTIONIST));

const byPosition = ({ column, line, rule }: Finding) =>
  `${rule}:${line}:${column}`;

const byRuleAndLine = ({ line, rule }: Finding) => `${rule}:${line}`;

/** Fixtures typed enough for both engines to locate findings identically. */
const TYPED_FIXTURES = FIXTURES.filter(
  ([file]) => file.endsWith(".ts") || file.endsWith(".tsx"),
);

const rulesOf = (findings: Finding[]) =>
  findings.map(({ rule }) => rule).toSorted();

describe("fixtures", () => {
  describe.each(FIXTURES)("%s", (file) => {
    const relativePath = `src/${file}`;

    it("reports every oxlint rule id as an ESLint rule id", async () => {
      const eslintRules = await getEslintRules(relativePath);
      const unmapped = runOxlint(project, relativePath)
        .filter(
          ({ rule }) =>
            !rule.startsWith(PERFECTIONIST) &&
            toCanonicalRuleId(rule, eslintRules) === undefined,
        )
        .map(byPosition);

      expect(unmapped).toEqual([]);
    });
  });

  describe.each(TYPED_FIXTURES)("%s", (file) => {
    const relativePath = `src/${file}`;
    const result = () => results.get(relativePath) as Result;

    it("reports the same rules on the same lines as ESLint", () => {
      expect(result().oxlint.map(byRuleAndLine).toSorted()).toEqual(
        result().eslint.map(byRuleAndLine).toSorted(),
      );
    });

    it("reports perfectionist findings where ESLint reports them", () => {
      const actual = perfectionistFindings(result().oxlint);
      const expected = perfectionistFindings(result().eslint);

      expect(actual.length).toBeGreaterThan(0);
      expect(actual.map(byPosition).toSorted()).toEqual(
        expected.map(byPosition).toSorted(),
      );
    });
  });

  describe("unit.test.ts", () => {
    const result = () => results.get("src/unit.test.ts") as Result;

    it("relaxes the rules the Vitest overlay turns off", () => {
      const reported = rulesOf([...result().oxlint, ...result().eslint]);

      expect(reported).toContain("vitest/prefer-todo");
      expect(reported).not.toContain("no-empty-function");
      expect(reported).not.toContain("@typescript-eslint/no-empty-function");
    });
  });

  describe("typescript.ts", () => {
    const result = () => results.get("src/typescript.ts") as Result;

    it("reports a value a type alias consumes", () => {
      const line =
        TYPESCRIPT_FIXTURE.split("\n").findIndex((row) =>
          row.startsWith("const width"),
        ) + 1;

      expect(result().oxlint.map(byRuleAndLine)).toContain(
        `@typescript-eslint/no-unused-vars:${line}`,
      );
    });
  });

  describe("javascript.js", () => {
    const result = () => results.get("src/javascript.js") as Result;

    it("reports the same rules as ESLint", () => {
      expect(rulesOf(result().oxlint)).toEqual(
        rulesOf(result().eslint).filter(
          (rule) => !IMPLEMENTATION_GAPS.includes(rule),
        ),
      );
    });

    it("leaves the TypeScript-only rules to TypeScript files", () => {
      expect(rulesOf([...result().oxlint, ...result().eslint])).not.toContain(
        "prefer-rest-params",
      );
    });
  });

  it("covers every perfectionist rule except the attribute ones", () => {
    const configured = [...getTestRules(loadBaseConfig()).keys()].filter(
      (rule) => rule.startsWith(PERFECTIONIST),
    );
    const covered = new Set(
      [...results.values()].flatMap(({ oxlint }) =>
        perfectionistFindings(oxlint).map(({ rule }) => rule),
      ),
    );

    expect(configured.filter((rule) => !covered.has(rule)).sort()).toEqual(
      UNCOVERED_PERFECTIONIST_RULES,
    );
  });
});
