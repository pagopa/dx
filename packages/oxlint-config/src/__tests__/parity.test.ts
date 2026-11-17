import { beforeAll, describe, expect, it } from "vitest";

import {
  findOptionMismatches,
  findSeverityMatch,
  getEslintRules,
  getOxlintRuleNames,
  getScriptRules,
  getSourceRules,
  getTestRules,
  KNOWN_GAPS,
  loadBaseConfig,
  NURSERY_GAPS,
  type Rule,
  SCRIPT_SAMPLE_PATH,
  SOURCE_SAMPLE_PATH,
  TEST_SAMPLE_PATH,
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
    name: "script files",
    oxlintRules: getScriptRules(config),
    sampleFile: SCRIPT_SAMPLE_PATH,
  },
  {
    name: "source files",
    oxlintRules: getSourceRules(config),
    sampleFile: SOURCE_SAMPLE_PATH,
  },
  {
    name: "test files",
    oxlintRules: getTestRules(config),
    sampleFile: TEST_SAMPLE_PATH,
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
      [...KNOWN_GAPS, ...NURSERY_GAPS]
        .filter((gap) => eslintRules.has(gap))
        .sort(),
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

describe("option parity", () => {
  const rules = (entries: Record<string, Rule["options"]>): Map<string, Rule> =>
    new Map(
      Object.entries(entries).map(([rule, options]) => [
        rule,
        { options, severity: "error" },
      ]),
    );

  it("reports an option ESLint pins and oxlint omits", () => {
    const mismatches = findOptionMismatches(
      rules({ complexity: [] }),
      rules({ complexity: [1] }),
    );

    expect(mismatches).toEqual(["complexity: expected [1], got []"]);
  });

  it("reports an option oxlint pins and ESLint omits", () => {
    const mismatches = findOptionMismatches(
      rules({ complexity: [5] }),
      rules({ complexity: [] }),
    );

    expect(mismatches).toEqual(["complexity: expected [], got [5]"]);
  });

  it("reports an object key that only ESLint pins", () => {
    const mismatches = findOptionMismatches(
      rules({ "no-fallthrough": [{ allowEmptyCase: true }] }),
      rules({
        "no-fallthrough": [
          { allowEmptyCase: true, commentPattern: "fallthrough" },
        ],
      }),
    );

    expect(mismatches).toEqual([
      'no-fallthrough: expected [{"allowEmptyCase":true,"commentPattern":"fallthrough"}], got [{"allowEmptyCase":true}]',
    ]);
  });

  it("accepts the same effective options", () => {
    const mismatches = findOptionMismatches(
      rules({ eqeqeq: ["smart"], "no-empty": [], "no-fallthrough": [] }),
      rules({
        eqeqeq: ["smart"],
        "no-empty": [{ allowEmptyCatch: false }],
        "no-fallthrough": [
          { allowEmptyCase: false, reportUnusedFallthroughComment: false },
        ],
      }),
    );

    expect(mismatches).toEqual([]);
  });

  it("accepts an option documented as a divergence", () => {
    const mismatches = findOptionMismatches(
      rules({ radix: ["always"] }),
      rules({ radix: [] }),
    );

    expect(mismatches).toEqual([]);
  });

  it("accepts an option only oxlint declares", () => {
    const mismatches = findOptionMismatches(
      rules({
        "no-unused-vars": [
          { args: "after-used", reportVarsOnlyUsedAsTypes: true },
        ],
      }),
      rules({ "no-unused-vars": [{ args: "after-used" }] }),
    );

    expect(mismatches).toEqual([]);
  });
});

describe("coverage", () => {
  it("enables at least 141 rules on test files", () => {
    expect(getTestRules(config).size).toBeGreaterThanOrEqual(141);
  });

  it("enables at least 134 rules on script files", () => {
    expect(getScriptRules(config).size).toBeGreaterThanOrEqual(134);
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
      ...getScriptRules(config).keys(),
      ...getSourceRules(config).keys(),
      ...getTestRules(config).keys(),
    ]);

    expect(
      [...KNOWN_GAPS, ...NURSERY_GAPS].filter((gap) => enabled.has(gap)),
      "KNOWN_GAPS rules cannot be enforced by oxlint",
    ).toEqual([]);
  });
});
