import { beforeAll, describe, expect, it } from "vitest";

import {
  findOptionMismatches,
  findSeverityMatch,
  getEslintRules,
  getOxlintRuleNames,
  getSourceRules,
  getTestRules,
  KNOWN_GAPS,
  loadBaseConfig,
  type Rule,
  toEslintCandidates,
  toOxlintCandidates,
} from "./support.ts";

const config = loadBaseConfig();

const PARITY_CASES: {
  name: string;
  oxlintRules: Map<string, Rule>;
  sampleFile: string;
}[] = [
  {
    name: "source files",
    oxlintRules: getSourceRules(config),
    sampleFile: "src/example.ts",
  },
  {
    name: "test files",
    oxlintRules: getTestRules(config),
    sampleFile: "src/example.test.ts",
  },
];

describe.each(PARITY_CASES)("$name", ({ oxlintRules, sampleFile }) => {
  let eslintRules: Map<string, Rule>;

  beforeAll(async () => {
    eslintRules = await getEslintRules(sampleFile);
  });

  it("covers every rule enabled by @pagopa/eslint-config", () => {
    const uncovered = [...eslintRules]
      .filter(
        ([rule, { severity }]) =>
          !findSeverityMatch(oxlintRules, toOxlintCandidates(rule), severity),
      )
      .map(([rule]) => rule)
      .sort();

    expect(uncovered).toEqual(
      KNOWN_GAPS.filter((gap) => eslintRules.has(gap)).sort(),
    );
  });

  it("only enables rules that @pagopa/eslint-config enables", () => {
    const orphans = [...oxlintRules]
      .filter(
        ([rule, { severity }]) =>
          !findSeverityMatch(eslintRules, toEslintCandidates(rule), severity),
      )
      .map(([rule]) => rule)
      .sort();

    expect(orphans).toEqual([]);
  });

  it("configures rules with the options of @pagopa/eslint-config", () => {
    expect(findOptionMismatches(oxlintRules, eslintRules)).toEqual([]);
  });
});

describe("coverage", () => {
  it("enables at least 141 rules on test files", () => {
    expect(getTestRules(config).size).toBeGreaterThanOrEqual(141);
  });

  it("keeps no rule of KNOWN_GAPS implemented by oxlint", () => {
    const oxlintRuleNames = getOxlintRuleNames();
    const implemented = KNOWN_GAPS.filter((gap) =>
      toOxlintCandidates(gap).some((candidate) =>
        oxlintRuleNames.has(candidate),
      ),
    );

    expect(
      implemented,
      `oxlint now implements ${implemented.join(", ")}: remove it from KNOWN_GAPS and enable it in base.json`,
    ).toEqual([]);
  });

  it("does not enable a KNOWN_GAPS rule", () => {
    const enabled = new Set([
      ...getSourceRules(config).keys(),
      ...getTestRules(config).keys(),
    ]);

    expect(
      KNOWN_GAPS.filter((gap) => enabled.has(gap)),
      "KNOWN_GAPS rules cannot be enforced by oxlint",
    ).toEqual([]);
  });
});
